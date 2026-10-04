"""
prepare_data.py
Menyiapkan data dashboard "Ketimpangan Gender Indonesia" dari GENDER.xlsx (sheet KAB)
dan geometri kab/kota. Hasil: data/dashboard_data.json, data/kab_gender.csv, data/kab.geojson

Jalankan dari akar repositori:
    python scripts/prepare_data.py

Berkas masukan: data/raw/GENDER.xlsx (sheet KAB) dan shapefile data/raw/Batas_Kabupaten.shp
(atau argumen --shp). Dependensi: pandas, numpy, scipy, scikit-learn>=1.3, umap-learn, geopandas,
shapely, mapclassify, openpyxl
"""
import argparse
import json
from pathlib import Path

import geopandas as gpd

import mapclassify as mc
import numpy as np
import pandas as pd
import umap
from scipy.cluster.hierarchy import leaves_list, linkage
from shapely.geometry import shape
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "raw" / "GENDER.xlsx"
ap = argparse.ArgumentParser()
ap.add_argument("--shp", default=str(ROOT / "data" / "raw" / "Batas_Kabupaten.shp"))
SHP = Path(ap.parse_args().shp)
OUT = ROOT / "data"
SEED = 42

# ---------------------------------------------------------------- data tabular
df = pd.read_excel(XLSX, sheet_name="KAB")
assert len(df) == 514 and df["Kabupaten"].is_unique and df["kdkab"].is_unique

# Validasi konsistensi kode wilayah
assert (df["kdkab"] // 100 == df["kdprov"]).all(), "kdkab tidak konsisten dengan kdprov"
# kdprov 91 dan 92 sengaja memuat >1 provinsi (kode kab/kota lama dipertahankan setelah pemekaran
# Papua 2022); selain itu, satu kdprov harus memetakan ke satu nama provinsi.
multi = df.groupby("kdprov")["Provinsi"].nunique()
assert set(multi[multi > 1].index) <= {91, 92}, "kdprov lain memuat >1 nama provinsi"
assert df.groupby("Provinsi")["kdprov"].nunique().max() == 1
assert df["Provinsi"].nunique() == 38

for v in ["RLS", "HLS", "TPT", "TPAK", "UHH"]:
    df[f"{v}_L-P"] = df[f"{v}_L"] - df[f"{v}_P"]

FEATURES = ["RLS_L-P", "RLS_LP", "HLS_L-P", "HLS_LP", "TPT_L-P", "TPT_LP",
            "TPAK_L-P", "TPAK_LP", "UHH_L-P", "UHH_LP"]  # sama dengan nb1.ipynb

# ---------------------------------------------------------------- PCA & UMAP
X = StandardScaler().fit_transform(df[FEATURES])
pca = PCA()
Z = pca.fit_transform(X)
ev = pca.explained_variance_ratio_
loadings = pca.components_.T[:, :5]
for i in range(5):
    df[f"PC{i+1}"] = Z[:, i]

emb = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2, random_state=SEED).fit_transform(X)
df["UMAP1"], df["UMAP2"] = emb[:, 0], emb[:, 1]

# jarak terstandar pada PC1-PC5 (PC tidak berkorelasi -> setara jarak Mahalanobis)
sd = Z[:, :5].std(axis=0, ddof=1)
df["dist_pc"] = np.sqrt(((Z[:, :5] / sd) ** 2).sum(axis=1))

# ---------------------------------------------------------------- heatmap terklaster
corr = df[FEATURES].corr()
order = leaves_list(linkage(corr.values, method="average", metric="euclidean")).tolist()
corr_order = [FEATURES[i] for i in order]

# ---------------------------------------------------------------- geometri (mengikuti nb2.ipynb)
# inner merge Kode_Kab == kdkab; titik pusat dihitung dari geometri asli (CRS geografis, seperti
# notebook); lalu simplify(tolerance=0,01, preserve_topology=True).
g = gpd.read_file(SHP)
g["Kode_Kab"] = g["Kode_Kab"].astype(str).str.strip()
df["_k"] = df["kdkab"].astype(str).str.strip()
gm = g.merge(df[["_k", "kdkab"]], left_on="Kode_Kab", right_on="_k", how="inner")
assert len(gm) == 514 and gm["kdkab"].is_unique, "penggabungan geometri tidak menghasilkan 514 unit unik"
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore", UserWarning)  # peringatan CRS geografis yang sama dengan notebook
    cen = gm.geometry.centroid
gm["lon"], gm["lat"] = cen.x.values, cen.y.values
gm["geometry"] = gm.geometry.simplify(tolerance=0.01, preserve_topology=True)
df = df.merge(gm[["kdkab", "lon", "lat"]], on="kdkab", how="left")
assert df[["lon", "lat"]].notna().all().all()


def rnd(c, nd=3):
    return [rnd(x, nd) for x in c] if isinstance(c[0], list) else [round(c[0], nd), round(c[1], nd)]


feats = []
for r in gm.itertuples():
    geom = json.loads(gpd.GeoSeries([r.geometry]).to_json())["features"][0]["geometry"]
    geom["coordinates"] = rnd(geom["coordinates"])
    feats.append({"type": "Feature", "properties": {"kdkab": int(r.kdkab)}, "geometry": geom})
