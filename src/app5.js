
/* ============================================================================
 * MULTIVARIAT
 * ========================================================================== */
const S = { regions: new Set(), brush: null, pc: null, parRanges: {} };
const UI = { proj: 'umap', colorBy: 'region', mode: isTouch ? 'view' : 'select', viewB: 'load', viewC: 'corr', pc: 0 };
const DRAG = { select: 'lasso', zoom: 'zoom', view: false };
const NORM = {}; PCF.forEach(f => { const v = stat(f); NORM[f] = [Math.min(...v), Math.max(...v)]; });
const normv = (r, f) => (r[f] - NORM[f][0]) / (NORM[f][1] - NORM[f][0]);
const REGIDX = R.map(r => REGIONS.indexOf(r.Wilayah));
let MASK = null; const quiet = { on: false };
const hush = ms => { quiet.on = true; setTimeout(() => { quiet.on = false; }, ms || 600); };
function combined() {
  if (!S.regions.size && !S.brush && !S.pc) return null;
  const m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = (!S.regions.size || S.regions.has(R[i].Wilayah)) && (!S.brush || S.brush.has(i)) && (!S.pc || S.pc.has(i)) ? 1 : 0;
  return m;
}
const selIdx = m => m ? R.filter(r => m[r.i]).map(r => r.i) : null;
const ALLIDX = R.map(r => r.i);
function mvScopeTags() {
  const idx = selIdx(MASK), t = [];
  if (S.regions.size) t.push(Array.from(S.regions).map(pretty).join(' + '));
  if (S.brush || S.pc) t.push('area/rentang');
  t.push(idx ? idx.length + ' dari ' + N : 'semua ' + N); return t.map(esc);
}
const mvLabel = () => { const idx = selIdx(MASK); if (!idx) return 'Seluruh kab/kota'; return S.regions.size && !S.brush && !S.pc ? Array.from(S.regions).map(pretty).join(' + ') : idx.length + ' kab/kota terpilih'; };

/* ---------- chips wilayah (bersama) ---------- */
function renderChips() {
  $$('.chips[data-chips="regions"]').forEach(box => { if (!box.children.length) REGIONS.forEach(r => box.appendChild(regionChip(r, true))); $$('.chip', box).forEach(c => c.setAttribute('aria-pressed', S.regions.has(c.dataset.r))); });
}
document.addEventListener('click', e => {
  const c = e.target.closest('.chips[data-chips="regions"] .chip'); if (!c) return;
  const r = c.dataset.r; S.regions.has(r) ? S.regions.delete(r) : S.regions.add(r); mvChanged(true);
  setRegion(S.regions.size === 1 ? Array.from(S.regions)[0] : '', 'mv');
});
function mvDirty(except) { [0, 1, 2, 3].forEach(k => { if (k !== except) HOOKS[pageId('multivariat', k)].dirty = true; }); }
function mvChanged() {
  MASK = combined(); renderChips(); mvDirty(-1);
  if (NAV.tab !== 'multivariat') return;
  if (NAV.idx === 0 && UI.proj !== 'scree' && gd('plotProj').data) { HOOKS['multivariat-0'].dirty = false; hush(); Plotly.restyle(gd('plotProj'), { selectedpoints: [selIdx(MASK)] }, [0]); renderInsight(gd('insMV0'), insightMV0()); }
  else HOOKS[pageId('multivariat', NAV.idx)].show();
}
ACT.mReset = () => { S.regions.clear(); S.brush = null; S.pc = null; S.parRanges = {}; setRegion('', 'mv'); MASK = null; renderChips(); mvDirty(-1); HOOKS[pageId('multivariat', 0)].dirty = true; if (NAV.tab === 'multivariat') HOOKS[pageId('multivariat', NAV.idx)].show(); };
regCtrl('mProj', () => UI.proj, v => { UI.proj = v; HOOKS['multivariat-0'].dirty = true; HOOKS['multivariat-0'].show(); });
regCtrl('mColor', () => UI.colorBy, v => { UI.colorBy = v; HOOKS['multivariat-0'].dirty = true; HOOKS['multivariat-0'].show(); });
regCtrl('mMode', () => UI.mode, v => { UI.mode = v; ['plotProj', 'plotSplom'].forEach(id => { const el = gd(id); if (el && el.data) Plotly.relayout(el, { dragmode: DRAG[v] }); }); syncCtrl('mTouch'); parTouch(); });
function parTouch() { const el = gd('plotPar'); if (el) el.style.pointerEvents = UI.mode === 'view' && isTouch ? 'none' : 'auto'; }
regCtrl('mViewB', () => UI.viewB, v => { UI.viewB = v; HOOKS['multivariat-1'].dirty = true; HOOKS['multivariat-1'].show(); });
regCtrl('mViewC', () => UI.viewC, v => { UI.viewC = v; HOOKS['multivariat-3'].dirty = true; HOOKS['multivariat-3'].show(); });
regCtrl('mPC', () => UI.pc, v => { UI.pc = +v; HOOKS['multivariat-1'].dirty = true; HOOKS['multivariat-1'].show(); });
regCtrl('mTouch', () => UI.mode, v => { UI.mode = v; syncCtrl('mMode'); parTouch(); });

