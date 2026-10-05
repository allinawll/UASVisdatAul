
/* ============================================================================
 * Analisis bersama: Moran's I dengan bobot k tetangga terdekat, dihitung di peramban
 * ========================================================================== */
const MORAN_K = 8, MORAN_PERM = 999, moranCache = {}, knnMemo = {};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function buildKnn(idx, k) {
  const n = idx.length, kk = Math.min(k, n - 1);
  const xs = idx.map(i => R[i].lon * Math.cos(R[i].lat * Math.PI / 180)), ys = idx.map(i => R[i].lat), nb = new Array(n);
  for (let a = 0; a < n; a++) { const d = []; for (let b = 0; b < n; b++) if (b !== a) d.push([(xs[a] - xs[b]) ** 2 + (ys[a] - ys[b]) ** 2, b]); d.sort((u, v) => u[0] - v[0]); nb[a] = d.slice(0, kk).map(x => x[1]); }
  return { nb, kk };
}
function moranFor(v, reg) {
  const key = v + '|' + reg; if (moranCache[key]) return moranCache[key];
  const idx = R.filter(r => !reg || r.Wilayah === reg).map(r => r.i), nk = reg || 'ALL';
  if (!knnMemo[nk]) knnMemo[nk] = buildKnn(idx, MORAN_K);
  const { nb, kk } = knnMemo[nk], n = idx.length, vals = idx.map(i => R[i][v]), mu = mean(vals), z0 = vals.map(x => x - mu);
  let den = 0; z0.forEach(x => { den += x * x; });
  const st = zz => { let num = 0; for (let a = 0; a < n; a++) { let s = 0; const q = nb[a]; for (let t = 0; t < q.length; t++) s += zz[q[t]]; num += zz[a] * s / kk; } return num / den; };
  const I = st(z0), rnd = mulberry32(42), zz = z0.slice(), sims = []; let ge = 0;
  for (let p = 0; p < MORAN_PERM; p++) { for (let a = n - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)), t = zz[a]; zz[a] = zz[b]; zz[b] = t; } const s = st(zz); sims.push(s); if (s >= I) ge++; }
  const ms = mean(sims), sdv0 = Math.sqrt(mean(sims.map(s => (s - ms) ** 2))), sdv = Math.sqrt(den / n);
  const zs = z0.map(x => x / sdv), lag = zs.map((_, a) => nb[a].reduce((s, q) => s + zs[q], 0) / kk);
  const quad = zs.map((z, a) => z >= 0 ? (lag[a] >= 0 ? 'HH' : 'HL') : (lag[a] >= 0 ? 'LH' : 'LL'));
  return (moranCache[key] = { I, E: -1 / (n - 1), p: (1 + ge) / (MORAN_PERM + 1), z: (I - ms) / sdv0, n, kk, idx, zs, lag, quad });
}
const fmtP = p => p <= 1 / (MORAN_PERM + 1) + 1e-12 ? 'p \u2264 0,001' : 'p = ' + nf(p, 3);

/* ============================================================================
 * HOME
 * ========================================================================== */