(OUT / "kab.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))

# ---------------------------------------------------------------- Moran's I (k-NN, k=8)
def morans_i(vals, lon_, lat_, k=8, nperm=999, seed=SEED):
    n = len(vals)
    xy = np.c_[lon_ * np.cos(np.radians(lat_)), lat_]
    d = np.linalg.norm(xy[:, None] - xy[None], axis=2)
    np.fill_diagonal(d, np.inf)
    nn = np.argsort(d, axis=1)[:, :k]
    W = np.zeros((n, n))
    W[np.arange(n)[:, None], nn] = 1.0 / k

    def stat(v):
        z = v - v.mean()
        return (z @ W @ z) / (z @ z)

    obs = stat(vals)
    rng = np.random.default_rng(seed)
    sims = np.array([stat(rng.permutation(vals)) for _ in range(nperm)])
    p = (1 + (sims >= obs).sum()) / (nperm + 1)
    return float(obs), float(p)


mi, mp = morans_i(df["IKG"].to_numpy(), df["lon"].to_numpy(), df["lat"].to_numpy())

# ---------------------------------------------------------------- klasifikasi choropleth
breaks = {}
for var in ["IKG", "IPG"]:
    v = df[var].to_numpy()
    breaks[var] = {
        "quantile": [float(x) for x in mc.Quantiles(v, k=5).bins],
        "equal": [float(x) for x in mc.EqualInterval(v, k=5).bins],
        "natural": [float(x) for x in mc.FisherJenks(v, k=5).bins],
    }

# ---------------------------------------------------------------- ringkasan (dipakai teks temuan)
w = df["Penduduk"]
wmean = lambda s, g=None: float(np.average(s, weights=w.loc[s.index]))
by_reg = df.groupby("Wilayah").apply(
    lambda g: pd.Series({
        "n": len(g), "ikg": g.IKG.mean(), "ipg": g.IPG.mean(),
        "tpak_gap": g["TPAK_L-P"].mean(), "rls_gap": g["RLS_L-P"].mean()}),
    include_groups=False).round(4)
by_prov = df.groupby("Provinsi").apply(
    lambda g: pd.Series({"n": len(g), "ikg_w": np.average(g.IKG, weights=g.Penduduk)}),
    include_groups=False).sort_values("ikg_w")
cc = corr.where(np.triu(np.ones(corr.shape), 1).astype(bool)).stack().sort_values(key=np.abs, ascending=False)
out_idx = df.sort_values("dist_pc", ascending=False).head(5)

# ---------------------------------------------------------------- statistik interpretasi PC dan UMAP
from scipy.stats import spearmanr
from sklearn.cluster import HDBSCAN
from sklearn.manifold import trustworthiness
from sklearn.neighbors import NearestNeighbors

PCN = [f"PC{i+1}" for i in range(5)]
pc_reg = df.groupby("Wilayah")[PCN].mean().round(3)
pc_ikg = {p: float(spearmanr(df[p], df["IKG"])[0]) for p in PCN}
pc_ipg = {p: float(spearmanr(df[p], df["IPG"])[0]) for p in PCN}

wil = np.asarray(df["Wilayah"].astype(str).tolist())
def purity(M, k=10):
    idx = NearestNeighbors(n_neighbors=k + 1).fit(M).kneighbors(M, return_distance=False)[:, 1:]
    return float((wil[idx] == wil[:, None]).mean())

Eu = df[["UMAP1", "UMAP2"]].to_numpy()
idx_u = NearestNeighbors(n_neighbors=11).fit(Eu).kneighbors(Eu, return_distance=False)[:, 1:]
ikg_v = df["IKG"].to_numpy()
df["umap_grp"] = HDBSCAN(min_cluster_size=15).fit_predict(Eu)
grp = []
for c in sorted(set(df["umap_grp"]) - {-1}):
    q = df[df["umap_grp"] == c]
    top = q["Wilayah"].value_counts(normalize=True)
    grp.append({"id": int(c), "n": int(len(q)), "ikg": float(q.IKG.mean()), "ipg": float(q.IPG.mean()),
                "tpak_lp": float(q.TPAK_LP.mean()), "tpak_gap": float(q["TPAK_L-P"].mean()),
                "rls_lp": float(q.RLS_LP.mean()), "tpt_lp": float(q.TPT_LP.mean()), "uhh_lp": float(q.UHH_LP.mean()),
                "top_reg": top.index[0], "top_share": float(top.iloc[0]),
                "cx": float(q.UMAP1.median()), "cy": float(q.UMAP2.median())})
grp.sort(key=lambda g_: -g_["ikg"])
for k_, g_ in enumerate(grp): g_["label"] = f"G{k_+1}"
lab_map = {g_["id"]: g_["label"] for g_ in grp}
df["umap_grp"] = df["umap_grp"].map(lambda v: lab_map.get(v, ""))

umap_stats = {
    "trust_umap": float(trustworthiness(X, Eu, n_neighbors=15)),
    "trust_pca2": float(trustworthiness(X, Z[:, :2], n_neighbors=15)),
    "purity_umap": purity(Eu), "purity_orig": purity(X), "purity_base": float((df["Wilayah"].value_counts(normalize=True) ** 2).sum()),
    "ikg_nn_gap": float(np.abs(ikg_v - ikg_v[idx_u].mean(1)).mean()), "ikg_sd": float(ikg_v.std()),
    "rho_u1": {f: float(spearmanr(Eu[:, 0], df[f])[0]) for f in FEATURES},
    "rho_u2": {f: float(spearmanr(Eu[:, 1], df[f])[0]) for f in FEATURES},
    "rho_u1_ikg": float(spearmanr(Eu[:, 0], ikg_v)[0]), "rho_u2_ikg": float(spearmanr(Eu[:, 1], ikg_v)[0]),
    "groups": grp, "n_noise": int((df["umap_grp"] == "").sum()),
}

# penjaga tafsir: teks interpretasi PC pada dashboard ditulis terhadap tanda dan variabel dominan berikut.
L_ = pd.DataFrame(pca.components_.T[:, :5], index=FEATURES, columns=PCN)
exp = {"PC1": ("RLS_LP", +1), "PC2": ("TPAK_L-P", +1), "PC3": ("HLS_L-P", +1), "PC4": ("UHH_L-P", +1), "PC5": ("TPT_L-P", +1)}
for p_, (f_, sg) in exp.items():
    assert L_[p_].abs().idxmax() == f_ and np.sign(L_.loc[f_, p_]) == sg, f"tafsir {p_} perlu ditinjau ulang"

stats = {
    "n": int(len(df)), "n_prov": int(df.Provinsi.nunique()),
    "ikg_mean": float(df.IKG.mean()), "ikg_wmean": wmean(df.IKG), "ikg_median": float(df.IKG.median()),
    "ipg_mean": float(df.IPG.mean()), "ipg_wmean": wmean(df.IPG),
    "tpak_gap_mean": float(df["TPAK_L-P"].mean()),
    "n_tpak_p_gt_l": int((df.TPAK_P > df.TPAK_L).sum()),
    "rls_gap_mean": float(df["RLS_L-P"].mean()),
    "n_rls_p_gt_l": int((df.RLS_P > df.RLS_L).sum()),
    "n_hls_p_gt_l": int((df.HLS_P > df.HLS_L).sum()),
    "pop_share_ikg_ge_05": float(df.loc[df.IKG >= 0.5, "Penduduk"].sum() / w.sum()),
    "n_ikg_ge_05": int((df.IKG >= 0.5).sum()),
    "morans_i": mi, "morans_p": mp, "morans_k": 8, "morans_perm": 999,
    "ev": [float(x) for x in ev], "cum_ev": [float(x) for x in np.cumsum(ev)],
    "by_region": by_reg.reset_index().to_dict("records"),
    "prov_low": by_prov.head(3).reset_index().to_dict("records"),
    "prov_high": by_prov.tail(3).reset_index().to_dict("records"),
    "corr_top": [{"a": a, "b": b, "r": float(r)} for (a, b), r in cc.head(4).items()],
    "outliers": [{"name": r.Kabupaten, "prov": r.Provinsi, "d": float(r.dist_pc)} for r in out_idx.itertuples()],
    "provinces": sorted(df.Provinsi.unique().tolist()),
    "pc_region": pc_reg.reset_index().to_dict("records"), "pc_ikg": pc_ikg, "pc_ipg": pc_ipg, "umap": umap_stats,
}

# ---------------------------------------------------------------- tulis keluaran
cols = ["kdkab", "Kabupaten", "Provinsi", "kdprov", "Wilayah",
        "RLS_L", "RLS_P", "RLS_LP", "HLS_L", "HLS_P", "HLS_LP", "IPM_L", "IPM_P", "IPM_LP",
        "TPT_L", "TPT_P", "TPT_LP", "UHH_L", "UHH_P", "UHH_LP", "TPAK_L", "TPAK_P", "TPAK_LP",
        "IKG", "IPG", "PDRB", "Penduduk", *[f"{v}_L-P" for v in ["RLS", "HLS", "TPT", "TPAK", "UHH"]],
        "PC1", "PC2", "PC3", "PC4", "PC5", "UMAP1", "UMAP2", "umap_grp", "dist_pc", "lon", "lat"]
df[cols].round(5).to_csv(OUT / "kab_gender.csv", index=False)

payload = {
    "cols": cols,
    "rows": [[(None if (isinstance(x, float) and np.isnan(x)) else x) for x in r]
             for r in df[cols].round(5).astype(object).values.tolist()],
    "features": FEATURES,
    "corr": corr.round(4).to_dict(),
    "corr_order": corr_order,
    "loadings": {FEATURES[i]: [round(float(x), 4) for x in loadings[i]] for i in range(len(FEATURES))},
    "breaks": breaks,
    "stats": stats,
}
(OUT / "dashboard_data.json").write_text(json.dumps(payload, separators=(",", ":"), default=float))
print("OK", {k: stats[k] for k in ["n", "n_prov", "morans_i", "morans_p"]})