/* ---------- MV0: proyeksi ---------- */
const projCoords = () => UI.proj === 'pca' ? [stat('PC1'), stat('PC2')] : [stat('UMAP1'), stat('UMAP2')];
function bindSelect(id, key) {
  const el = gd(id); if (el._sel) return; el._sel = true;
  el.on('plotly_selected', ev => { if (quiet.on || !ev || !ev.points) return; const set = new Set(ev.points.map(p => p[key] !== undefined ? p[key] : p.pointNumber)); S.brush = set.size ? set : null; mvChanged(); });
  el.on('plotly_deselect', () => { if (quiet.on) return; S.brush = null; mvChanged(); });
}
function drawProj() {
  hush();
  const [x, y] = projCoords(), cb = UI.colorBy, byVal = cb !== 'region', cp = compact();
  const marker = { size: cp ? 7 : 9, symbol: R.map(r => RSYM[r.Wilayah]), line: { width: .8, color: '#fff' }, color: byVal ? stat(cb.toUpperCase()) : R.map(r => RCOL[r.Wilayah]) };
  if (byVal) { const V = cb.toUpperCase(); Object.assign(marker, { colorscale: plScale(STOPS[V]), cmin: VMIN[V], cmax: VMAX[V], showscale: true, colorbar: { orientation: 'h', thickness: 8, lenmode: 'pixels', len: cp ? 170 : 240, x: .5, xanchor: 'center', y: 0, yref: 'container', yanchor: 'bottom', ypad: 4, title: { text: V + '<br> ', side: 'top', font: { size: 11 } }, tickfont: { size: 10 }, outlinewidth: 0 } }); }
  const tr = { type: 'scatter', mode: 'markers', x, y, text: R.map(r => r.Kabupaten), customdata: R.map(r => [r.prov, r.wil, r.IKG, r.IPG, r.umap_grp ? ' | ' + r.umap_grp : '']),
    hovertemplate: '<b>%{text}</b><br>%{customdata[0]} (%{customdata[1]})<br>IKG %{customdata[2]:.3f}, IPG %{customdata[3]:.2f}' + (UI.proj === 'umap' ? '%{customdata[4]}' : '') + '<extra></extra>',
    marker, selectedpoints: selIdx(MASK), selected: { marker: { opacity: 1 } }, unselected: { marker: { opacity: .13 } } };
  const data = [tr];
  if (FOCUS.kab !== null) data.push({ type: 'scatter', mode: 'markers+text', x: [x[FOCUS.kab]], y: [y[FOCUS.kab]], text: [R[FOCUS.kab].Kabupaten], textposition: 'top center', textfont: { size: 11, color: INK }, hoverinfo: 'skip', marker: { size: 18, color: 'rgba(0,0,0,0)', line: { width: 2.6, color: INK } } });
  const ann = cp ? [] : (UI.proj === 'umap' ? ST.umap.groups.map(g => ({ x: g.cx, y: g.cy, text: '<b>' + g.label + '</b>', showarrow: false, font: { size: 12, color: INK }, bgcolor: 'rgba(255,255,255,.88)', bordercolor: INK, borderwidth: 1, borderpad: 2 }))
    : ST.outliers.slice(0, 5).map(o => { const i = R.find(r => r.Kabupaten === o.name).i; return { x: x[i], y: y[i], text: o.name, showarrow: false, yshift: 12, font: { size: 10, color: INK }, bgcolor: 'rgba(255,255,255,.75)' }; }));
  const xl = UI.proj === 'pca' ? 'PC1 (' + pct(ST.ev[0]) + '% varians)' : 'UMAP 1', yl = UI.proj === 'pca' ? 'PC2 (' + pct(ST.ev[1]) + '% varians)' : 'UMAP 2';
  draw('plotProj', data, baseLayout({ xaxis: axisStyle({ title: { text: xl, font: { size: 11.5 } } }), yaxis: axisStyle({ title: { text: yl, font: { size: 11.5 } } }), dragmode: DRAG[UI.mode], clickmode: 'event', annotations: ann, margin: { l: 50, r: 10, t: 8, b: byVal ? (cp ? 84 : 98) : 42 } }));
  bindSelect('plotProj', 'pointIndex');
  const el = gd('plotProj'); if (!el._ck) { el._ck = true; el.on('plotly_click', ev => { const p = ev.points && ev.points[0]; if (p && p.curveNumber === 0) setKab(p.pointIndex, 'mv'); }); }
}
function drawScree() {
  const k = ST.ev.map((_, i) => 'PC' + (i + 1));
  const bars = { type: 'bar', x: k, y: ST.ev.map(v => v * 100), marker: { color: '#F4898A', line: { color: INK, width: 1 } }, text: ST.ev.map(v => nf(v * 100, 1)), textposition: 'outside', textfont: { size: 10 }, cliponaxis: false, hovertemplate: '%{x}: %{y:.2f}%<extra></extra>' };
  const line = { type: 'scatter', mode: 'lines+markers', x: k, y: ST.cum_ev.map(v => v * 100), line: { color: BLUE, width: 2 }, marker: { color: BLUE, size: 6 }, hovertemplate: 'Kumulatif s.d. %{x}: %{y:.1f}%<extra></extra>' };
  draw('plotScree', [bars, line], baseLayout({ xaxis: axisStyle({ title: { text: 'Komponen utama', font: { size: 11.5 } } }), yaxis: axisStyle({ title: { text: 'Varians dijelaskan (%)', font: { size: 11.5 } }, range: [0, 110] }),
    shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 80, y1: 80, line: { color: MUTED, dash: 'dash', width: 1.2 } }], annotations: [{ xref: 'paper', x: .01, y: 80, yshift: 9, text: 'ambang 80%', showarrow: false, xanchor: 'left', font: { size: 10, color: MUTED } }], margin: { l: 50, r: 10, t: 14, b: 44 } }));
}
const POSNEG = (pc, min) => { const e = Object.entries(D.loadings).map(([f, v]) => [f, v[pc]]), fm = ([f, v]) => LAB[f];
  return [e.filter(x => x[1] >= min).sort((a, b) => b[1] - a[1]).slice(0, 3).map(fm).join(', ') || '-', e.filter(x => x[1] <= -min).sort((a, b) => a[1] - b[1]).slice(0, 3).map(fm).join(', ') || '-']; };
