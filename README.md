# Dashboard Ketimpangan Gender Indonesia (514 kabupaten/kota), desain halaman penuh

Tiga tab visualisasi (Hierarki, Geospasial, Multivariat) plus Home. Pada desktop (lebar minimal 920 px, tinggi minimal 540 px) setiap halaman memuat grafik, kontrol, dan interpretasi dinamis dalam satu layar. Pada tablet dan ponsel, halaman digulir vertikal agar grafik tampil besar. Data utama: BPS.

## Alur
Home (ringkasan, cara membaca, sumber) → Hierarki (besaran) → Geospasial (sebaran, Moran's I) → Multivariat (profil). Multivariat terdiri dari 4 halaman: (1) UMAP, PCA, Scree; (2) Loading dan Matriks PC; (3) Koordinat paralel; (4) Korelasi dan Radar. Tombol Berikutnya mengalir lintas tab. Pilihan wilayah dan kabupaten/kota terbawa antarhalaman.

## Struktur
```
index.html                  Dashboard siap deploy
src/                        index.template.html, styles.css, app1.js ... app6.js
scripts/prepare_data.py     Pra-pemrosesan (PCA, UMAP, HDBSCAN, batas kelas peta); butuh shapefile di data/raw/
scripts/build.py            Menggabungkan src/ dan data/ menjadi index.html
data/                       dashboard_data.json, kab.geojson, kab_gender.csv, raw/GENDER.xlsx
assets/foto_aul.jpg         Foto untuk kartu identitas (simpan sendiri; opsional)
```

## Menjalankan ulang
```bash
pip install pandas numpy scipy scikit-learn umap-learn geopandas shapely mapclassify openpyxl
python scripts/prepare_data.py  
python scripts/build.py         
```
Deploy ke Vercel sebagai situs statis (Framework Preset: Other, tanpa build). Pustaka Plotly 2.35.2, Leaflet 1.9.4, dan font dimuat dari CDN.