function miniBars() {
  const rg = ST.by_region.slice().sort((a, b) => b.ikg - a.ikg), W = 250, rowH = 17, mx = Math.max(...rg.map(r => r.ikg));
  return '<svg viewBox="0 0 ' + W + ' ' + (rg.length * rowH + 4) + '" role="img" aria-label="IKG rata-rata per wilayah">' + rg.map((r, k) => { const w = (r.ikg / mx) * 118, y = k * rowH + 2, t = (r.ikg - IKGMIN) / (IKGMAX - IKGMIN);
    return '<text x="0" y="' + (y + 11) + '" font-size="10" fill="#1A1630">' + esc(pretty(r.Wilayah)) + '</text><rect x="92" y="' + y + '" width="' + w + '" height="12" rx="3" fill="' + ramp(IKG_STOPS, Math.min(1, t * 1.35 + .1)) + '" stroke="#1A1630" stroke-width=".8"/><text x="' + (96 + w) + '" y="' + (y + 10.5) + '" font-size="10" fill="#1A1630">' + nf(r.ikg, 3) + '</text>'; }).join('') + '</svg>';
}
function miniMoran(m) {
  const W = 250, H = 150, xs = m.zs, mn = Math.min(...xs, ...m.lag), mx = Math.max(...xs, ...m.lag), sc = v => 8 + (v - mn) / (mx - mn) * (H - 16);
  const pts = xs.map((z, a) => '<circle cx="' + (sc(z) * (W - 16) / (H - 16) + 0) + '" cy="' + (H - sc(m.lag[a])) + '" r="1.9" fill="' + QCOL[m.quad[a]] + '" opacity=".75"/>').join('');
  const x0 = sc(0) * (W - 16) / (H - 16);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Diagram sebar Moran IPG"><line x1="' + x0 + '" y1="4" x2="' + x0 + '" y2="' + (H - 4) + '" stroke="#CFC8DD"/><line x1="4" y1="' + (H - sc(0)) + '" x2="' + (W - 4) + '" y2="' + (H - sc(0)) + '" stroke="#CFC8DD"/>' + pts + '<line x1="' + sc(mn) * (W - 16) / (H - 16) + '" y1="' + (H - sc(m.I * mn)) + '" x2="' + sc(mx) * (W - 16) / (H - 16) + '" y2="' + (H - sc(m.I * mx)) + '" stroke="#1A1630" stroke-dasharray="4 3" stroke-width="1.3"/></svg>';
}
function miniScree() {
  const W = 250, H = 120, ev = ST.ev, bw = 18, g = 7;
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Scree plot">' + ev.map((v, k) => { const h = v / ev[0] * 80; return '<rect x="' + (8 + k * (bw + g)) + '" y="' + (H - 16 - h) + '" width="' + bw + '" height="' + h + '" rx="2" fill="#F4898A" stroke="#1A1630" stroke-width=".8"/><text x="' + (8 + k * (bw + g) + bw / 2) + '" y="' + (H - 4) + '" font-size="8.5" text-anchor="middle" fill="#1A1630">PC' + (k + 1) + '</text>'; }).join('') +
    '<polyline fill="none" stroke="#154A94" stroke-width="2" points="' + ST.cum_ev.map((c, k) => (8 + k * (bw + g) + bw / 2) + ',' + (H - 16 - c * 84)).join(' ') + '"/><text x="' + (W - 6) + '" y="' + (H - 16 - 84 - 2) + '" font-size="9" text-anchor="end" fill="#154A94">kumulatif ' + pct(ST.cum_ev[4], 0) + '% pada PC5</text></svg>';
}
HOOKS['home-0'] = { init() {
  const order = R.slice().sort((a, b) => a.IKG - b.IKG), wf = gd('waffle'), rd = gd('waffleRead');
  wf.innerHTML = order.map(r => '<i data-i="' + r.i + '" style="background:' + ramp(IKG_STOPS, (r.IKG - IKGMIN) / (IKGMAX - IKGMIN)) + '"></i>').join('');
  rd.textContent = '514 petak, satu per kabupaten/kota, diurutkan dari IKG terendah ke tertinggi.';
  const show = e => { const t = e.target.closest('i'); if (!t) return; $$('i.on', wf).forEach(x => x.classList.remove('on')); t.classList.add('on'); const r = R[+t.dataset.i]; rd.textContent = r.Kabupaten + ', ' + r.prov + ': IKG ' + nf(r.IKG, 3) + ', IPG ' + nf(r.IPG, 2); };
  wf.addEventListener('pointerover', show); wf.addEventListener('click', show);
  const mI = moranFor('IKG', ''), mG = moranFor('IPG', ''), medG = median(stat('IPG'));
  gd('homeKpis').innerHTML = [
    [ni(ST.n), 'kabupaten/kota di ' + ST.n_prov + ' provinsi'],
    [nf(ST.ikg_median, 3), 'median IKG, rentang ' + nf(IKGMIN, 3) + ' sampai ' + nf(IKGMAX, 3)],
    [nf(medG, 1), 'median IPG, rentang ' + nf(IPGMIN, 1) + ' sampai ' + nf(IPGMAX, 1)],
    [nf(mI.I, 2) + ' | ' + nf(mG.I, 2), "Moran's I IKG | IPG (" + fmtP(Math.max(mI.p, mG.p)) + ')'],
  ].map(k => '<div class="card kpi"><div class="v">' + k[0] + '</div><div class="k">' + k[1] + '</div></div>').join('');
  const regs = ST.by_region.slice(), mx = (k, s) => regs.reduce((a, b) => (s * b[k] > s * a[k] ? b : a));
  const hiK = mx('ikg', 1), loG = mx('ipg', -1);
  const flow = [
    ['Langkah 1', 'Besaran', 'Maluku dan Papua ber-IKG rata-rata tertinggi (' + nf(hiK.ikg, 3) + ') dan ber-IPG terendah (' + nf(loG.ipg, 1) + '). ' + ST.n_ikg_ge_05 + ' kabupaten/kota ber-IKG 0,5 atau lebih hanya dihuni ' + nf(ST.pop_share_ikg_ge_05 * 100, 1) + '% penduduk.', 'Hierarki', ['hierarki', 0]],
    ['Langkah 2', 'Sebaran', 'Daerah bernilai mirip saling berdekatan: Moran\'s I ' + nf(mI.I, 2) + ' untuk IKG dan ' + nf(mG.I, 2) + ' untuk IPG.', 'Geospasial', ['geospasial', 0]],
    ['Langkah 3', 'Profil', 'Lima komponen utama memuat ' + pct(ST.cum_ev[4]) + '% varians. HLS perempuan melampaui laki-laki di ' + ST.n_hls_p_gt_l + ' kabupaten/kota, tetapi TPAK perempuan hanya di ' + ST.n_tpak_p_gt_l + '.', 'Multivariat', ['multivariat', 0]],
  ];
  const viz = [miniBars(), miniMoran(mG), miniScree()];
  gd('homeFlow').innerHTML = flow.map((f, k) => (k ? '<div class="farrow" aria-hidden="true">&rarr;</div>' : '') + '<article class="card fstep"><span class="n">' + f[0] + '</span><h3>' + f[1] + '</h3><p>' + f[2] + '</p><div class="fviz">' + viz[k] + '</div><button type="button" class="pill cta" data-flow="' + k + '">' + f[3] + ' &rarr;</button></article>').join('');
  gd('homeFlow').addEventListener('click', e => { const b = e.target.closest('[data-flow]'); if (b) { const t = flow[+b.dataset.flow][4]; go(t[0], t[1], true); } });
}, show() {} };