function insightMV0() {
  const idx = selIdx(MASK), has = !!idx, sub = subsetStats(has ? idx : ALLIDX), scope = mvScopeTags(), items = [], cta = [{ label: 'Bobot komponen \u2192', main: true, fn: () => go('multivariat', 1, true) }];
  if (UI.proj === 'scree') {
    const c = ST.cum_ev, k80 = c.findIndex(v => v >= .8) + 1;
    return { scope: ['Scree plot'], big: { v: pct(c[k80 - 1]) + '%', k: 'varians pada ' + k80 + ' komponen utama' }, head: k80 + ' komponen utama sudah memuat lebih dari 80% varians; dua komponen pertama hanya ' + pct(c[1]) + '%.', cta,
      items: [['fakta', 'PC1 paling dominan; setelah PC5 tambahan varians per komponen kecil.'], ['inferensi', 'Dimensi efektif data ini sekitar ' + k80 + ', bukan 2: proyeksi dua dimensi memuat kurang dari separuh informasi, sehingga jarak pada diagram sebar hanya indikatif.'], ['catatan', 'Komponen ke-3 sampai ke-5 lebih peka terhadap pencilan.', true]] };
  }
  if (UI.proj === 'umap') {
    const U = ST.umap, G_ = U.groups; let head;
    if (has) { const cnt = {}; idx.forEach(i => { const g = R[i].umap_grp || 'tanpa kelompok'; cnt[g] = (cnt[g] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]); const gi = G_.find(g => g.label === top[0][0]);
      head = 'Pilihan ini terutama berada di ' + (gi ? 'kelompok ' + gi.label + (gi.ikg >= NAT.IKG.m ? ' (IKG di atas rata-rata nasional)' : ' (IKG di bawah rata-rata nasional)') : 'luar kelompok padat') + '.';
      items.push(['fakta', 'Sebaran pilihan menurut kelompok: ' + top.slice(0, 4).map(t => t[0] + ' ' + t[1]).join(', ') + '.']); }
    else head = 'UMAP menemukan ' + G_.length + ' kelompok padat; G1 ber-IKG tertinggi dan G' + G_.length + ' terendah, sedangkan sekitar sepertiga daerah berada di antara kelompok.';
    items.push(['fakta', 'UMAP lebih setia mempertahankan tetangga terdekat daripada PCA dua dimensi, tetapi kurang dari separuh tetangga terdekat berasal dari wilayah yang sama.'], ['inferensi', 'Wilayah saja tidak menjelaskan profil: banyak daerah punya tetangga profil dari wilayah lain.', true], ['catatan', 'Sumbu UMAP tidak bermakna sendiri; jarak antarkelompok dan ukuran kelompok tidak boleh ditafsirkan sebagai besar perbedaan (Chari dan Pachter, 2023).']);
    return { scope: scope.concat(['UMAP']), big: has ? { v: nf(sub.ikg, 3), k: 'IKG rata-rata pilihan<br>nasional ' + nf(NAT.IKG.m, 3), tone: 'ikg' } : { v: nf(U.trust_umap, 2), k: 'trustworthiness UMAP<br>PCA 2D: ' + nf(U.trust_pca2, 2) }, head, items, cta };
  }
  const [p1, n1] = POSNEG(0, .3), [p2, n2] = POSNEG(1, .3);
  const z1 = sub.pc[0] / NAT.PC1.s, z2 = sub.pc[1] / NAT.PC2.s, side = z => z < -.3 ? 'rendah' : z > .3 ? 'tinggi' : 'tengah';
  const regPC1 = ST.pc_region.slice().sort((a, b) => a.PC1 - b.PC1)[0], head = has ? sub.n + ' kab/kota terpilih berada di sisi ' + side(z1) + ' PC1 dan ' + side(z2) + ' PC2.' : pretty(regPC1.Wilayah) + ' berada paling jauh di sisi rendah PC1; dua sumbu ini memuat ' + pct(ST.cum_ev[1]) + '% varians.';
  items.push(['fakta', 'Sumbu x (PC1): ' + p1 + ' lawan ' + n1 + '. Sumbu y (PC2): ' + p2 + ' lawan ' + n2 + '.', !has]);
  if (has) {
    items.push(['fakta', 'Dibanding nasional: ' + sub.dev.slice(0, 3).map(fmtDev).join(', ') + '.']);
    items.push(['inferensi', 'PC2 paling terkait dengan IKG, tetapi TPAK ikut menyusun IKG sehingga sebagian kaitannya adalah konstruksi indeks.']);
  } else items.push(['inferensi', 'PC2 paling terkait dengan IKG dan PC1 dengan IPG, tetapi keduanya hanya menangkap sebagian ketimpangan.']);
  items.push(['catatan', 'PCA linear dan peka pencilan; label menandai lima kab/kota berjarak terstandar terbesar.', true]);
  return { scope: scope.concat(['PCA']), big: has ? { v: nf(sub.ikg, 3), k: 'IKG rata-rata pilihan<br>nasional ' + nf(NAT.IKG.m, 3) + ' \u00B7 IPG ' + nf(sub.ipg, 1), tone: 'ikg' } : { v: pct(ST.cum_ev[1]) + '%', k: 'varians termuat pada PC1 dan PC2' }, head, items, cta };
}

/* ---------- MV1: koordinat paralel (garis terpilih di depan) ---------- */
function drawPar() {
  const sel = MASK, order = R.map(r => r.i); if (sel) order.sort((a, b) => sel[a] - sel[b]); // terpilih terakhir, digambar paling depan
  const colors = [GREY_OFF].concat(REGIONS.map(r => RCOL[r])), cs = []; colors.forEach((c, i) => { cs.push([i / 7, c], [(i + 1) / 7, c]); }); // abu-abu bernilai terendah, wilayah terpilih lebih tinggi
  const dims = PCF.map((f, k) => { const d = { label: LAB[f], values: order.map(i => R[i][f]) }; if (S.parRanges[k]) d.constraintrange = S.parRanges[k]; return d; });
  const tr = { type: 'parcoords', line: { color: order.map(i => (sel && !sel[i]) ? .5 : REGIDX[i] + 1.5), colorscale: cs, cmin: 0, cmax: 7, showscale: false }, dimensions: dims, unselected: { line: { color: GREY_OFF, opacity: .15 } },
    labelangle: compact() ? -45 : -18, labelside: 'top', labelfont: { size: compact() ? 9.5 : 12, family: FF }, tickfont: { size: 9.5, family: FF }, rangefont: { size: 9.5, family: FF } };
  draw('plotPar', [tr], baseLayout({ margin: { l: 36, r: 30, t: compact() ? 66 : 74, b: 16 } }));
  const el = gd('plotPar');
  if (!el._pb) { el._pb = true;
    el.on('plotly_restyle', ev => { if (!ev || !ev[0]) return; let touched = false;
      Object.keys(ev[0]).forEach(key => { const m = key.match(/^dimensions\[(\d+)\]\.constraintrange$/); if (!m) return; touched = true; let v = ev[0][key]; v = Array.isArray(v) ? v[0] : v; if (!v || !v.length) delete S.parRanges[+m[1]]; else S.parRanges[+m[1]] = (typeof v[0] === 'number') ? [v] : v; });
      if (!touched) return; const keys = Object.keys(S.parRanges);
      S.pc = keys.length ? new Set(R.filter(r => keys.every(k => S.parRanges[k].some(([lo, hi]) => r[PCF[k]] >= lo && r[PCF[k]] <= hi))).map(r => r.i)) : null;
      MASK = combined(); renderChips(); mvDirty(2); HOOKS['multivariat-2'].dirty = false; renderInsight(gd('insMV2'), insightMVPar()); }); }
  parTouch();
}
function insightMVPar() {
  const idx = selIdx(MASK), has = !!idx, scope = mvScopeTags(), items = [], cta = [{ label: 'Keterkaitan antarvariabel \u2192', main: true, fn: () => go('multivariat', 3, true) }];
  if (!has) {
    const top = ST.corr_top[0], out = ST.outliers[0];
    const spread = PCF.map(f => ({ f, s: sd(stat(f)) / (NORM[f][1] - NORM[f][0]) })).sort((a, b) => b.s - a.s).slice(0, 3);
    return { scope, big: { v: nf(top.r, 2), k: 'korelasi terkuat<br>' + LAB[top.a] + ' dan ' + LAB[top.b] }, head: 'Antar kab/kota, ragam relatif terbesar ada pada ' + spread.map(d => LAB[d.f]).join(', ') + '; hubungan terkuat ada antara ' + LAB[top.a] + ' dan ' + LAB[top.b] + '.', cta,
      items: [['fakta', 'Pencilan terjauh adalah ' + esc(out.name) + '; sebagian besar pencilan berada di provinsi Papua.'], ['inferensi', 'Variabel total berkorelasi satu sama lain dan dengan selisih indikatornya karena angka dasarnya sama, jadi garis yang tampak sejajar tidak selalu berarti fenomena terpisah.']] };
  }
  const rest = ALLIDX.filter(i => !MASK[i]), sub = subsetStats(idx), rr = rest.length ? subsetStats(rest) : null;
  if (!rr) return { scope, head: 'Pilihan mencakup seluruh kab/kota; tidak ada pembanding.', items: [], cta };
  const diff = PCF.map(f => ({ f, z: (sub.dev.find(d => d.f === f).v - rr.dev.find(d => d.f === f).v) / NAT[f].s })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const t3 = diff.slice(0, 3), dir = d => LAB[d.f] + ' ' + (d.z < 0 ? 'lebih rendah' : 'lebih tinggi');
  const head = mvLabel() + ' (' + sub.n + ') berbeda paling jelas dari sisanya pada ' + t3.map(d => LAB[d.f]).join(', ') + '.';
  items.push(['fakta', t3.map(dir).join(', ') + ' dibanding sisanya.']);
  items.push(['fakta', 'IKG pilihan ' + (sub.ikg > rr.ikg ? 'lebih tinggi' : 'lebih rendah') + ' dan IPG ' + (sub.ipg > rr.ipg ? 'lebih tinggi' : 'lebih rendah') + ' daripada sisanya.']);
  const spread = PCF.map(f => ({ f, a: sd(idx.map(i => R[i][f])), b: sd(rest.map(i => R[i][f])) })).filter(s => s.b > 0).sort((x, y) => (y.a / y.b) - (x.a / x.b))[0];
  if (idx.length >= 5) items.push(['inferensi', 'Kelompok ini paling beragam pada ' + LAB[spread.f] + ': rata-rata kelompok menutupi perbedaan antardaerah di dalamnya.']);
  items.push(['inferensi', 'Perbedaan IKG sejalan dengan perbedaan profil di atas, tetapi data lintas wilayah tidak membuktikan arah sebab-akibat.', true]);
  return { scope, big: { v: String(sub.n), k: 'kab/kota terpilih dari ' + N + '<br>IKG ' + nf(sub.ikg, 3) + ' vs ' + nf(rr.ikg, 3) + ' sisanya', tone: 'ikg' }, head, items, cta };
}

/* ---------- MV2: keterkaitan ---------- */
function corrMat(idx) { const cols = PCF.map(f => idx.map(i => R[i][f])); const M = {}; PCF.forEach((a, x) => { M[a] = {}; PCF.forEach((b, y) => { M[a][b] = x === y ? 1 : pearson(cols[x], cols[y]); }); }); return M; }
function corrView() { const idx = selIdx(MASK); return idx && idx.length >= 12 ? { M: corrMat(idx), n: idx.length, sub: true } : { M: D.corr, n: N, sub: false, tooSmall: !!idx }; }
function drawHeat() {
  const cv = corrView(), o = D.corr_order, z = o.map(a => o.map(b => cv.M[b][a])), lab = o.map(f => LAB[f]), cp = compact();
  draw('plotHeat', [{ type: 'heatmap', x: lab, y: lab, z, zmin: -1, zmax: 1, colorscale: DIV_SCALE, xgap: 1, ygap: 1, text: z.map(r => r.map(v => nf(v, 2))), texttemplate: cp ? '' : '%{text}', textfont: { size: 10 }, hovertemplate: '%{y} dan %{x}<br>r = %{z:.2f}<extra></extra>', colorbar: { thickness: 9, len: .8, tickfont: { size: 10 }, outlinewidth: 0, title: { text: 'r', side: 'top' } } }],
    baseLayout({ xaxis: axisStyle({ tickangle: -40, showgrid: false, tickfont: { size: cp ? 8.5 : 10 } }), yaxis: axisStyle({ autorange: 'reversed', showgrid: false, tickfont: { size: cp ? 8.5 : 10 } }), margin: { l: cp ? 66 : 84, r: 8, t: 6, b: cp ? 70 : 84 }, dragmode: false }));
}
function drawLoad() {
  const pcs = [0, 1, 2, 3, 4], z = PCF.map(k => D.loadings[k]), cp = compact();
  draw('plotLoad', [{ type: 'heatmap', x: pcs.map(i => 'PC' + (i + 1) + ' (' + pct(ST.ev[i], 0) + '%)'), y: PCF.map(k => LAB[k]), z, zmin: -.85, zmax: .85, colorscale: DIV_SCALE, xgap: 1, ygap: 1, text: z.map(r => r.map(v => nf(v, 2))), hovertemplate: '%{y} pada %{x}<br>loading %{z:.3f}<extra></extra>', colorbar: { thickness: 9, len: .85, tickfont: { size: 10 }, outlinewidth: 0, title: { text: 'loading', side: 'top', font: { size: 11 } } } }],
    baseLayout({ xaxis: axisStyle({ side: 'top', showgrid: false, tickfont: { size: cp ? 9 : 10.5 } }), yaxis: axisStyle({ autorange: 'reversed', showgrid: false, tickfont: { size: cp ? 9 : 10.5 } }), margin: { l: cp ? 70 : 90, r: 8, t: 40, b: 8 }, dragmode: false,
      shapes: [{ type: 'rect', xref: 'x', yref: 'paper', x0: UI.pc - .5, x1: UI.pc + .5, y0: 0, y1: 1, line: { color: INK, width: 3 } }] }));
}
function drawSplom() {
  hush(); const dims = [1, 2, 3, 4, 5].map(k => ({ label: 'PC' + k, values: stat('PC' + k) })), ax = { gridcolor: GRID, zerolinecolor: LINE, linecolor: LINE, tickfont: { size: 8.5 } };
  draw('plotSplom', [{ type: 'splom', dimensions: dims, text: R.map(r => r.Kabupaten + ' (' + r.prov + ')'), marker: { color: R.map(r => RCOL[r.Wilayah]), symbol: R.map(r => RSYM[r.Wilayah]), size: compact() ? 4 : 5, line: { width: .4, color: '#fff' } }, diagonal: { visible: false }, showupperhalf: false, hovertemplate: '%{text}<extra></extra>', selectedpoints: selIdx(MASK), selected: { marker: { opacity: 1 } }, unselected: { marker: { opacity: .12 } } }],
    baseLayout({ xaxis: ax, yaxis: ax, xaxis2: ax, yaxis2: ax, xaxis3: ax, yaxis3: ax, xaxis4: ax, yaxis4: ax, xaxis5: ax, yaxis5: ax, dragmode: DRAG[UI.mode] || false, margin: { l: 40, r: 8, t: 8, b: 36 } }));
  bindSelect('plotSplom', 'pointNumber');
}
function drawRadar() {
  const th = PCF.map(f => LAB[f]), thc = th.concat([th[0]]), idx = selIdx(MASK);
  const traces = REGIONS.map(reg => { const rows = R.filter(r => r.Wilayah === reg), v = PCF.map(f => mean(rows.map(r => normv(r, f)))); v.push(v[0]); const dim = S.regions.size && !S.regions.has(reg), [rr, gg, bb] = hex2rgb(RCOL[reg]);
    return { type: 'scatterpolar', r: v, theta: thc, name: pretty(reg), mode: 'lines+markers', line: { color: RCOL[reg], width: dim ? 1 : 2.4 }, marker: { color: RCOL[reg], size: 4, symbol: RSYM[reg] }, fill: 'toself', fillcolor: 'rgba(' + rr + ',' + gg + ',' + bb + ',.05)', opacity: dim ? .25 : .95, hovertemplate: '<b>' + pretty(reg) + '</b><br>%{theta}: %{r:.2f}<extra></extra>' }; });
  if (idx && idx.length) { const v = PCF.map(f => mean(idx.map(i => normv(R[i], f)))); v.push(v[0]); traces.push({ type: 'scatterpolar', r: v, theta: thc, name: 'Pilihan aktif', mode: 'lines', line: { color: INK, width: 3, dash: 'dash' }, hovertemplate: '<b>Pilihan aktif (' + idx.length + ')</b><br>%{theta}: %{r:.2f}<extra></extra>' }); }
  if (FOCUS.kab !== null) { const v = PCF.map(f => normv(R[FOCUS.kab], f)); v.push(v[0]); traces.push({ type: 'scatterpolar', r: v, theta: thc, name: R[FOCUS.kab].Kabupaten, mode: 'lines+markers', line: { color: RED, width: 2.6, dash: 'dot' }, marker: { color: RED, size: 5 }, hovertemplate: '<b>' + esc(R[FOCUS.kab].Kabupaten) + '</b><br>%{theta}: %{r:.2f}<extra></extra>' }); }
  draw('plotRadar', traces, baseLayout({ polar: { radialaxis: { range: [0, 1], tickvals: [0, .5, 1], tickfont: { size: 9 }, gridcolor: GRID, linecolor: LINE }, angularaxis: { tickfont: { size: compact() ? 8.5 : 10.5 }, direction: 'clockwise', gridcolor: GRID, linecolor: LINE }, bgcolor: 'rgba(0,0,0,0)' }, margin: { l: compact() ? 34 : 60, r: compact() ? 34 : 60, t: 22, b: 22 }, dragmode: false }));
}
const TAF = [
  'Poros capaian: pendidikan, umur harapan hidup, dan pengangguran tinggi di satu ujung; partisipasi kerja total tinggi dengan selisih TPAK kecil di ujung lain. Variabel tidak memuat status desa-kota, sehingga sebab pola ini tidak dapat ditentukan.',
  'Poros kesenjangan pasar kerja: selisih TPAK laki-laki dan perempuan lebar disertai partisipasi total rendah, dan TPT perempuan relatif lebih tinggi. Paling terkait dengan IKG, tetapi TPAK ikut menyusun IKG sehingga sebagian kaitannya adalah konstruksi indeks.',
  'Poros kesenjangan pendidikan: HLS dan RLS laki-laki melampaui perempuan, disertai TPT total tinggi. Berkorelasi negatif dengan IPG, sejalan dengan IPG sebagai rasio IPM perempuan terhadap laki-laki.',
  'Kontras campuran: selisih UHH dan UHH total berlawanan arah dengan RLS dan HLS total. Hampir tidak berkaitan dengan IKG maupun IPG, sehingga sulit dibaca sebagai satu konsep.',
  'Hampir seluruhnya selisih TPT gender; berekor panjang sehingga peka terhadap sedikit nilai ekstrem. Kaitan dengan IKG dan IPG lemah.',
];
function insightMVComp() {
  const idx = selIdx(MASK), has = !!idx, scope = mvScopeTags(), v = UI.viewB, cta = [{ label: 'Profil kelompok \u2192', main: true, fn: () => go('multivariat', 2, true) }], items = [];
  if (v === 'load') {
    const k = UI.pc, [pp, nn] = POSNEG(k, .25), sub = subsetStats(has ? idx : ALLIDX), pcn = 'PC' + (k + 1);
    items.push(['fakta', 'Kutub positif: ' + pp + '. Kutub negatif: ' + nn + '.']);
    items.push(['fakta', 'Komponen ini berkorelasi ' + corrWord(ST.pc_ikg[pcn]) + ' dengan IKG dan ' + corrWord(ST.pc_ipg[pcn]) + ' dengan IPG.']);
    items.push(['inferensi', TAF[k]]);
    return { scope: scope.concat([pcn]), big: { v: pct(ST.ev[k]) + '%', k: 'varians ' + pcn + '<br>kumulatif ' + pct(ST.cum_ev[k]) + '%' }, head: has ? pcn + ' untuk pilihan ini berskor ' + (Math.abs(sub.pc[k] / NAT[pcn].s) < .3 ? 'dekat rata-rata' : sub.pc[k] > 0 ? 'tinggi' : 'rendah') + '.' : pcn + ' dibentuk terutama oleh ' + pp.split(', ').slice(0, 2).join(' dan ') + ' (kutub positif) lawan ' + nn.split(', ')[0] + '.', items, cta };
  }
  const sub = subsetStats(has ? idx : ALLIDX), j = sub.pc.map((m, i) => ({ i, z: m / NAT['PC' + (i + 1)].s })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];
  items.push(['inferensi', has ? 'Pilihan terpisah paling jelas pada PC' + (j.i + 1) + ': ' + TAF[j.i].split(':')[0] + '.' : 'Titik membentuk satu awan besar dengan ekor panjang ke satu sisi pada PC1: sebagian kecil daerah sangat berbeda dari mayoritas.']);
  items.push(['catatan', 'Komponen tidak berkorelasi satu sama lain; pola miring pada diagram berasal dari kelompok, bukan dari korelasi.', true]);
  return { scope: scope.concat(['PC1\u2013PC5']), big: has ? { v: 'PC' + (j.i + 1), k: 'paling membedakan pilihan<br>dari nasional' } : { v: '5', k: 'komponen, ' + pct(ST.cum_ev[4]) + '% varians' }, head: has ? mvLabel() + ' paling berbeda pada PC' + (j.i + 1) + '.' : 'Lima komponen memuat ' + pct(ST.cum_ev[4]) + '% varians, dan sebagian kecil daerah menjauh dari awan utama pada PC1.', items, cta };
}
function insightMVRel() {
  const idx = selIdx(MASK), has = !!idx, scope = mvScopeTags(), v = UI.viewC, cta = [{ label: 'Kembali ke ringkasan', main: true, fn: () => go('home', 0, true) }], items = [];
  if (v === 'corr') {
    const cv = corrView(), pairs = []; PCF.forEach((a, x) => PCF.forEach((b, y) => { if (y > x) pairs.push([a, b, cv.M[a][b], D.corr[a][b]]); }));
    pairs.sort((p, q) => Math.abs(q[2]) - Math.abs(p[2])); const p0 = pairs[0];
    const head = 'Korelasi ' + (cv.sub ? mvLabel() : 'nasional') + ': ' + LAB[p0[0]] + ' dan ' + LAB[p0[1]] + ' paling erat.';
    items.push(['fakta', 'Tiga pasangan terkuat: ' + pairs.slice(0, 3).map(p => LAB[p[0]] + '\u2013' + LAB[p[1]]).join('; ') + '.']);
    if (cv.sub) items.push(['fakta', 'Pasangan teratas nasional' + (Math.abs(p0[2]) < Math.abs(p0[3]) - .1 ? ' lebih kuat daripada' : Math.abs(p0[2]) > Math.abs(p0[3]) + .1 ? ' lebih lemah daripada' : ' serupa dengan') + ' pada pilihan ini.']);
    else if (cv.tooSmall) items.push(['catatan', 'Pilihan kurang dari 12 kab/kota, sehingga korelasi nasional yang ditampilkan.']);
    items.push(['inferensi', 'Variabel total (RLS, HLS, UHH, TPT) berkorelasi positif satu sama lain: daerah yang lebih maju pendidikannya cenderung juga lebih tinggi pada indikator lain, tetapi ini asosiasi.']);
    items.push(['catatan', 'Pasangan selisih dan total dari indikator yang sama saling bergantung karena angka dasarnya sama.', true]);
    return { scope: scope.concat(['Korelasi']), big: { v: nf(p0[2], 2), k: 'r terkuat<br>' + LAB[p0[0]] + ' dan ' + LAB[p0[1]] }, head, items, cta };
  }
  const sub = subsetStats(has ? idx : ALLIDX), t3 = sub.dev.slice(0, 3);
  const regAvg = REGIONS.map(r => { const rows = R.filter(x => x.Wilayah === r); return { r, ikg: mean(rows.map(x => x.IKG)) }; }).sort((a, b) => b.ikg - a.ikg);
  const axSpread = PCF.map(f => ({ f, s: sd(REGIONS.map(r => mean(R.filter(x => x.Wilayah === r).map(x => normv(x, f))))) })).sort((a, b) => b.s - a.s)[0];
  items.push(['fakta', 'Dibanding nasional, ' + (has ? 'pilihan' : 'seluruh kab/kota') + ': ' + t3.map(fmtDev).join(', ') + '.']);
  items.push(['fakta', 'Urutan IKG rata-rata wilayah dari tertinggi: ' + regAvg.map(x => pretty(x.r)).join(', ') + '.', true]);
  items.push(['inferensi', 'Sumbu diskalakan min-maks; pada sumbu selisih, nilai tinggi berarti laki-laki lebih unggul. Bentuk profil yang berbeda antarwilayah menunjukkan perbedaan struktur, bukan sekadar tingkat.']);
  if (FOCUS.kab !== null) items.unshift(['fakta', '<b>' + esc(R[FOCUS.kab].Kabupaten) + '</b> ditampilkan sebagai garis titik merah.']);
  return { scope: scope.concat(['Radar']), big: { v: nf(sub.ikg, 3), k: 'IKG rata-rata ' + (has ? 'pilihan' : 'nasional') + '<br>IPG ' + nf(sub.ipg, 1), tone: 'ikg' }, head: has ? mvLabel() + ' paling menyimpang pada ' + t3.map(d => LAB[d.f]).join(', ') + '.' : 'Keenam wilayah paling berbeda pada ' + LAB[axSpread.f] + '.', items, cta };
}
const MVB = { load: ['plotLoad', () => drawLoad()], splom: ['plotSplom', () => drawSplom()] }, MVC = { corr: ['plotHeat', () => drawHeat()], radar: ['plotRadar', () => drawRadar()] };
function mvShow(k) {
  const h = HOOKS[pageId('multivariat', k)];
  if (k === 0) { const sc = UI.proj === 'scree'; gd('plotProj').hidden = sc; gd('plotScree').hidden = !sc; if (h.dirty) { h.dirty = false; sc ? drawScree() : drawProj(); } resizePlot(sc ? 'plotScree' : 'plotProj'); renderInsight(gd('insMV0'), insightMV0()); }
  else if (k === 1) { Object.entries(MVB).forEach(([vw, o]) => { gd(o[0]).hidden = vw !== UI.viewB; }); gd('pcSegWrap').hidden = UI.viewB !== 'load'; if (h.dirty) { h.dirty = false; MVB[UI.viewB][1](); } resizePlot(MVB[UI.viewB][0]); renderInsight(gd('insMV1'), insightMVComp()); }
  else if (k === 2) { if (h.dirty) { h.dirty = false; drawPar(); } resizePlot('plotPar'); renderInsight(gd('insMV2'), insightMVPar()); }
  else { Object.entries(MVC).forEach(([vw, o]) => { gd(o[0]).hidden = vw !== UI.viewC; }); if (h.dirty) { h.dirty = false; MVC[UI.viewC][1](); } resizePlot(MVC[UI.viewC][0]); renderInsight(gd('insMV3'), insightMVRel()); }
}
[0, 1, 2, 3].forEach(k => { HOOKS[pageId('multivariat', k)] = { dirty: true, init() { renderChips(); }, show() { mvShow(k); } }; });
onFocus((what, src) => {
  if (src === 'mv') return;
  if (what === 'region') { S.regions = FOCUS.region ? new Set([FOCUS.region]) : new Set(); MASK = combined(); renderChips(); mvDirty(-1); }
  if (what === 'kab') mvDirty(-1);
  if (NAV.tab === 'multivariat') HOOKS[pageId('multivariat', NAV.idx)].show();
});
