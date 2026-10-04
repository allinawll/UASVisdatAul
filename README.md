# Dashboard Ketimpangan Gender Indonesia (514 kabupaten/kota)

Dashboard visualisasi data untuk UAS Visualisasi Data dan Informasi 2026. Empat halaman: **Home**, **Multivariat**, **Hierarki**, **Geospasial**. Data utama: BPS.

- Demo publik: _isi URL GitHub Pages_
- Repositori: _isi URL repositori_

## Struktur

```
index.html                    Dashboard siap deploy (satu berkas, data tertanam)
src/                          Sumber: index.template.html, styles.css, app.js
scripts/prepare_data.py       Pra-pemrosesan: PCA, UMAP, kelompok UMAP, korelasi terklaster, Moran's I, batas kelas peta
scripts/build.py              Menggabungkan src/ dan data/ menjadi index.html
data/raw/GENDER.xlsx          Data tabular (sheet KAB dipakai)
data/raw/Batas_Kabupaten.*    Shapefile batas kab/kota (non-BPS). Berkas .shp (41 MB) TIDAK disertakan
                              dalam paket ini; letakkan di folder ini sebelum menjalankan prepare_data.py
data/kab_gender.csv           Data terolah
data/kab.geojson              Geometri terolah (disederhanakan, koordinat 3 desimal)
data/dashboard_data.json      Data + statistik yang dibaca dashboard
assets/foto.jpg               Foto pembuat (opsional, persegi), tampil pada kartu identitas Home
```

## Menjalankan ulang

```bash
pip install pandas numpy scipy scikit-learn umap-learn geopandas shapely mapclassify openpyxl
python scripts/prepare_data.py     # atau: --shp <path ke .shp>; menghasilkan data/*.json, *.csv, *.geojson
python scripts/build.py            # menghasilkan index.html
python -m http.server 8000         # atau buka index.html langsung
```

Plotly.js 2.35.2 dan Leaflet 1.9.4 dimuat dari CDN jsDelivr, jadi koneksi internet diperlukan saat membuka dashboard.

## Deploy (GitHub Pages)

Unggah seluruh isi folder ke repositori publik, lalu Settings, Pages, Branch `main`, folder `/ (root)`.

## Wajib dilengkapi sebelum pengumpulan

Edit objek `META` di bagian atas `src/app.js`, lalu jalankan `python scripts/build.py`:

| Kolom | Alasan |
|---|---|
| `tahunData`, `judulTabel`, `url`, `tanggalAkses` | Soal UAS butir 2b. Saat ini tampil "Belum diisi" di halaman Home. |
| `pdrbCatatan` | Satuan PDRB: miliar rupiah. Jenis harga (berlaku atau konstan) belum tertulis; tambahkan bila diperlukan. |
| `urlProyek`, `urlRepo` | Dicantumkan di akhir makalah (butir 5). |
| `identitas` (nama, nim, kelas) dan `foto` | Kartu identitas di bawah halaman Home. Simpan foto di `assets/foto.jpg`. |

Deklarasikan alat bantu AI pada bagian Metodologi makalah (butir 7).

## Pra-pemrosesan