const MVDEF = {
  RLS_LP: 'tahun', 'RLS_L-P': 'tahun', HLS_LP: 'tahun', 'HLS_L-P': 'tahun', TPT_LP: 'persen', 'TPT_L-P': 'poin persen', TPAK_LP: 'persen', 'TPAK_L-P': 'poin persen', UHH_LP: 'tahun', 'UHH_L-P': 'tahun' };
const GL = { main: 0 };
function renderGloss(which) {
  const dt = rows => '<table class="def"><thead><tr><th>Variabel</th><th>Definisi operasional</th><th>Satuan</th></tr></thead><tbody>' + rows.map(r => '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody></table>';
  const T = {
    main: dt([
      ['IKG<small>Indeks Ketimpangan Gender</small>', 'Indeks komposit ketimpangan capaian perempuan dan laki-laki pada tiga dimensi: kesehatan reproduksi, pemberdayaan, dan pasar tenaga kerja. Mengadaptasi Gender Inequality Index (GII) UNDP. Nilai 0 berarti setara sepenuhnya, nilai 1 berarti ketimpangan sempurna.', 'indeks, skala 0 sampai 1'],
      ['IPG<small>Indeks Pembangunan Gender</small>', 'IPG = (IPM perempuan \u00F7 IPM laki-laki) \u00D7 100. Nilai 100 berarti IPM perempuan sama dengan laki-laki; di bawah 100 perempuan tertinggal; di atas 100 perempuan lebih tinggi.', 'indeks (rasio \u00D7 100)'],
    ]),
    mv: dt(PCF.map(f => [LAB[f], LABLONG[f], MVDEF[f]])) + '<p class="readnote" style="margin-top:8px">Total adalah nilai laki-laki dan perempuan gabungan (kode _LP); selisih adalah laki-laki dikurangi perempuan. Seluruh variabel distandardisasi (z-score) sebelum PCA dan UMAP.</p>',
    other: dt([
      ['IPM<small>Indeks Pembangunan Manusia</small>', 'Ringkasan capaian tiga dimensi dasar: umur panjang dan sehat (UHH), pengetahuan (HLS dan RLS), serta standar hidup layak (pengeluaran per kapita disesuaikan). Tersedia untuk laki-laki, perempuan, dan gabungan. Pembentuk IPG.', 'indeks, skala 0 sampai 100'],
      ['PDRB', 'Produk Domestik Regional Bruto kabupaten/kota: nilai tambah bruto seluruh kegiatan ekonomi di wilayah tersebut. Menentukan luas lingkaran pada peta dan ukuran bidang pada Hierarki.', esc(META.pdrbCatatan)],
      ['Penduduk', 'Jumlah penduduk kabupaten/kota. Menentukan ukuran bidang pada Hierarki dan bobot rata-rata simpul induk.', 'jiwa'],
    ]),
  };
  gd('glossary').innerHTML = T[which]; gd('glossary').scrollTop = 0;
}
regCtrl('gloss', () => GL.main === 0 ? 'main' : GL.main, v => { GL.main = v; renderGloss(v); }); GL.main = 'main';
HOOKS['home-1'] = { init() {
  gd('rampIKG').style.background = 'linear-gradient(90deg,' + IKG_STOPS.join(',') + ')'; gd('rampIPG').style.background = 'linear-gradient(90deg,' + IPG_STOPS.join(',') + ')';
  gd('rampIKG').nextElementSibling.innerHTML = '<span>' + nf(IKGMIN, 2) + '</span><span>' + nf(IKGMAX, 2) + '</span>';
  gd('rampIPG').nextElementSibling.innerHTML = '<span>' + nf(IPGMIN, 1) + '</span><span>' + nf(IPGMAX, 1) + '</span>';
  gd('readIKG').textContent = 'Skala 0 sampai 1: 0 berarti tidak ada ketimpangan antara perempuan dan laki-laki, 1 berarti ketimpangan maksimum. Pada data ini ' + nf(IKGMIN, 2) + ' sampai ' + nf(IKGMAX, 2) + ' (median ' + nf(ST.ikg_median, 3) + '). Angka 0,5 hanya pembatas deskriptif dashboard, bukan standar BPS.';
  gd('readIPG').textContent = 'IPG = IPM perempuan \u00F7 IPM laki-laki \u00D7 100. Nilai 100 berarti IPM perempuan sama dengan laki-laki; di bawah 100 perempuan tertinggal; di atas 100 perempuan lebih tinggi. Pada data ini ' + nf(IPGMIN, 1) + ' sampai ' + nf(IPGMAX, 1) + ' (median ' + nf(median(stat('IPG')), 1) + ').';
  gd('readPal').textContent = 'Kedua palet bersifat sekuensial dengan kecerahan menurun monoton, sehingga urutan nilai tetap terbaca bila warna sulit dibedakan. IKG memakai merah, IPG memakai biru agar tidak tertukar. Kategori wilayah memakai delapan warna yang dioptimalkan bagi penderita buta warna merah-hijau (Wong, 2011) dan bentuk penanda berbeda. Keterangan ini berlaku di seluruh halaman.';
  const rk = gd('regionKey'); REGIONS.forEach(r => rk.appendChild(regionChip(r, false)));
  renderGloss('main');
}, show() {} };

HOOKS['home-2'] = { init() {
  const miss = '<span class="missing">Belum diisi</span>', row = (k, v) => '<tr><th scope="row">' + k + '</th><td>' + (v ? esc(v) : miss) + '</td></tr>';
  gd('metaTable').innerHTML = '<tbody>' + row('Sumber utama', META.sumber) + row('Tahun data', META.tahunData) + row('Judul tabel/publikasi', META.judulTabel) + row('URL tabel/publikasi', META.url) + row('Tanggal akses', META.tanggalAkses) + row('Satuan PDRB', META.pdrbCatatan) + row('Satuan penduduk', 'jiwa') +
    '<tr><th scope="row">Cakupan</th><td>' + ST.n + ' kabupaten/kota, ' + ST.n_prov + ' provinsi</td></tr>' +
    '<tr><th scope="row">Data pendukung</th><td><a href="' + META.batasUrl + '" target="_blank" rel="noopener">Batas kabupaten/kota (non-BPS)</a>, disederhanakan 0,01 derajat</td></tr>' +
    '<tr><th scope="row">Pra-pemrosesan</th><td>Skrip <code>scripts/prepare_data.py</code>: selisih laki-laki dikurangi perempuan, z-score, PCA, UMAP, HDBSCAN, batas kelas peta.</td></tr></tbody>';
  const idn = META.identitas, idv = v => v ? esc(v) : miss;
  gd('idList').innerHTML = '<dt>Nama</dt><dd>' + idv(idn.nama) + '</dd><dt>NIM</dt><dd>' + idv(idn.nim) + '</dd><dt>Kelas</dt><dd>' + idv(idn.kelas) + '</dd>';
  const av = gd('avatar'); av.innerHTML = '<div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-5.4 7.5-5.4s6.7 1.8 7.5 5.4"/></svg>Foto</div>';
  if (META.foto) { const im = new Image(); im.alt = 'Foto ' + (idn.nama || 'pembuat'); im.onload = () => { av.classList.add('has'); av.innerHTML = ''; av.appendChild(im); }; im.src = META.foto; }
  const ref = (t, u) => '<li>' + t + ' <a href="' + u + '" target="_blank" rel="noopener">' + u + '</a></li>';
  gd('limits').innerHTML = '<details open><summary>Batasan analisis</summary><ul class="clean">' +
    '<li>Data lintas wilayah pada satu periode: pola yang tampak adalah asosiasi, bukan sebab akibat.</li>' +
    '<li>Variabel selisih dan total berasal dari angka dasar yang sama sehingga saling bergantung.</li>' +
    '<li>PCA linear dan peka pencilan. UMAP menjaga ketetanggaan lokal; jarak antargugus tidak bermakna sebagai besaran perbedaan.</li>' +
    '<li>Warna simpul induk pada Hierarki adalah rata-rata tertimbang ukuran terpilih, bukan angka resmi provinsi atau wilayah.</li>' +
    '<li>Batas wilayah disederhanakan; jangan dipakai mengukur luas. Pada choropleth, wilayah luas berpenduduk sedikit tampak dominan.</li>' +
    '<li>Moran\'s I memakai bobot k = 8 tetangga terdekat dari titik pusat poligon; pada fokus wilayah, tetangga dicari di dalam wilayah itu.</li></ul></details>' +
    '<details><summary>Rujukan</summary><ol class="refs">' +
    ref('Badan Pusat Statistik. (2023, 15 November). <i>Indeks Pembangunan Manusia (IPM) Indonesia tahun 2023 mencapai 74,39</i> [Berita Resmi Statistik].', 'https://www.bps.go.id/id/pressrelease/2023/11/15/2033/indeks-pembangunan-manusia--ipm--indonesia-tahun-2023-mencapai-74-39--meningkat-0-62-poin--0-84-persen--dibandingkan-tahun-sebelumnya--73-77--.html') +
    ref('Badan Pusat Statistik. (2024). <i>Indeks Pembangunan Manusia 2023</i> (No. Publikasi 07300.24008). BPS.', 'https://www.bps.go.id/en/publication/2024/05/13/8f77e73a66a6f484c655985a/indeks-pembangunan-manusia-2023.html') +
    ref('Badan Pusat Statistik. (2025, 5 Mei). <i>Indeks Ketimpangan Gender (IKG) Indonesia konsisten mengalami penurunan menjadi 0,421</i> [Berita Resmi Statistik].', 'https://www.bps.go.id/id/pressrelease/2025/05/05/2430/indeks-ketimpangan-gender-ikg-indonesia-konsisten-mengalami-penurunan-menjadi-0-421-menunjukkan-perbaikan-dalam-kesetaraan-gender') +
    ref('Becker, R. A., &amp; Cleveland, W. S. (1987). Brushing scatterplots. <i>Technometrics, 29</i>(2), 127\u2013142.', 'https://doi.org/10.1080/00401706.1987.10488204') +
    ref('Brewer, C. A., &amp; Pickle, L. (2002). Evaluation of methods for classifying epidemiological data on choropleth maps in series. <i>Annals of the Association of American Geographers, 92</i>(4), 662\u2013681.', 'https://doi.org/10.1111/1467-8306.00310') +
    ref('Campello, R. J. G. B., Moulavi, D., Zimek, A., &amp; Sander, J. (2015). Hierarchical density estimates for data clustering, visualization, and outlier detection. <i>ACM TKDD, 10</i>(1), 1\u201351.', 'https://doi.org/10.1145/2733381') +
    ref('Chari, T., &amp; Pachter, L. (2023). The specious art of single-cell genomics. <i>PLoS Computational Biology, 19</i>(8), e1011288.', 'https://doi.org/10.1371/journal.pcbi.1011288') +
    ref('Cleveland, W. S., &amp; McGill, R. (1984). Graphical perception: Theory, experimentation, and application to the development of graphical methods. <i>JASA, 79</i>(387), 531\u2013554.', 'https://doi.org/10.1080/01621459.1984.10478080') +
    ref('Inselberg, A. (1985). The plane with parallel coordinates. <i>The Visual Computer, 1</i>, 69\u201391.', 'https://doi.org/10.1007/BF01898350') +
    ref('Jolliffe, I. T., &amp; Cadima, J. (2016). Principal component analysis: A review and recent developments. <i>Phil. Trans. R. Soc. A, 374</i>(2065), 20150202.', 'https://doi.org/10.1098/rsta.2015.0202') +
    ref('McInnes, L., Healy, J., Saul, N., &amp; Gro\u00DFberger, L. (2018). UMAP: Uniform manifold approximation and projection. <i>JOSS, 3</i>(29), 861.', 'https://doi.org/10.21105/joss.00861') +
    ref('Moran, P. A. P. (1950). Notes on continuous stochastic phenomena. <i>Biometrika, 37</i>(1\u20132), 17\u201323.', 'https://doi.org/10.1093/biomet/37.1-2.17') +
    ref('Shneiderman, B. (1992). Tree visualization with tree-maps: 2-d space-filling approach. <i>ACM Trans. Graph., 11</i>(1), 92\u201399.', 'https://doi.org/10.1145/102377.115768') +
    ref('Shneiderman, B. (1996). The eyes have it: A task by data type taxonomy for information visualizations. <i>Proc. IEEE Symp. Visual Languages</i>, 336\u2013343.', 'https://doi.org/10.1109/VL.1996.545307') +
    ref('Wong, B. (2011). Points of view: Color blindness. <i>Nature Methods, 8</i>(6), 441.', 'https://doi.org/10.1038/nmeth.1618') +
    '</ol></details>';
}, show() {} };