- Sheet KAB `GENDER.xlsx` sudah benar (38 provinsi). Kode 91 dan 92 sengaja memuat beberapa provinsi hasil pemekaran Papua dan tidak diubah. Skrip memvalidasi kode kab/kota terhadap kode provinsi.
- 10 fitur multivariat sama dengan `nb2.ipynb`: lima selisih (laki-laki dikurangi perempuan) dan lima nilai total untuk RLS, HLS, TPT, TPAK, UHH. Standardisasi z-score sebelum PCA dan UMAP (n_neighbors 15, min_dist 0,1, seed 42). Ambang scree plot 80%, sesuai notebook.
- Geometri mengikuti notebook: inner merge `Kode_Kab` dengan `kdkab`, titik pusat dari geometri asli pada CRS geografis, lalu `simplify(0.01, preserve_topology=True)`. Delapan poligon "TUBUH AIR" tanpa kode tidak ikut.
- Moran's I dihitung di peramban (`src/app.js`): bobot k-NN (k = 8, baris dibakukan) pada titik pusat, 999 permutasi, seed 42. Nilainya dinamis menurut variabel (IKG atau IPG) dan fokus wilayah; pada fokus wilayah, tetangga hanya dicari di dalam wilayah. `prepare_data.py` menghitung nilai nasional IKG sebagai pembanding.
- Klasifikasi peta: kuantil, Fisher-Jenks, interval sama (mapclassify), lima kelas.
- Kelompok UMAP: HDBSCAN (ukuran minimum 15) pada embedding 2D; bersifat eksploratif.
- Skrip berhenti bila tafsir komponen utama di dashboard tidak lagi sesuai loading hasil hitung.
- Cantumkan sumber dan lisensi batas wilayah pada makalah.

## Pemenuhan ketentuan Lampiran A

| Topik | Ketentuan | Implementasi |
|---|---|---|
| Multivariat | 8+ variabel, 34+ unit | 10 variabel, 514 unit |
| | 1 reduksi dimensi + 2 teknik lain | PCA dan UMAP; heatmap terklaster, koordinat paralel, radar, matriks sebar |
| | Brushing dan linking | Lasso pada diagram sebar dan matriks sebar, brush sumbu koordinat paralel, chip wilayah; semua tampilan tersinkron |
| | Interpretasi kelompok dan pencilan | Kartu interpretasi lima komponen, UMAP 2D, kelompok, dan pencilan (fakta, inferensi, catatan) |
| Hierarki | 3+ level, 2+ representasi | Wilayah, provinsi, kab/kota; treemap dan sunburst |
| | Ukuran dan warna dua variabel berbeda | Ukuran Penduduk atau PDRB; warna IKG atau IPG |
| | Drill-down dengan breadcrumb | Klik bidang, remah roti, kedua diagram tersinkron |
| Geospasial | Tingkat kab/kota | 514 unit |
| | 2+ jenis peta | Choropleth dan simbol proporsional |
| | Klasifikasi dan palet dijustifikasi; rasio, bukan angka absolut | Tiga metode klasifikasi dengan penjelasan; IKG dan IPG adalah indeks |
| | Tooltip, legenda, zoom/pan, kontrol layer | Tooltip, legenda yang dapat diklik, zoom/pan, kontrol lapisan (Choropleth, Simbol proporsional, Keduanya), fokus wilayah |
| | Opsional: autokorelasi | Moran's I global (tanpa LISA) |

## Aksesibilitas dan responsivitas

- Palet IKG dan IPG memiliki kecerahan menurun monoton. Kategori wilayah memakai palet Okabe dan Ito dengan bentuk penanda berbeda.
- Kontras teks terhadap latar pada pasangan warna teks utama berada di atas 4,5:1.
- Petunjuk membaca disembunyikan di balik ikon i (hover, fokus papan ketik, atau ketuk; Esc menutup).
- Navigasi tab dapat dioperasikan dengan papan ketik; tab berpindah ke bilah bawah pada layar sempit.
- Hover dan pemilihan kabupaten/kota diuji ulang setelah setiap perubahan lapisan, variabel, klasifikasi, kelas legenda, fokus wilayah, dan pencarian.
- Diuji pada Chromium headless di lebar 1440 px dan 390 px (tanpa overflow horizontal). Belum diuji pada perangkat fisik atau pembaca layar.

## Rujukan

Hanya sumber resmi: publikasi BPS, artikel jurnal (dengan DOI), dan buku. Daftar lengkap ada pada bagian "Batasan dan rujukan" halaman Home. Seluruh DOI dan URL BPS pada daftar itu sudah dicek lewat pencarian; periksa kembali sebelum dimasukkan ke makalah.
