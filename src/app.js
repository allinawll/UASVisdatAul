/* ============================================================================
 * Dashboard Ketimpangan Gender Indonesia
 * Plotly.js (multivariat, hierarki) + Leaflet (geospasial). Tanpa server.
 * Data: window.__DATA__ (tabular + statistik) dan window.__GEO__ (GeoJSON).
 * ========================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------- konfigurasi metadata
 * Isi sebelum pengumpulan (Soal UAS butir 2b): judul tabel/publikasi, tahun, URL, tanggal akses. */
const META = {
  sumber: 'Badan Pusat Statistik (BPS)',
  tahunData: '',
  judulTabel: '',
  url: '',
  tanggalAkses: '',
  pdrbCatatan: 'miliar rupiah',
  urlProyek: '',
  urlRepo: '',
  identitas: { nama: '', nim: '', kelas: '' },
  foto: 'assets/foto.jpg', // foto persegi di assets/foto.jpg; bila tidak ada, slot kosong tampil
};

/* ---------------------------------------------------------------- util */
const D = window.__DATA__, GEO = window.__GEO__, ST = D.stats;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nf = (x, d = 2) => Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const ni = x => Math.round(x).toLocaleString('id-ID');
const pct = (x, d = 1) => nf(x * 100, d);
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const median = a => { const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
function ranks(a) { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[o[t][1]] = rk; i = j + 1; } return r; }
function spearman(a, b) { const ra = ranks(a), rb = ranks(b), ma = mean(ra), mb = mean(rb); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < ra.length; i++) { const x = ra[i] - ma, y = rb[i] - mb; sab += x * y; saa += x * x; sbb += y * y; } return sab / Math.sqrt(saa * sbb); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const narrow = () => window.innerWidth < 640;

function pretty(s) {
  return s.toLowerCase()
    .replace(/(^|[\s.\-/(])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\bDki\b/, 'DKI').replace(/\bDi\b/, 'DI').replace(/\bNusra\b/, 'Nusra');
}

/* ---------------------------------------------------------------- data */
const R = D.rows.map((row, i) => {
  const o = { i };
  D.cols.forEach((c, k) => { o[c] = row[k]; });
  o.wil = pretty(o.Wilayah); o.prov = pretty(o.Provinsi);
  return o;
});
const N = R.length;
const kd2i = {}; R.forEach(r => { kd2i[r.kdkab] = r.i; });
const PCF = D.features; // urutan fitur sama dengan nb1.ipynb
const LAB = {
  'RLS_LP': 'RLS total', 'RLS_L-P': 'Selisih RLS', 'HLS_LP': 'HLS total', 'HLS_L-P': 'Selisih HLS',
  'TPT_LP': 'TPT total', 'TPT_L-P': 'Selisih TPT', 'TPAK_LP': 'TPAK total', 'TPAK_L-P': 'Selisih TPAK',
  'UHH_LP': 'UHH total', 'UHH_L-P': 'Selisih UHH',
};
const LABLONG = {
  'RLS_LP': 'Rata-rata lama sekolah, laki-laki dan perempuan (tahun)',
  'RLS_L-P': 'Rata-rata lama sekolah, laki-laki dikurangi perempuan (tahun)',
  'HLS_LP': 'Harapan lama sekolah, laki-laki dan perempuan (tahun)',
  'HLS_L-P': 'Harapan lama sekolah, laki-laki dikurangi perempuan (tahun)',
  'TPT_LP': 'Tingkat pengangguran terbuka, laki-laki dan perempuan (%)',
  'TPT_L-P': 'Tingkat pengangguran terbuka, laki-laki dikurangi perempuan (poin persen)',
  'TPAK_LP': 'Tingkat partisipasi angkatan kerja, laki-laki dan perempuan (%)',
  'TPAK_L-P': 'Tingkat partisipasi angkatan kerja, laki-laki dikurangi perempuan (poin persen)',
  'UHH_LP': 'Umur harapan hidup, laki-laki dan perempuan (tahun)',
  'UHH_L-P': 'Umur harapan hidup, laki-laki dikurangi perempuan (tahun)',
};
const stat = (k) => R.map(r => r[k]);
const IKGMIN = Math.min(...stat('IKG')), IKGMAX = Math.max(...stat('IKG'));
const IPGMIN = Math.min(...stat('IPG')), IPGMAX = Math.max(...stat('IPG'));

/* ---------------------------------------------------------------- palet (satu sistem untuk seluruh dashboard)
 * IKG (makin tinggi makin timpang): krem ke plum, kecerahan menurun monoton.
 * IPG (makin tinggi makin setara): hijau-teal pucat ke teal tua.
 * Wilayah: palet delapan warna untuk buta warna merah-hijau (Wong, 2011), dipasangkan dengan bentuk penanda. */
const IKG_STOPS = ['#FBF0DA', '#F3C98C', '#E48C5C', '#B9435A', '#5B1F5E'];
const IPG_STOPS = ['#EAF5F2', '#B7E0D8', '#6DBBB1', '#2E8E98', '#0F5C6E'];
const REGIONS = ['SUMATERA', 'JAWA', 'KALIMANTAN', 'SULAWESI', 'BALI & NUSRA', 'MALUKU & PAPUA'];
const RCOL = { 'SUMATERA': '#0072B2', 'JAWA': '#D55E00', 'KALIMANTAN': '#009E73', 'SULAWESI': '#CC79A7', 'BALI & NUSRA': '#E69F00', 'MALUKU & PAPUA': '#56B4E9' };
const RSYM = { 'SUMATERA': 'circle', 'JAWA': 'diamond', 'KALIMANTAN': 'square', 'SULAWESI': 'triangle-up', 'BALI & NUSRA': 'cross', 'MALUKU & PAPUA': 'x' };
const RSVG = { // bentuk untuk chip (viewBox 12)
  'circle': '<circle cx="6" cy="6" r="5"/>', 'diamond': '<path d="M6 0.5L11.5 6L6 11.5L0.5 6z"/>',
  'square': '<rect x="1" y="1" width="10" height="10"/>', 'triangle-up': '<path d="M6 0.8L11.5 11H0.5z"/>',
  'cross': '<path d="M4 0.5h4v3.5h3.5v4H8v3.5H4V8H0.5V4H4z"/>', 'x': '<path d="M2.2 0.5L6 4.3L9.8 0.5L11.5 2.2L7.7 6L11.5 9.8L9.8 11.5L6 7.7L2.2 11.5L0.5 9.8L4.3 6L0.5 2.2z"/>',
};
const INK = '#13232E', MUTED = '#56656F', LINE = '#D6DFE4', GRID = '#E8EDF0', BRAND = '#0F5C6E';
const GREY_OFF = '#D3DBE0';
const FF = "'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const DIV_SCALE = [[0, '#01665E'], [0.25, '#5AB4AC'], [0.5, '#F5F5F5'], [0.75, '#D8B365'], [1, '#8C510A']]; // BrBG, aman buta warna

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const x = t * (stops.length - 1), i = Math.min(Math.floor(x), stops.length - 2), f = x - i;
  const a = hex2rgb(stops[i]), b = hex2rgb(stops[i + 1]);
  return 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',') + ')';
}
const plScale = stops => stops.map((c, i) => [i / (stops.length - 1), c]);
const STOPS = { IKG: IKG_STOPS, IPG: IPG_STOPS };
const VMIN = { IKG: IKGMIN, IPG: IPGMIN }, VMAX = { IKG: IKGMAX, IPG: IPGMAX };
const VDEC = { IKG: 3, IPG: 2 };

/* ---------------------------------------------------------------- plotly helpers */
const PCFG = { responsive: true, displaylogo: false, displayModeBar: 'hover', scrollZoom: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'select2d', 'lasso2d', 'autoScale2d'] };
function baseLayout(extra) {
  return Object.assign({
    font: { family: FF, size: narrow() ? 11 : 12, color: INK },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 52, r: 14, t: 10, b: 46 },
    hoverlabel: { font: { family: FF, size: 12 }, bgcolor: '#fff', bordercolor: LINE, align: 'left' },
    showlegend: false,
  }, extra);
}
const axisStyle = (extra) => Object.assign({ gridcolor: GRID, zerolinecolor: '#C5D0D7', linecolor: LINE, tickfont: { size: 11 }, automargin: true }, extra);
const gd = id => document.getElementById(id);
const draw = (id, data, layout, cfg) => Plotly.react(gd(id), data, layout, Object.assign({}, PCFG, cfg || {}));
const srcLine = (extra) => 'Sumber: BPS' + (META.tahunData ? ', data ' + META.tahunData : '') + (extra ? '. ' + extra : '.');

/* ---------------------------------------------------------------- petunjuk (ikon i) */
let tipN = 0;
function closeTips() {
  $$('.info[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  $$('.tip.open').forEach(t => t.classList.remove('open'));
}
function mountInfo(tip, host) {
  const h = host.querySelector('h2, h3'); if (!h) return;
  let row = h.parentNode.classList.contains('hd') ? h.parentNode : null;
  if (!row) { row = document.createElement('div'); row.className = 'hd'; h.parentNode.insertBefore(row, h); row.appendChild(h); }
  const id = 'tip' + (++tipN);
  tip.id = tip.id || id; tip.classList.add('tip'); tip.setAttribute('role', 'note');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'info'; b.textContent = 'i';
  b.setAttribute('aria-label', 'Petunjuk membaca: ' + h.textContent.trim());
  b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', tip.id);
  row.appendChild(b); host.appendChild(tip);
  if (window.matchMedia('(hover: hover)').matches) {
    b.addEventListener('mouseenter', () => tip.classList.add('open'));
    b.addEventListener('mouseleave', () => { if (b.getAttribute('aria-expanded') !== 'true') tip.classList.remove('open'); });
  }
  b.addEventListener('focus', () => { if (b.matches(':focus-visible')) tip.classList.add('open'); });
  b.addEventListener('blur', () => { if (b.getAttribute('aria-expanded') !== 'true') tip.classList.remove('open'); });
  b.addEventListener('click', e => {
    e.stopPropagation();
    const was = b.getAttribute('aria-expanded') === 'true';
    closeTips();
    if (!was) { b.setAttribute('aria-expanded', 'true'); tip.classList.add('open'); }
  });
}
function mountAllInfo() {
  $$('.card > header .sub:not(.keep)').forEach(t => mountInfo(t, t.parentNode));
  $$('.lead .how').forEach(t => mountInfo(t, t.parentNode));
  document.addEventListener('click', e => { if (!e.target.closest('.info, .tip')) closeTips(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTips(); });
}

/* ---------------------------------------------------------------- tab system */
const TABS = ['home', 'multivariat', 'hierarki', 'geospasial'];
const inited = {};
let current = null;
function showTab(name, pushHash) {
  if (!TABS.includes(name)) name = 'home';
  current = name;
  TABS.forEach(t => {
    const sel = t === name;
    const b = gd('tab-' + t); b.setAttribute('aria-selected', sel); b.tabIndex = sel ? 0 : -1;
    gd('panel-' + t).hidden = !sel;
  });
  if (pushHash && location.hash !== '#' + name) history.pushState(null, '', '#' + name);
  if (!inited[name]) { inited[name] = true; INIT[name](); }
  else REFLOW[name] && REFLOW[name]();
  closeTips(); window.scrollTo({ top: 0 });
  document.title = ({ home: 'Ketimpangan Gender Indonesia', multivariat: 'Multivariat', hierarki: 'Hierarki', geospasial: 'Geospasial' })[name] + ' | Dashboard Ketimpangan Gender';
}
function bindTabs() {
  $$('.tab').forEach(b => {
    b.addEventListener('click', e => { e.preventDefault(); showTab(b.dataset.tab, true); });
    b.addEventListener('keydown', e => {
      const k = TABS.indexOf(b.dataset.tab);
      let n = null;
      if (e.key === 'ArrowRight') n = (k + 1) % TABS.length;
      if (e.key === 'ArrowLeft') n = (k + TABS.length - 1) % TABS.length;
      if (e.key === 'Home') n = 0; if (e.key === 'End') n = TABS.length - 1;
      if (n !== null) { e.preventDefault(); showTab(TABS[n], true); gd('tab-' + TABS[n]).focus(); }
    });
  });
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1), false));
  document.body.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); showTab(g.dataset.go, true); }
  });
}
function segBind(id, cb) {
  const root = gd(id);
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    cb(b.dataset.v);
  });
}
function segSet(id, v) { $$('#' + id + ' button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); }

const regionChip = (reg, interactive) => {
  const el = document.createElement(interactive ? 'button' : 'span');
  el.className = 'chip'; if (interactive) { el.setAttribute('aria-pressed', 'false'); el.dataset.r = reg; } else el.style.cursor = 'default';
  el.innerHTML = '<svg viewBox="0 0 12 12" fill="' + RCOL[reg] + '" aria-hidden="true">' + RSVG[RSYM[reg]] + '</svg>' + esc(pretty(reg)) + ' <small style="opacity:.7">' + R.filter(r => r.Wilayah === reg).length + '</small>';
  return el;
};

/* ============================================================================
 * HOME
 * ========================================================================== */
function initHome() {
  // waffle
  const order = R.slice().sort((a, b) => a.IKG - b.IKG);
  const wf = gd('waffle');
  wf.innerHTML = order.map(r => '<i data-i="' + r.i + '" style="background:' + ramp(IKG_STOPS, (r.IKG - IKGMIN) / (IKGMAX - IKGMIN)) + '"></i>').join('');
  const rd = gd('waffleRead');
  const show = e => {
    const t = e.target.closest('i'); if (!t) return;
    $$('i.on', wf).forEach(x => x.classList.remove('on')); t.classList.add('on');
    const r = R[+t.dataset.i];
    rd.textContent = r.Kabupaten + ', ' + r.prov + ': IKG ' + nf(r.IKG, 3) + ', IPG ' + nf(r.IPG, 2);
  };
  wf.addEventListener('pointerover', show); wf.addEventListener('click', show);

  // ringkasan
  const mI = moranFor('IKG', ''), mG = moranFor('IPG', '');
  const med = ST.ikg_median, medG = median(stat('IPG')), nG100 = R.filter(r => r.IPG < 100).length;
  gd('homeKpis').innerHTML = [
    [ni(ST.n), 'kabupaten/kota di ' + ST.n_prov + ' provinsi'],
    [nf(med, 3), 'median IKG, rentang ' + nf(IKGMIN, 3) + ' sampai ' + nf(IKGMAX, 3)],
    [nf(medG, 1), 'median IPG, rentang ' + nf(IPGMIN, 1) + ' sampai ' + nf(IPGMAX, 1)],
    [nf(mI.I, 2), "Moran's I untuk IKG (" + fmtP(mI.p) + '); IPG ' + nf(mG.I, 2)],
  ].map(k => '<div class="kpi"><div class="v">' + k[0] + '</div><div class="k">' + k[1] + '</div></div>').join('');

  // temuan (IKG dan IPG)
  const regs = ST.by_region.slice(), mx = (k, s) => regs.reduce((a, b) => (s * b[k] > s * a[k] ? b : a));
  const hiK = mx('ikg', 1), loK = mx('ikg', -1), loG = mx('ipg', -1), hiG = mx('ipg', 1);
  gd('homeFinds').innerHTML = [
    [hiK.Wilayah === loG.Wilayah ? 'Ketimpangan tertinggi dan IPG terendah di ' + pretty(hiK.Wilayah) : 'IKG dan IPG menunjuk wilayah berbeda',
      'Rata-rata sederhana IKG kabupaten/kota tertinggi di ' + pretty(hiK.Wilayah) + ' (' + nf(hiK.ikg, 3) + ') dan terendah di ' + pretty(loK.Wilayah) + ' (' + nf(loK.ikg, 3) + '). IPG terendah di ' + pretty(loG.Wilayah) + ' (' + nf(loG.ipg, 1) + ') dan tertinggi di ' + pretty(hiG.Wilayah) + ' (' + nf(hiG.ipg, 1) + ').', 'geospasial', 'Lihat peta'],
    ['Daerah ber-IKG tinggi bukan daerah padat', ST.n_ikg_ge_05 + ' dari ' + ST.n + ' kabupaten/kota ber-IKG 0,5 atau lebih, tetapi hanya ' + nf(ST.pop_share_ikg_ge_05 * 100, 1) + '% penduduk tinggal di sana. Sebanyak ' + nG100 + ' kabupaten/kota ber-IPG di bawah 100, artinya IPM perempuan lebih rendah dari laki-laki.', 'hierarki', 'Lihat hierarki'],
    ['Kesenjangan kerja melebihi pendidikan', 'Selisih TPAK laki-laki dan perempuan rata-rata ' + nf(ST.tpak_gap_mean, 1) + ' poin persen, dan hanya ' + ST.n_tpak_p_gt_l + ' kabupaten/kota yang TPAK perempuannya lebih tinggi. Pada pendidikan, HLS perempuan melampaui laki-laki di ' + ST.n_hls_p_gt_l + ' kabupaten/kota.', 'multivariat', 'Lihat multivariat'],
    ['Pola mengelompok secara spasial', "Moran's I sebesar " + nf(mI.I, 2) + ' untuk IKG dan ' + nf(mG.I, 2) + ' untuk IPG (' + fmtP(Math.max(mI.p, mG.p)) + '): daerah bernilai mirip cenderung bertetangga, dan pola ini tidak acak secara statistik.', 'geospasial', 'Lihat peta'],
  ].map(f => '<article class="card s3 find"><h3>' + f[0] + '</h3><p>' + f[1] + '</p><button class="btn" data-go="' + f[2] + '">' + f[3] + '</button></article>').join('');

  // cara membaca warna dan nilai
  gd('rampIKG').style.background = 'linear-gradient(90deg,' + IKG_STOPS.join(',') + ')';
  gd('rampIPG').style.background = 'linear-gradient(90deg,' + IPG_STOPS.join(',') + ')';
  gd('rampIKG').nextElementSibling.innerHTML = '<span>' + nf(IKGMIN, 2) + '</span><span>' + nf(IKGMAX, 2) + '</span>';
  gd('rampIPG').nextElementSibling.innerHTML = '<span>' + nf(IPGMIN, 1) + '</span><span>' + nf(IPGMAX, 1) + '</span>';
  gd('readIKG').textContent = 'Skala 0 sampai 1: 0 berarti tidak ada ketimpangan antara perempuan dan laki-laki, 1 berarti ketimpangan maksimum. Pada data ini nilainya ' + nf(IKGMIN, 2) + ' sampai ' + nf(IKGMAX, 2) + ' (median ' + nf(med, 3) + '). Angka 0,5 dipakai dashboard hanya sebagai pembatas deskriptif, bukan standar BPS.';
  gd('readIPG').textContent = 'IPG = IPM perempuan ÷ IPM laki-laki × 100. Nilai 100 berarti IPM perempuan sama dengan laki-laki; di bawah 100 perempuan tertinggal; di atas 100 perempuan lebih tinggi. Pada data ini ' + nf(IPGMIN, 1) + ' sampai ' + nf(IPGMAX, 1) + ' (median ' + nf(medG, 1) + ').';
  gd('readPal').textContent = 'Kedua palet bersifat sekuensial dengan kecerahan menurun monoton, sehingga urutan nilai tetap terbaca bila warna sulit dibedakan. Hue IKG (krem ke plum) dan IPG (teal) sengaja berbeda agar tidak tertukar. Kategori wilayah memakai delapan warna yang dioptimalkan bagi penderita buta warna merah-hijau (Wong, 2011) dan bentuk penanda berbeda. Keterangan ini berlaku di seluruh halaman.';
  const rk = gd('regionKey'); REGIONS.forEach(r => rk.appendChild(regionChip(r, false)));

  // metadata
  const miss = '<span class="missing">Belum diisi</span>';
  const row = (k, v) => '<tr><th>' + k + '</th><td>' + (v ? esc(v) : miss) + '</td></tr>';
  gd('metaTable').innerHTML =
    row('Sumber', META.sumber) + row('Tahun data', META.tahunData) + row('Judul tabel/publikasi', META.judulTabel) +
    row('URL tabel/publikasi', META.url) + row('Tanggal akses', META.tanggalAkses) +
    row('Satuan PDRB', META.pdrbCatatan) +
    '<tr><th>Cakupan</th><td>' + ST.n + ' kabupaten/kota, ' + ST.n_prov + ' provinsi</td></tr>' +
    '<tr><th>Data pendukung</th><td>Batas kabupaten/kota digital (non-BPS), digabung lewat kode kab/kota dan disederhanakan 0,01 derajat dengan topologi dijaga.</td></tr>' +
    '<tr><th>Pra-pemrosesan</th><td>Skrip <code>scripts/prepare_data.py</code> di repositori: selisih laki-laki dikurangi perempuan, standardisasi, PCA, UMAP, kelompok HDBSCAN, dan batas kelas peta.</td></tr>';

  // identitas pembuat
  const idn = META.identitas, idv = v => v ? esc(v) : miss;
  gd('idList').innerHTML = '<dt>Nama</dt><dd>' + idv(idn.nama) + '</dd><dt>NIM</dt><dd>' + idv(idn.nim) + '</dd><dt>Kelas</dt><dd>' + idv(idn.kelas) + '</dd>' +
    '<dt>Tugas</dt><dd style="font-size:.88rem">UAS Visualisasi Data dan Informasi, Semester Genap TA. 2025/2026, Politeknik Statistika STIS</dd>';
  const av = gd('avatar');
  av.innerHTML = '<div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-5.4 7.5-5.4s6.7 1.8 7.5 5.4"/></svg>Foto</div>';
  if (META.foto) {
    const im = new Image(); im.alt = 'Foto ' + (idn.nama || 'pembuat dashboard');
    im.onload = () => { av.classList.add('has'); av.innerHTML = ''; av.appendChild(im); };
    im.src = META.foto;
  }

  // istilah dan indikator: definisi operasional dan satuan
  const dt = rows => '<div class="tscroll"><table class="def"><thead><tr><th>Variabel</th><th>Definisi operasional</th><th>Satuan</th></tr></thead><tbody>' +
    rows.map(r => '<tr><th scope="row">' + r[0] + '</th><td data-l="Definisi">' + r[1] + '</td><td data-l="Satuan">' + r[2] + '</td></tr>').join('') + '</tbody></table></div>';
  const MV = {
    RLS_LP: ['Rata-rata lama sekolah penduduk usia 25 tahun ke atas: rata-rata jumlah tahun yang dijalani dalam pendidikan formal, laki-laki dan perempuan gabungan.', 'tahun'],
    'RLS_L-P': ['RLS laki-laki dikurangi RLS perempuan. Positif berarti laki-laki lebih tinggi.', 'tahun'],
    HLS_LP: ['Harapan lama sekolah anak usia 7 tahun: lamanya sekolah yang diharapkan akan dijalani anak pada usia tersebut di masa mendatang, laki-laki dan perempuan gabungan.', 'tahun'],
    'HLS_L-P': ['HLS laki-laki dikurangi HLS perempuan. Positif berarti laki-laki lebih tinggi.', 'tahun'],
    TPT_LP: ['Tingkat pengangguran terbuka: persentase penganggur terhadap angkatan kerja, laki-laki dan perempuan gabungan.', 'persen'],
    'TPT_L-P': ['TPT laki-laki dikurangi TPT perempuan. Negatif berarti pengangguran perempuan lebih tinggi.', 'poin persen'],
    TPAK_LP: ['Tingkat partisipasi angkatan kerja: persentase angkatan kerja terhadap penduduk usia kerja (15 tahun ke atas), laki-laki dan perempuan gabungan.', 'persen'],
    'TPAK_L-P': ['TPAK laki-laki dikurangi TPAK perempuan. Positif berarti partisipasi laki-laki lebih tinggi.', 'poin persen'],
    UHH_LP: ['Umur harapan hidup saat lahir: rata-rata perkiraan jumlah tahun yang dapat dijalani seseorang sejak lahir, laki-laki dan perempuan gabungan.', 'tahun'],
    'UHH_L-P': ['UHH laki-laki dikurangi UHH perempuan. Negatif berarti perempuan berumur harapan lebih panjang.', 'tahun'],
  };
  gd('glossary').innerHTML =
    '<details open><summary>Indikator utama: IKG dan IPG</summary>' + dt([
      ['IKG<br><small>Indeks Ketimpangan Gender</small>', 'Indeks komposit ketimpangan capaian perempuan dan laki-laki pada tiga dimensi: kesehatan reproduksi, pemberdayaan, dan pasar tenaga kerja. Mengadaptasi Gender Inequality Index (GII) UNDP. Nilai 0 berarti setara sepenuhnya, nilai 1 berarti ketimpangan sempurna.', 'indeks, skala 0 sampai 1 (tanpa satuan)'],
      ['IPG<br><small>Indeks Pembangunan Gender</small>', 'IPG = (IPM perempuan ÷ IPM laki-laki) × 100. Nilai 100 berarti IPM perempuan sama dengan laki-laki; di bawah 100 perempuan tertinggal; di atas 100 perempuan lebih tinggi.', 'indeks (rasio × 100, tanpa satuan)'],
    ]) + '</details>' +
    '<details><summary>Variabel multivariat (10 variabel)</summary>' + dt(PCF.map(f => [LAB[f], MV[f][0], MV[f][1]])) +
    '<p class="defnote">Akhiran: <b>total</b> adalah nilai laki-laki dan perempuan gabungan (kode _LP); <b>selisih</b> adalah nilai laki-laki dikurangi perempuan (L−P). Seluruh variabel distandardisasi (z-score) sebelum PCA dan UMAP.</p></details>' +
    '<details><summary>Variabel lainnya: IPM, PDRB, dan penduduk</summary>' + dt([
      ['IPM<br><small>Indeks Pembangunan Manusia</small>', 'Ringkasan capaian tiga dimensi dasar: umur panjang dan sehat (UHH), pengetahuan (HLS dan RLS), serta standar hidup layak (pengeluaran per kapita disesuaikan). Tersedia untuk laki-laki, perempuan, dan gabungan. Pembentuk IPG.', 'indeks, skala 0 sampai 100 (poin)'],
      ['PDRB', 'Produk Domestik Regional Bruto kabupaten/kota: nilai tambah bruto seluruh kegiatan ekonomi di wilayah tersebut. Menentukan luas lingkaran pada peta dan ukuran bidang pada Hierarki.', esc(META.pdrbCatatan)],
      ['Penduduk', 'Jumlah penduduk kabupaten/kota. Menentukan ukuran bidang pada Hierarki dan bobot rata-rata simpul induk.', 'jiwa'],
    ]) + '</details>';

  // batasan dan rujukan
  const ref = (t, u) => '<li>' + t + ' <a href="' + u + '" target="_blank" rel="noopener">' + u + '</a></li>';
  gd('limits').innerHTML =
    '<details open><summary>Batasan analisis</summary><ul class="clean">' +
    '<li>Data bersifat lintas wilayah pada satu periode. Pola yang tampak adalah asosiasi, bukan sebab akibat.</li>' +
    '<li>Variabel Selisih dan Total berasal dari angka dasar yang sama, sehingga saling bergantung secara struktural. Korelasi dan komponen utama perlu dibaca dengan memperhitungkan hal ini.</li>' +
    '<li>PCA bersifat linear dan peka pencilan. UMAP menjaga ketetanggaan lokal; jarak antargugus dan ukuran gugus tidak bermakna sebagai besaran perbedaan.</li>' +
    '<li>Warna simpul induk pada Hierarki adalah rata-rata IKG atau IPG tertimbang ukuran terpilih, bukan angka resmi tingkat provinsi atau wilayah.</li>' +
    '<li>Pada choropleth, wilayah luas berpenduduk sedikit tampak dominan. Simbol proporsional dan treemap berukuran penduduk mengoreksi sebagian bias ini.</li>' +
    '<li>Batas wilayah disederhanakan untuk performa dan tidak boleh dipakai mengukur luas.</li>' +
    '<li>Moran\'s I memakai bobot k-NN (k = 8) pada titik pusat karena banyak kabupaten/kota berupa pulau tanpa tetangga berbatasan. Pada fokus wilayah, tetangga hanya dicari di dalam wilayah itu.</li></ul></details>' +
    '<details><summary>Rujukan</summary><ol class="refs">' +
    ref('Badan Pusat Statistik. (2023, 15 November). <i>Indeks Pembangunan Manusia (IPM) Indonesia tahun 2023 mencapai 74,39, meningkat 0,62 poin (0,84 persen) dibandingkan tahun sebelumnya (73,77)</i> [Berita Resmi Statistik].', 'https://www.bps.go.id/id/pressrelease/2023/11/15/2033/indeks-pembangunan-manusia--ipm--indonesia-tahun-2023-mencapai-74-39--meningkat-0-62-poin--0-84-persen--dibandingkan-tahun-sebelumnya--73-77--.html') +
    ref('Badan Pusat Statistik. (2024). <i>Indeks Pembangunan Manusia 2023</i> (No. Publikasi 07300.24008). BPS.', 'https://www.bps.go.id/en/publication/2024/05/13/8f77e73a66a6f484c655985a/indeks-pembangunan-manusia-2023.html') +
    ref('Badan Pusat Statistik. (2025, 5 Mei). <i>Indeks Ketimpangan Gender (IKG) Indonesia konsisten mengalami penurunan menjadi 0,421, menunjukkan perbaikan dalam kesetaraan gender</i> [Berita Resmi Statistik].', 'https://www.bps.go.id/id/pressrelease/2025/05/05/2430/indeks-ketimpangan-gender-ikg-indonesia-konsisten-mengalami-penurunan-menjadi-0-421-menunjukkan-perbaikan-dalam-kesetaraan-gender') +
    ref('Campello, R. J. G. B., Moulavi, D., Zimek, A., &amp; Sander, J. (2015). Hierarchical density estimates for data clustering, visualization, and outlier detection. <i>ACM Transactions on Knowledge Discovery from Data, 10</i>(1), 1–51.', 'https://doi.org/10.1145/2733381') +
    ref('McInnes, L., Healy, J., Saul, N., &amp; Großberger, L. (2018). UMAP: Uniform manifold approximation and projection. <i>Journal of Open Source Software, 3</i>(29), 861.', 'https://doi.org/10.21105/joss.00861') +
    ref('Moran, P. A. P. (1950). Notes on continuous stochastic phenomena. <i>Biometrika, 37</i>(1–2), 17–23.', 'https://doi.org/10.1093/biomet/37.1-2.17') +
    ref('Shneiderman, B. (1992). Tree visualization with tree-maps: 2-d space-filling approach. <i>ACM Transactions on Graphics, 11</i>(1), 92–99.', 'https://doi.org/10.1145/102377.115768') +
    ref('Wong, B. (2011). Points of view: Color blindness. <i>Nature Methods, 8</i>(6), 441.', 'https://doi.org/10.1038/nmeth.1618') +
    '</ol></details>';
}

/* ============================================================================
 * MULTIVARIAT
 * ========================================================================== */
const S = { regions: new Set(), brush: null, pc: null, parRanges: {} };
const UI = { proj: 'pca', colorBy: 'region', mode: isTouch ? 'view' : 'select' };
const DRAG = { select: 'lasso', zoom: 'zoom', view: false };
const NORM = {}; PCF.forEach(f => { const v = stat(f); NORM[f] = [Math.min(...v), Math.max(...v)]; });
const normv = (r, f) => (r[f] - NORM[f][0]) / (NORM[f][1] - NORM[f][0]);
const REGIDX = R.map(r => REGIONS.indexOf(r.Wilayah));
let MASK = null;
const quiet = { on: false };
function hush(ms) { quiet.on = true; setTimeout(() => { quiet.on = false; }, ms || 500); }

function combined() {
  if (!S.regions.size && !S.brush && !S.pc) return null;
  const m = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    m[i] = (!S.regions.size || S.regions.has(R[i].Wilayah)) && (!S.brush || S.brush.has(i)) && (!S.pc || S.pc.has(i)) ? 1 : 0;
  }
  return m;
}
const selIdx = m => m ? R.filter(r => m[r.i]).map(r => r.i) : null;

function multiKpis() {
  const idx = MASK ? selIdx(MASK) : R.map(r => r.i);
  const rows = idx.map(i => R[i]);
  const m = f => rows.length ? mean(rows.map(r => r[f])) : NaN;
  const all = f => mean(R.map(r => r[f]));
  const d = (f, dec) => { const v = m(f) - all(f); return (v >= 0 ? '+' : '\u2212') + nf(Math.abs(v), dec); };
  const cells = rows.length ? [
    [ni(rows.length) + ' dari ' + ni(N), MASK ? 'kabupaten/kota terpilih' : 'kabupaten/kota (tanpa seleksi)'],
    [nf(m('IKG'), 3), 'rata-rata IKG' + (MASK ? ', selisih terhadap nasional ' + d('IKG', 3) : '')],
    [nf(m('IPG'), 1), 'rata-rata IPG' + (MASK ? ', selisih ' + d('IPG', 1) : '')],
    [nf(m('TPAK_L-P'), 1), 'rata-rata selisih TPAK (poin persen)' + (MASK ? ', selisih ' + d('TPAK_L-P', 1) : '')],
  ] : [['0 dari ' + ni(N), 'Tidak ada kabupaten/kota pada irisan seleksi. Hapus sebagian pilihan.'], ['', ''], ['', ''], ['', '']];
  gd('selKpis').innerHTML = cells.map(c => '<div class="kpi"><div class="v">' + c[0] + '</div><div class="k">' + c[1] + '</div></div>').join('');
  $$('#regionChips .chip').forEach(c => c.setAttribute('aria-pressed', S.regions.has(c.dataset.r)));
}

function refreshViews() {
  MASK = combined();
  const idx = selIdx(MASK);
  ['plotProj', 'plotSplom'].forEach(id => { if (gd(id).data) Plotly.restyle(gd(id), { selectedpoints: [idx] }, [0]); });
  if (gd('plotPar').data) Plotly.restyle(gd('plotPar'), { 'line.color': [parColors()] }, [0]);
  if (gd('plotRadar').data) drawRadar();
  multiKpis();
}

function parColors() { return R.map(r => (MASK && !MASK[r.i]) ? 6.5 : REGIDX[r.i] + 0.5); }

function projCoords() { return UI.proj === 'pca' ? [stat('PC1'), stat('PC2')] : [stat('UMAP1'), stat('UMAP2')]; }

function drawProj() {
  hush();
  const [x, y] = projCoords();
  const byIKG = UI.colorBy === 'ikg';
  const marker = { size: narrow() ? 8 : 9, symbol: R.map(r => RSYM[r.Wilayah]), line: { width: .8, color: '#fff' },
    color: byIKG ? stat('IKG') : R.map(r => RCOL[r.Wilayah]) };
  if (byIKG) Object.assign(marker, { colorscale: plScale(IKG_STOPS), cmin: IKGMIN, cmax: IKGMAX, showscale: true,
    colorbar: { orientation: 'h', thickness: 10, lenmode: 'pixels', len: narrow() ? 200 : 260, x: .5, xref: 'paper', xanchor: 'center', y: 0, yref: 'container', yanchor: 'bottom', ypad: 8,
      title: { text: 'IKG<br> ', side: 'top', font: { size: 11 } }, tickfont: { size: 10 }, outlinewidth: 0 } });
  const tr = { type: 'scatter', mode: 'markers', x, y, text: R.map(r => r.Kabupaten),
    customdata: R.map(r => [r.prov, r.wil, r.IKG, r.IPG, r.umap_grp ? ' | ' + r.umap_grp : '']),
    hovertemplate: '<b>%{text}</b><br>%{customdata[0]} (%{customdata[1]})<br>IKG %{customdata[2]:.3f}, IPG %{customdata[3]:.2f}' + (UI.proj === 'umap' ? '%{customdata[4]}' : '') + '<extra></extra>',
    marker, selectedpoints: selIdx(MASK), selected: { marker: { opacity: 1 } }, unselected: { marker: { opacity: .13 } } };
  const ann = UI.proj === 'umap' ? ST.umap.groups.map(g => ({ x: g.cx, y: g.cy, text: '<b>' + g.label + '</b>', showarrow: false, font: { size: 12, color: INK },
      bgcolor: 'rgba(255,255,255,.86)', bordercolor: INK, borderwidth: 1, borderpad: 2 }))
    : ST.outliers.slice(0, 5).map(o => { const i = R.find(r => r.Kabupaten === o.name).i;
    return { x: x[i], y: y[i], text: o.name, showarrow: false, yshift: 12, font: { size: 10, color: INK }, bgcolor: 'rgba(255,255,255,.7)' }; });
  const xl = UI.proj === 'pca' ? 'PC1 (' + pct(ST.ev[0]) + '% varians)' : 'UMAP 1 (tanpa satuan)';
  const yl = UI.proj === 'pca' ? 'PC2 (' + pct(ST.ev[1]) + '% varians)' : 'UMAP 2 (tanpa satuan)';
  draw('plotProj', [tr], baseLayout({
    xaxis: axisStyle({ title: { text: xl, font: { size: 12 } } }), yaxis: axisStyle({ title: { text: yl, font: { size: 12 } } }),
    dragmode: DRAG[UI.mode], clickmode: 'event+select', annotations: ann, margin: { l: 56, r: 14, t: 10, b: byIKG ? 132 : 48 },
  }));
  bindSelect('plotProj', 'pointIndex');
  gd('projSub').textContent = UI.proj === 'pca'
    ? 'PC1 dan PC2 menangkap ' + pct(ST.cum_ev[1]) + '% varians. Jarak dekat berarti profil mirip. Label menandai lima kabupaten/kota dengan jarak terstandar terbesar (PC1 sampai PC5).'
    : 'UMAP menjaga ketetanggaan lokal, bukan jarak global. Gunakan untuk melihat kelompok, bukan untuk membandingkan jarak antarkelompok. Label G1 sampai G7 menandai kelompok padat.';
}

function bindSelect(id, key) {
  const el = gd(id); if (el._sel) return; el._sel = true;
  el.on('plotly_selected', ev => {
    if (quiet.on || !ev || !ev.points) return;
    const set = new Set(ev.points.map(p => p[key] !== undefined ? p[key] : p.pointNumber));
    S.brush = set.size ? set : null; refreshViews();
  });
  el.on('plotly_deselect', () => { if (quiet.on) return; S.brush = null; refreshViews(); });
}

function drawScree() {
  const k = ST.ev.map((_, i) => 'PC' + (i + 1));
  const bars = { type: 'bar', x: k, y: ST.ev.map(v => v * 100), marker: { color: BRAND, opacity: .85 }, name: 'Per komponen',
    text: ST.ev.map(v => nf(v * 100, 1)), textposition: 'outside', textfont: { size: 10 }, cliponaxis: false,
    hovertemplate: '%{x}: %{y:.2f}%<extra></extra>' };
  const line = { type: 'scatter', mode: 'lines+markers', x: k, y: ST.cum_ev.map(v => v * 100), name: 'Kumulatif',
    line: { color: INK, width: 2 }, marker: { color: INK, size: 6 }, hovertemplate: 'Kumulatif s.d. %{x}: %{y:.1f}%<extra></extra>' };
  draw('plotScree', [bars, line], baseLayout({
    xaxis: axisStyle({ title: { text: 'Komponen utama', font: { size: 12 } }, tickangle: narrow() ? -45 : 0 }),
    yaxis: axisStyle({ title: { text: 'Varians dijelaskan (%)', font: { size: 12 } }, range: [0, 108] }),
    shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 80, y1: 80, line: { color: MUTED, dash: 'dash', width: 1.2 } }],
    annotations: [{ xref: 'paper', x: .01, y: 80, yshift: 9, text: 'ambang 80%', showarrow: false, xanchor: 'left', font: { size: 10, color: MUTED } }],
    margin: { l: 52, r: 10, t: 14, b: 50 },
  }));
  const c = ST.cum_ev, k80 = c.findIndex(v => v >= .8) + 1;
  gd('screeNote').innerHTML = k80 + ' komponen pertama mencapai ' + pct(c[k80 - 1]) + '% varians dan melewati ambang 80%, sedangkan ' + (k80 - 1) + ' komponen baru ' + pct(c[k80 - 2]) + '%. Dua komponen pertama hanya ' + pct(c[1]) + '%, sehingga diagram dua dimensi memuat kurang dari separuh informasi.';
}

function drawPar() {
  const colors = REGIONS.map(r => RCOL[r]).concat([GREY_OFF]);
  const cs = []; colors.forEach((c, i) => { cs.push([i / 7, c], [(i + 1) / 7, c]); });
  const dims = PCF.map((f, k) => {
    const d = { label: LAB[f], values: stat(f) };
    if (S.parRanges[k]) d.constraintrange = S.parRanges[k];
    return d;
  });
  const tr = { type: 'parcoords', line: { color: parColors(), colorscale: cs, cmin: 0, cmax: 7, showscale: false },
    dimensions: dims, labelangle: narrow() ? -40 : -18, labelside: 'top', labelfont: { size: narrow() ? 10 : 12, family: FF }, tickfont: { size: 10, family: FF }, rangefont: { size: 10, family: FF } };
  draw('plotPar', [tr], baseLayout({ margin: { l: 36, r: 36, t: 74, b: 20 } }));
  const el = gd('plotPar');
  if (!el._pb) {
    el._pb = true;
    el.on('plotly_restyle', ev => {
      if (!ev || !ev[0]) return;
      let touched = false;
      Object.keys(ev[0]).forEach(key => {
        const m = key.match(/^dimensions\[(\d+)\]\.constraintrange$/);
        if (!m) return; touched = true;
        let v = ev[0][key]; v = Array.isArray(v) ? v[0] : v;
        if (!v || !v.length) delete S.parRanges[+m[1]];
        else S.parRanges[+m[1]] = (typeof v[0] === 'number') ? [v] : v;
      });
      if (!touched) return;
      const keys = Object.keys(S.parRanges);
      if (!keys.length) S.pc = null;
      else {
        S.pc = new Set(R.filter(r => keys.every(k => S.parRanges[k].some(([lo, hi]) => r[PCF[k]] >= lo && r[PCF[k]] <= hi))).map(r => r.i));
      }
      refreshViews();
    });
  }
}

function drawHeat() {
  const o = D.corr_order, z = o.map(a => o.map(b => D.corr[b][a]));
  const lab = o.map(f => LAB[f]);
  const tr = { type: 'heatmap', x: lab, y: lab, z, zmin: -1, zmax: 1, colorscale: DIV_SCALE, xgap: 1, ygap: 1,
    text: z.map(r => r.map(v => nf(v, 2))), texttemplate: narrow() ? '' : '%{text}', textfont: { size: 10 },
    hovertemplate: '%{y} dan %{x}<br>r = %{z:.2f}<extra></extra>',
    colorbar: { thickness: 10, len: .85, tickfont: { size: 10 }, outlinewidth: 0, title: { text: 'r', side: 'top' } } };
  draw('plotHeat', [tr], baseLayout({
    xaxis: axisStyle({ tickangle: -40, showgrid: false, tickfont: { size: 10 } }),
    yaxis: axisStyle({ autorange: 'reversed', showgrid: false, tickfont: { size: 10 } }),
    margin: { l: 90, r: 10, t: 8, b: 92 }, dragmode: false }));
}

function drawRadar() {
  const th = PCF.map(f => LAB[f]); const thc = th.concat([th[0]]);
  const traces = REGIONS.map(reg => {
    const rows = R.filter(r => r.Wilayah === reg);
    const v = PCF.map(f => mean(rows.map(r => normv(r, f)))); v.push(v[0]);
    const dim = S.regions.size && !S.regions.has(reg);
    return { type: 'scatterpolar', r: v, theta: thc, name: pretty(reg), mode: 'lines+markers',
      line: { color: RCOL[reg], width: dim ? 1.2 : 2.6 }, marker: { color: RCOL[reg], size: 5, symbol: RSYM[reg] },
      fill: 'toself', fillcolor: RCOL[reg], opacity: dim ? .25 : .95, hovertemplate: '<b>' + pretty(reg) + '</b><br>%{theta}: %{r:.2f}<extra></extra>' };
  });
  traces.forEach(t => { t.fillcolor = t.line.color; t.fill = 'toself'; t.opacity = t.opacity; });
  // transparansi isi: gunakan rgba
  traces.forEach(t => { const [r, g, b] = hex2rgb(t.line.color); t.fillcolor = 'rgba(' + r + ',' + g + ',' + b + ',.04)'; });
  if (MASK) {
    const rows = R.filter(r => MASK[r.i]);
    if (rows.length) {
      const v = PCF.map(f => mean(rows.map(r => normv(r, f)))); v.push(v[0]);
      traces.push({ type: 'scatterpolar', r: v, theta: thc, name: 'Pilihan aktif', mode: 'lines', line: { color: INK, width: 3, dash: 'dash' },
        hovertemplate: '<b>Pilihan aktif (' + rows.length + ')</b><br>%{theta}: %{r:.2f}<extra></extra>' });
    }
  }
  draw('plotRadar', traces, baseLayout({
    polar: { radialaxis: { range: [0, 1], tickvals: [0, .5, 1], tickfont: { size: 9 }, gridcolor: GRID, linecolor: LINE }, angularaxis: { tickfont: { size: narrow() ? 9 : 10.5 }, direction: 'clockwise', gridcolor: GRID, linecolor: LINE }, bgcolor: 'rgba(0,0,0,0)' },
    margin: { l: narrow() ? 38 : 64, r: narrow() ? 38 : 64, t: 24, b: 24 }, dragmode: false }));
}

function drawSplom() {
  hush();
  const dims = [1, 2, 3, 4, 5].map(k => ({ label: 'PC' + k + '<br>' + pct(ST.ev[k - 1], 0) + '%', values: stat('PC' + k) }));
  const tr = { type: 'splom', dimensions: dims, text: R.map(r => r.Kabupaten + ' (' + r.prov + ')'),
    marker: { color: R.map(r => RCOL[r.Wilayah]), symbol: R.map(r => RSYM[r.Wilayah]), size: 5, line: { width: .4, color: '#fff' } },
    diagonal: { visible: false }, showupperhalf: false, hovertemplate: '%{text}<extra></extra>',
    selectedpoints: selIdx(MASK), selected: { marker: { opacity: 1 } }, unselected: { marker: { opacity: .12 } } };
  const ax = { gridcolor: GRID, zerolinecolor: '#C5D0D7', linecolor: LINE, tickfont: { size: 9 }, titlefont: { size: 10 } };
  draw('plotSplom', [tr], baseLayout({ xaxis: ax, yaxis: ax, xaxis2: ax, yaxis2: ax, xaxis3: ax, yaxis3: ax, xaxis4: ax, yaxis4: ax, xaxis5: ax, yaxis5: ax,
    dragmode: DRAG[UI.mode] || false, margin: { l: 48, r: 10, t: 10, b: 44 } }));
  bindSelect('plotSplom', 'pointNumber');
}

function drawLoad() {
  const f = PCF, pcs = ['PC1', 'PC2', 'PC3', 'PC4', 'PC5'];
  const z = f.map(k => D.loadings[k]);
  const tr = { type: 'heatmap', x: pcs.map((p, i) => p + ' (' + pct(ST.ev[i], 0) + '%)'), y: f.map(k => LAB[k]), z, zmin: -.85, zmax: .85, colorscale: DIV_SCALE, xgap: 1, ygap: 1,
    text: z.map(r => r.map(v => nf(v, 2))), texttemplate: '%{text}', textfont: { size: 10 },
    hovertemplate: '%{y} pada %{x}<br>loading %{z:.3f}<extra></extra>', colorbar: { thickness: 10, len: .85, tickfont: { size: 10 }, outlinewidth: 0 } };
  draw('plotLoad', [tr], baseLayout({ xaxis: axisStyle({ side: 'top', showgrid: false, tickfont: { size: 10 } }), yaxis: axisStyle({ autorange: 'reversed', showgrid: false, tickfont: { size: 10 } }),
    margin: { l: 84, r: 10, t: 46, b: 10 }, dragmode: false }));
}

function multiInsight() {
  const top = (pc, n) => Object.entries(D.loadings).map(([f, v]) => [f, v[pc]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n)
    .map(([f, v]) => LAB[f] + ' (' + (v > 0 ? '+' : '−') + nf(Math.abs(v), 2) + ')').join(', ');
  const reg = Object.fromEntries(ST.by_region.map(r => [r.Wilayah, r]));
  const c = ST.corr_top.map(t => LAB[t.a] + ' dan ' + LAB[t.b] + ' (r = ' + nf(t.r, 2) + ')');
  const out = ST.outliers.map(o => o.name + ' (' + pretty(o.prov) + ')').join(', ');
  const nPapua = ST.outliers.filter(o => /PAPUA/.test(o.prov)).length;
  const tg = R.slice().sort((a, b) => a['TPT_L-P'] - b['TPT_L-P'])[0];
  gd('multiInsight').innerHTML =
    '<ul class="clean">' +
    '<li><span class="tag fakta">Fakta</span>Komponen terkuat PC1 (' + pct(ST.ev[0]) + '% varians) dibentuk oleh ' + top(0, 5) + '. PC2 (' + pct(ST.ev[1]) + '%) oleh ' + top(1, 4) + '.</li>' +
    '<li><span class="tag fakta">Fakta</span>Korelasi absolut terbesar: ' + c.join('; ') + '.</li>' +
    '<li><span class="tag fakta">Fakta</span>Rata-rata IKG kabupaten/kota: Maluku & Papua ' + nf(reg['MALUKU & PAPUA'].ikg, 3) + ', Kalimantan ' + nf(reg['KALIMANTAN'].ikg, 3) + ', Bali & Nusra ' + nf(reg['BALI & NUSRA'].ikg, 3) + ', Sumatera ' + nf(reg['SUMATERA'].ikg, 3) + ', Sulawesi ' + nf(reg['SULAWESI'].ikg, 3) + ', Jawa ' + nf(reg['JAWA'].ikg, 3) + '. Gunakan chip wilayah untuk melihat posisi tiap kelompok pada seluruh diagram.</li>' +
    '<li><span class="tag fakta">Pencilan</span>Jarak terstandar terbesar pada PC1 sampai PC5: ' + out + '. ' + nPapua + ' dari ' + ST.outliers.length + ' berada di provinsi Papua, wilayah dengan rata-rata IKG tertinggi (halaman Home). Selisih TPT terendah dari ' + N + ' kabupaten/kota tercatat di ' + tg.Kabupaten + ' (' + nf(tg['TPT_L-P'], 2).replace('-', '\u2212') + ' poin persen, TPT perempuan jauh di atas laki-laki).</li>' +
    '<li><span class="tag catatan">Catatan</span>Karena PCA dihitung dari variabel yang telah distandardisasi, satu nilai ekstrem dapat memengaruhi arah komponen. Nilai pencilan sebaiknya dicek ke sumber BPS sebelum ditafsirkan sebagai fenomena nyata, terutama pada kabupaten/kota yang menyimpang dari pola provinsinya.</li></ul>';
}

const POSNEG = (pc, min) => {
  const e = Object.entries(D.loadings).map(([f, v]) => [f, v[pc]]);
  const fmt = ([f, v]) => LAB[f] + ' (' + (v > 0 ? '+' : '\u2212') + nf(Math.abs(v), 2) + ')';
  return [e.filter(x => x[1] >= min).sort((a, b) => b[1] - a[1]).slice(0, 4).map(fmt).join(', ') || 'tidak ada',
          e.filter(x => x[1] <= -min).sort((a, b) => a[1] - b[1]).slice(0, 4).map(fmt).join(', ') || 'tidak ada'];
};
function pcInterp() {
  const sg = v => (v >= 0 ? '+' : '\u2212') + nf(Math.abs(v), 2);
  const tg = stat('TPT_L-P'), tmin = Math.min(...tg), tmax = Math.max(...tg);
  const TAF = [
    'Poros capaian: pendidikan, umur harapan hidup, dan pengangguran tinggi di satu ujung; partisipasi kerja total tinggi dengan selisih TPAK kecil dan selisih RLS laki-laki atas perempuan lebar di ujung lain. Variabel tidak memuat sektor lapangan kerja atau status desa-kota, sehingga sebab pola ini tidak dapat ditentukan.',
    'Poros kesenjangan pasar kerja gender: selisih TPAK laki-laki dan perempuan lebar disertai partisipasi total rendah, sementara TPT perempuan relatif lebih tinggi dari laki-laki. Komponen ini paling terkait dengan IKG (ρ = ' + sg(ST.pc_ikg.PC2) + '), tetapi TPAK merupakan indikator dimensi pasar tenaga kerja IKG, sehingga sebagian keterkaitan bersifat konstruksi indeks dan bukan temuan independen.',
    'Poros kesenjangan pendidikan gender: HLS dan RLS laki-laki melampaui perempuan, disertai TPT total tinggi. Berkorelasi negatif dengan IPG (ρ = ' + sg(ST.pc_ipg.PC3) + '), sejalan dengan IPG sebagai rasio IPM perempuan terhadap laki-laki.',
    'Kontras campuran: selisih UHH yang kecil (keunggulan UHH perempuan sempit) dan UHH total rendah berpasangan dengan RLS dan HLS total tinggi. Korelasinya dengan IKG dan IPG mendekati nol (ρ = ' + sg(ST.pc_ikg.PC4) + ' dan ' + sg(ST.pc_ipg.PC4) + '), sehingga poros ini hampir tidak berkaitan dengan ketimpangan gender dan sulit dibaca sebagai satu konsep.',
    'Hampir seluruhnya selisih TPT gender: skor tinggi berarti TPT laki-laki melampaui perempuan. Korelasi dengan IKG lemah (ρ = ' + sg(ST.pc_ikg.PC5) + '). Selisih TPT berekor panjang (rentang ' + nf(tmin, 2).replace('-', '\u2212') + ' sampai ' + nf(tmax, 2) + ' poin persen), sehingga komponen ini peka terhadap sedikit nilai ekstrem.',
  ];
  const reg = Object.fromEntries(ST.pc_region.map(r => [r.Wilayah, r]));
  gd('pcInterp').innerHTML = [0, 1, 2, 3, 4].map(k => {
    const pc = 'PC' + (k + 1), [pos, neg] = POSNEG(k, .25);
    const rs = REGIONS.map(r => [r, reg[r][pc]]).sort((a, b) => b[1] - a[1]);
    const hi = rs[0], lo = rs[rs.length - 1];
    return '<div class="pcbox"><h4>' + pc + '<small>' + pct(ST.ev[k]) + '% varians, kumulatif ' + pct(ST.cum_ev[k]) + '%</small></h4>' +
      '<p><span class="tag fakta">Fakta</span>Kutub positif: ' + pos + '. Kutub negatif: ' + neg + '.</p>' +
      '<p><span class="tag fakta">Fakta</span>Skor rata-rata wilayah tertinggi ' + pretty(hi[0]) + ' (' + sg(hi[1]) + '), terendah ' + pretty(lo[0]) + ' (' + sg(lo[1]) + '). Korelasi dengan IKG ρ = ' + sg(ST.pc_ikg[pc]) + ', dengan IPG ρ = ' + sg(ST.pc_ipg[pc]) + '.</p>' +
      '<p><span class="tag inferensi">Inferensi</span>' + TAF[k] + '</p></div>';
  }).join('') +
  '<div class="pcbox" style="grid-column:1/-1"><p><span class="tag catatan">Catatan</span>Lima komponen memuat ' + pct(ST.cum_ev[4]) + '% varians, sehingga ' + nf(100 - ST.cum_ev[4] * 100, 1) + '% informasi tidak terwakili. Komponen ke-3 sampai ke-5 masing-masing di bawah 14% varians dan lebih peka terhadap pencilan. Tafsir di atas adalah hipotesis kerja, bukan hasil uji kausal.</p></div>';
}

function umapInterp() {
  const U = ST.umap, G_ = U.groups, sg = v => (v >= 0 ? '+' : '\u2212') + nf(Math.abs(v), 2);
  const top = (o, n) => Object.entries(o).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n).map(([f, v]) => LAB[f] + ' (ρ ' + sg(v) + ')').join(', ');
  const nIn = G_.reduce((s_, g) => s_ + g.n, 0);
  const ext = (key, g) => { const v = G_.map(x => x[key]); return g[key] === Math.max(...v) ? 'tertinggi' : g[key] === Math.min(...v) ? 'terendah' : ''; };
  const KEYS = [['tpak_lp', 'TPAK total', '%'], ['tpak_gap', 'selisih TPAK', ' poin'], ['rls_lp', 'RLS total', ' tahun'], ['tpt_lp', 'TPT total', '%'], ['uhh_lp', 'UHH total', ' tahun'], ['ipg', 'IPG', '']];
  const desc = (g, tg) => {
    const ex = KEYS.map(([k, nm, u]) => ext(k, g) ? nm + ' ' + ext(k, g) + ' (' + nf(g[k], 1) + u + ')' : '').filter(Boolean);
    return '<b>' + g.label + '</b> (n = ' + g.n + '; ' + nf(g.top_share * 100, 0) + '% ' + pretty(g.top_reg) + ') ber-IKG rata-rata ' + nf(g.ikg, 3) + (tg ? ' (' + tg + ' antar kelompok)' : '') + (ex.length ? ', dengan ' + ex.join(', ') : '');
  };
  const gHi = G_.reduce((a, b) => b.ikg > a.ikg ? b : a), gLo = G_.reduce((a, b) => b.ikg < a.ikg ? b : a), gGap = G_.reduce((a, b) => b.tpak_gap > a.tpak_gap ? b : a);
  const gaps = G_.map(g => g.tpak_gap).sort((a, b) => a - b), medGap = gaps[Math.floor(gaps.length / 2)];
  const rows = G_.map(g => '<tr><td><b>' + g.label + '</b></td><td>' + g.n + '</td><td>' + esc(pretty(g.top_reg)) + ' (' + nf(g.top_share * 100, 0) + '%)</td><td>' + nf(g.ikg, 3) + '</td><td>' + nf(g.ipg, 1) + '</td><td>' + nf(g.tpak_lp, 1) + '</td><td>' + nf(g.tpak_gap, 1) + '</td><td>' + nf(g.rls_lp, 1) + '</td><td>' + nf(g.tpt_lp, 1) + '</td><td>' + nf(g.uhh_lp, 1) + '</td></tr>').join('');
  const items = [
    '<li><span class="tag fakta">Fakta</span>Sumbu UMAP tidak bersatuan dan tidak bermakna sendiri. Korelasi peringkat (Spearman) UMAP 1 terkuat dengan ' + top(U.rho_u1, 3) + '; UMAP 2 dengan ' + top(U.rho_u2, 3) + '. Terhadap IKG: UMAP 1 ρ ' + sg(U.rho_u1_ikg) + ', UMAP 2 ρ ' + sg(U.rho_u2_ikg) + '. Arah sumbu dapat berputar atau terbalik pada proyeksi lain. Metode: McInnes et al. (2018).</li>',
    '<li><span class="tag fakta">Fakta</span>Kesetiaan tetangga (trustworthiness, k = 15): UMAP ' + nf(U.trust_umap, 3) + ' berbanding PCA 2 dimensi ' + nf(U.trust_pca2, 3) + '. UMAP lebih baik mempertahankan tetangga terdekat, sedangkan PC1 dan PC2 hanya memuat ' + pct(ST.cum_ev[1]) + '% varians.</li>',
    '<li><span class="tag fakta">Fakta</span>Rata-rata ' + nf(U.purity_umap * 100, 1) + '% dari 10 tetangga terdekat pada UMAP berasal dari wilayah yang sama (' + nf(U.purity_orig * 100, 1) + '% pada ruang asal terstandardisasi; ' + nf(U.purity_base * 100, 1) + '% bila acak sesuai proporsi wilayah). Profil mengelompok menurut wilayah secara moderat, dan lebih dari separuh tetangga berasal dari wilayah lain.</li>',
    '<li><span class="tag fakta">Fakta</span>HDBSCAN (ukuran minimum 15; Campello et al., 2015) menemukan ' + G_.length + ' kelompok padat berisi ' + nIn + ' kab/kota. Sisanya ' + U.n_noise + ' (' + nf(U.n_noise / N * 100, 1) + '%) tidak tergolong kelompok mana pun, sehingga sebagian profil bersifat tersebar atau transisi.<div class="tscroll"><table class="gt"><thead><tr><th>Kelompok</th><th>n</th><th>Wilayah dominan</th><th>IKG</th><th>IPG</th><th>TPAK total</th><th>Selisih TPAK</th><th>RLS</th><th>TPT</th><th>UHH</th></tr></thead><tbody>' + rows + '</tbody></table></div></li>',
    '<li><span class="tag inferensi">Inferensi</span>' + desc(gHi, 'tertinggi') + '.' + (gHi.tpak_gap < medGap ? ' Kelompok ini ber-IKG tertinggi walaupun selisih TPAK-nya di bawah median kelompok. IKG tinggi di sini kemungkinan didorong dimensi yang tidak tercakup 10 variabel (kesehatan reproduksi dan pemberdayaan), dan perlu diperiksa dengan data komponen IKG.' : '') + '</li>',
    '<li><span class="tag inferensi">Inferensi</span>' + desc(gLo, 'terendah') + '.' + (gGap.label !== gLo.label && gGap.label !== gHi.label ? ' Sebagai pembanding, ' + desc(gGap) + '.' : '') + '</li>',
    '<li><span class="tag catatan">Catatan</span>Jarak antarkelompok, ukuran gugus, dan posisi absolut pada UMAP tidak boleh ditafsirkan sebagai besarnya perbedaan. Hasil bergantung pada n_neighbors, min_dist, dan seed. Kelompok HDBSCAN bersifat eksploratif, bukan klasifikasi baku; label G1 sampai G7 mengikuti urutan IKG rata-rata menurun.</li>',
  ];
  gd('umapInterp').innerHTML = '<ul class="clean">' + items.join('') + '</ul>';
}

function initMulti() {
  const ch = gd('regionChips');
  REGIONS.forEach(r => ch.appendChild(regionChip(r, true)));
  ch.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const r = b.dataset.r; S.regions.has(r) ? S.regions.delete(r) : S.regions.add(r);
    refreshViews();
  });
  segBind('modeSeg', v => {
    UI.mode = v;
    ['plotProj', 'plotSplom'].forEach(id => Plotly.relayout(gd(id), { dragmode: DRAG[v] }));
  });
  segSet('modeSeg', UI.mode);
  segBind('projSeg', v => { UI.proj = v; drawProj(); });
  segBind('colSeg', v => { UI.colorBy = v; drawProj(); });
  gd('resetSel').addEventListener('click', () => {
    S.regions.clear(); S.brush = null; S.pc = null; S.parRanges = {};
    drawProj(); drawSplom(); drawPar(); refreshViews();
  });
  MASK = null;
  gd('projJump').addEventListener('click', () => gd(UI.proj === 'pca' ? 'cardPC' : 'cardUMAP').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  drawProj(); drawScree(); drawPar(); drawHeat(); drawRadar(); drawSplom(); drawLoad(); pcInterp(); umapInterp(); multiInsight(); multiKpis();
}

/* ============================================================================
 * HIERARKI
 * ========================================================================== */
const H = { size: 'Penduduk', color: 'IKG', view: 'both', level: 'ID', nodes: null, depth: 3, pick: null };
const SIZELAB = { Penduduk: 'Penduduk (jiwa)', PDRB: 'PDRB (miliar rupiah)' };

function buildNodes() {
  const nodes = new Map();
  const add = (id, label, parent) => { if (!nodes.has(id)) nodes.set(id, { id, label, parent, v: 0, cw: 0, n: 0, kids: [], leaf: false }); return nodes.get(id); };
  add('ID', 'Indonesia', '');
  R.forEach(r => {
    const w = 'W|' + r.Wilayah, p = 'P|' + r.Provinsi, k = 'K|' + r.kdkab;
    add(w, r.wil, 'ID'); add(p, r.prov, w); const kn = add(k, r.Kabupaten, p); kn.leaf = true; kn.i = r.i;
    const v = r[H.size], c = r[H.color];
    ['ID', w, p, k].forEach(id => { const nd = nodes.get(id); nd.v += v; nd.cw += v * c; nd.n++; });
  });
  nodes.forEach(nd => { nd.c = nd.cw / nd.v; if (nd.parent) nodes.get(nd.parent).kids.push(nd.id); });
  return nodes;
}
const lvl = id => id === 'ID' ? '' : id;
const inNode = (r, id) => id === 'ID' || id === 'W|' + r.Wilayah || id === 'P|' + r.Provinsi || id === 'K|' + r.kdkab;

function hierTrace(type) {
  const nodes = H.nodes, ids = Array.from(nodes.keys()), c = H.color;
  const tr = { type, ids, labels: ids.map(i => nodes.get(i).label), parents: ids.map(i => nodes.get(i).parent),
    values: ids.map(i => nodes.get(i).v), branchvalues: 'total', level: lvl(H.level),
    customdata: ids.map(i => { const n = nodes.get(i); return [ni(n.v), nf(n.c, VDEC[c]), n.n, n.leaf ? '' : ' (rata-rata tertimbang)']; }),
    hovertemplate: '<b>%{label}</b><br>' + SIZELAB[H.size] + ': %{customdata[0]}<br>' + c + ': %{customdata[1]}%{customdata[3]}<br>Kabupaten/kota: %{customdata[2]}<extra></extra>',
    marker: { colors: ids.map(i => nodes.get(i).c), colorscale: plScale(STOPS[c]), cmin: VMIN[c], cmax: VMAX[c], line: { width: 1, color: '#fff' },
      colorbar: { orientation: 'h', thickness: 10, len: .55, y: -.04, yanchor: 'top', x: .5, xanchor: 'center', tickfont: { size: 10 }, outlinewidth: 0, title: { text: c, side: 'top', font: { size: 11 } } } },
    textfont: { family: FF, size: 12 }, hoverlabel: { bgcolor: '#fff', bordercolor: LINE, font: { family: FF, size: 12, color: INK } } };
  if (type === 'treemap') { tr.maxdepth = H.depth; tr.pathbar = { visible: true, thickness: 26, textfont: { size: 12 } }; tr.tiling = { pad: 2 }; tr.root = { color: '#EEF2F4' }; tr.textinfo = 'label'; }
  else { tr.maxdepth = H.depth; tr.insidetextorientation = 'radial'; tr.root = { color: '#EEF2F4' }; tr.textinfo = 'label'; }
  return tr;
}
function drawHier() {
  H.nodes = buildNodes();
  if (!H.nodes.has(H.level)) H.level = 'ID';
  const lay = (b) => baseLayout({ margin: { l: 4, r: 4, t: 4, b }, dragmode: false });
  const t1 = hierTrace('treemap'), t2 = hierTrace('sunburst');
  draw('plotTree', [t1], lay(64)); draw('plotSun', [t2], lay(64));
  const src = srcLine('Ukuran: ' + SIZELAB[H.size] + '. Warna: ' + H.color + '. Simpul induk memakai rata-rata ' + H.color + ' tertimbang ' + H.size + '.');
  gd('treeSrc').textContent = src; gd('sunSrc').textContent = src;
  const how = 'Klik wilayah atau provinsi untuk masuk; klik kabupaten/kota untuk melihat profilnya; klik jalur di atas atau remah roti untuk naik.';
  gd('treeSub').textContent = 'Luas = ' + SIZELAB[H.size] + ', warna = ' + H.color + '. ' + how;
  gd('sunSub').textContent = 'Cincin dalam ke luar: wilayah, provinsi, kabupaten/kota. Klik busur untuk masuk, klik pusat untuk naik.';
  renderCrumbs(); renderRank();
  const el1 = gd('plotTree'), el2 = gd('plotSun');
  if (!el1._hb) {
    el1._hb = true;
    el1.on('plotly_treemapclick', ev => hierClick(ev, 'plotTree'));
    el2.on('plotly_sunburstclick', ev => hierClick(ev, 'plotSun'));
  }
}
function nextOf(ev) {
  if (ev.nextLevel !== undefined) return ev.nextLevel === '' ? 'ID' : ev.nextLevel;
  const p = ev.points && ev.points[0]; return p && p.id ? p.id : 'ID';
}
function hierClick(ev, src) {
  const id = nextOf(ev), nd = H.nodes.get(id);
  if (nd && nd.leaf) { H.pick = nd.i; renderRank(); return false; } // daun: pilih, jangan zoom
  setLevel(id, src);
}
function setLevel(id, src) {
  if (!H.nodes.has(id)) id = 'ID';
  H.level = id; H.pick = null;
  ['plotTree', 'plotSun'].forEach(pid => { if (pid !== src && gd(pid).data) Plotly.restyle(gd(pid), { level: [lvl(id)] }, [0]); });
  renderCrumbs(); renderRank();
}
function renderCrumbs() {
  const path = []; let id = H.level;
  while (id) { const n = H.nodes.get(id); path.unshift(n); id = n.parent; }
  gd('crumbs').innerHTML = path.map((n, k) => (k ? '<span class="sep" aria-hidden="true">/</span>' : '') +
    '<button data-id="' + esc(n.id) + '"' + (k === path.length - 1 ? ' aria-current="true"' : '') + '>' + esc(n.label) + '</button>').join('');
}
function renderRank() {
  const nd = H.nodes.get(H.level), c = H.color;
  const rows = R.filter(r => inNode(r, H.level)).sort((a, b) => b[c] - a[c]);
  const tot = rows.reduce((s, r) => s + r.Penduduk, 0), pdrb = rows.reduce((s, r) => s + r.PDRB, 0);
  gd('rankTitle').textContent = 'Peringkat ' + c + ' di ' + nd.label;
  gd('rankSub').textContent = rows.length + ' kabupaten/kota, ' + ni(tot) + ' jiwa, PDRB ' + ni(pdrb) + ' miliar rupiah. ' + c + ' rata-rata tertimbang ' + SIZELAB[H.size].split(' ')[0].toLowerCase() + ': ' + nf(nd.c, VDEC[c]) + '.';
  const bar = r => { const t = (r[c] - VMIN[c]) / (VMAX[c] - VMIN[c]);
    return '<div class="row"><span class="nm" title="' + esc(r.Kabupaten + ', ' + r.prov) + '">' + esc(r.Kabupaten) + '</span><span class="bar"><i style="width:' + Math.max(3, t * 100) + '%;background:' + ramp(STOPS[c], t) + '"></i></span><span class="val">' + nf(r[c], VDEC[c]) + '</span></div>'; };
  const body = gd('rankBody');
  const pickHtml = (H.pick !== null && rows.length > 1 && R[H.pick] && inNode(R[H.pick], H.level)) ? (() => { const r = R[H.pick]; return '<div class="s12"><div class="note"><b>' + esc(r.Kabupaten) + '</b>, ' + esc(r.prov) + ': IKG ' + nf(r.IKG, 3) + ', IPG ' + nf(r.IPG, 2) + ', penduduk ' + ni(r.Penduduk) + ' jiwa, PDRB ' + ni(r.PDRB) + ' miliar rupiah. <button class="btn" data-map="' + r.i + '" style="margin-left:8px">Lihat di peta</button></div></div>'; })() : '';
  if (rows.length === 1) {
    const r = rows[0];
    body.innerHTML = '<div class="s12"><p><b>' + esc(r.Kabupaten) + '</b>, ' + esc(r.prov) + ' (' + esc(r.wil) + '). IKG ' + nf(r.IKG, 3) + ', IPG ' + nf(r.IPG, 2) + ', penduduk ' + ni(r.Penduduk) + ' jiwa, PDRB ' + ni(r.PDRB) + ' miliar rupiah.</p><button class="btn primary" id="toMap">Lihat di peta</button></div>';
    gd('toMap').addEventListener('click', () => { showTab('geospasial', true); geoPick(r.i, true); });
    return;
  }
  const lowFirst = c === 'IKG'; // IKG rendah = baik; IPG tinggi = baik
  const head = rows.length > 12 ? 6 : Math.ceil(rows.length / 2);
  const A = rows.slice(0, head), B = rows.slice(-head).reverse();
  const tA = c + ' tertinggi', tB = c + ' terendah';
  if (rows.length <= 12) { body.innerHTML = pickHtml + '<div class="s12"><div class="rank">' + rows.map(bar).join('') + '</div></div>'; return; }
  body.innerHTML = pickHtml + '<div class="s6"><div class="rank"><h4>' + tA + '</h4>' + A.map(bar).join('') + '</div></div><div class="s6"><div class="rank"><h4>' + tB + '</h4>' + B.map(bar).join('') + '</div></div>';
}
function hierInsight() {
  const wk = {}; R.forEach(r => { wk[r.Wilayah] = (wk[r.Wilayah] || 0) + r.Penduduk; });
  const tot = Object.values(wk).reduce((a, b) => a + b, 0), jw = wk['JAWA'] / tot;
  const wAvg = (v, wt) => R.reduce((a, r) => a + r[v] * r[wt], 0) / R.reduce((a, r) => a + r[wt], 0);
  const prov = {}; R.forEach(r => { const p = prov[r.Provinsi] || (prov[r.Provinsi] = { n: r.prov, pop: 0, ik: 0, ig: 0 }); p.pop += r.Penduduk; p.ik += r.IKG * r.Penduduk; p.ig += r.IPG * r.Penduduk; });
  const P = Object.values(prov).map(p => ({ n: p.n, pop: p.pop, ikg: p.ik / p.pop, ipg: p.ig / p.pop }));
  const byK = P.slice().sort((a, b) => b.ikg - a.ikg), byG = P.slice().sort((a, b) => a.ipg - b.ipg);
  const f3 = (arr, key, d) => arr.slice(0, 3).map(p => p.n + ' (' + nf(p[key], d) + ')').join(', ');
  const topK = byK.slice(0, 3), lowK = byK.slice(-3).reverse(), lowG = byG.slice(0, 3), topG = byG.slice(-3).reverse();
  const both = topK.filter(p => lowG.some(q => q.n === p.n)).length, medPop = median(P.map(p => p.pop));
  const nSmall = topK.filter(p => p.pop < medPop).length, rho = spearman(P.map(p => p.ikg), P.map(p => p.ipg));
  const reg = Object.fromEntries(ST.by_region.map(r => [r.Wilayah, r])), rj = reg['JAWA'];
  const rkK = ST.by_region.filter(r => r.ikg < rj.ikg).length + 1, rkG = ST.by_region.filter(r => r.ipg > rj.ipg).length + 1;
  const sg = v => (v < 0 ? '\u2212' : '+') + nf(Math.abs(v), 2);
  gd('hierInsight').innerHTML = '<ul class="clean">' +
    '<li><span class="tag fakta">Fakta</span>Jawa memuat ' + nf(jw * 100, 1) + '% penduduk sehingga mendominasi luas treemap berukuran penduduk. Rata-rata sederhana IKG kabupaten/kota Jawa ' + nf(rj.ikg, 3) + ' (urutan ke-' + rkK + ' terendah dari 6 wilayah) dan IPG ' + nf(rj.ipg, 1) + ' (urutan ke-' + rkG + ' tertinggi).</li>' +
    '<li><span class="tag fakta">Fakta</span>IKG provinsi tertimbang penduduk, tertinggi: ' + f3(topK, 'ikg', 3) + '; terendah: ' + f3(lowK, 'ikg', 3) + '.</li>' +
    '<li><span class="tag fakta">Fakta</span>IPG provinsi tertimbang penduduk, terendah: ' + f3(lowG, 'ipg', 2) + '; tertinggi: ' + f3(topG, 'ipg', 2) + '. ' + both + ' dari 3 provinsi ber-IKG tertinggi juga termasuk 3 provinsi ber-IPG terendah.</li>' +
    '<li><span class="tag fakta">Fakta</span>' + nSmall + ' dari 3 provinsi ber-IKG tertinggi berpenduduk di bawah median provinsi (' + ni(medPop) + ' jiwa). Nasional tertimbang penduduk: IKG ' + nf(wAvg('IKG', 'Penduduk'), 3) + ', IPG ' + nf(wAvg('IPG', 'Penduduk'), 2) + '; tertimbang PDRB: IKG ' + nf(wAvg('IKG', 'PDRB'), 3) + ', IPG ' + nf(wAvg('IPG', 'PDRB'), 2) + '.</li>' +
    '<li><span class="tag inferensi">Inferensi</span>Korelasi peringkat antarprovinsi IKG dan IPG ρ = ' + sg(rho) + ', ' + (rho <= -.3 ? 'sehingga provinsi ber-IKG tinggi cenderung ber-IPG rendah.' : 'sehingga kedua indeks tidak selalu menunjuk provinsi yang sama.') +
      ' Rata-rata tertimbang PDRB yang lebih rendah untuk IKG dan lebih tinggi untuk IPG daripada tertimbang penduduk menunjukkan daerah berekonomi besar cenderung lebih setara. Ini asosiasi, bukan bukti bahwa ekonomi besar menurunkan ketimpangan.</li>' +
    '<li><span class="tag catatan">Catatan</span>Warna simpul induk adalah rata-rata tertimbang, sehingga dapat menutupi ragam di dalamnya; masuk ke tingkat kabupaten/kota untuk melihat sebaran sebenarnya. Treemap unggul membandingkan ukuran, sunburst unggul memperlihatkan struktur bertingkat (Shneiderman, 1992).</li></ul>';
}

function initHier() {
  gd('rankBody').addEventListener('click', e => { const b = e.target.closest('[data-map]'); if (b) { showTab('geospasial', true); geoPick(+b.dataset.map, true); } });
  segBind('hDepth', v => { H.depth = +v; ['plotTree', 'plotSun'].forEach(id => Plotly.restyle(gd(id), { maxdepth: [H.depth] }, [0])); });
  gd('crumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.getAttribute('aria-current') !== 'true') { setLevel(b.dataset.id, null); } });
  segBind('hSize', v => { H.size = v; drawHier(); });
  segBind('hColor', v => { H.color = v; drawHier(); });
  segBind('hView', v => setHierView(v));
  setHierView(narrow() ? 'treemap' : 'both', true);
  hierInsight();
}
function setHierView(v, init) {
  H.view = v; segSet('hView', v);
  const t = gd('cardTree'), s = gd('cardSun');
  t.hidden = v === 'sunburst'; s.hidden = v === 'treemap';
  t.className = 'card ' + (v === 'both' ? 's7' : 's12'); s.className = 'card ' + (v === 'both' ? 's5' : 's12');
  if (init) drawHier(); else { Plotly.Plots.resize(gd('plotTree')); Plotly.Plots.resize(gd('plotSun')); }
}

/* ============================================================================
 * GEOSPASIAL (Leaflet)
 * Satu renderer kanvas dipakai bersama oleh poligon, simbol proporsional, dan sorotan,
 * sehingga hit-test hover/klik selalu terpadu walau lapisan diganti.
 * ========================================================================== */
const G = { var: 'IKG', method: 'quantile', cls: null, reg: '', sel: null, map: null, cv: null, choro: null, bubbles: null, hoverL: null, selL: null, polyByI: {}, bubByI: {}, layerMode: 'choro', pending: null };
const FEAT = {}; GEO.features.forEach(f => { FEAT[kd2i[f.properties.kdkab]] = f; });
const bins = () => D.breaks[G.var][G.method];
function classOf(v) { const b = bins(); for (let i = 0; i < b.length; i++) if (v <= b[i] + 1e-9) return i; return b.length - 1; }
const gcol = c => STOPS[G.var][c];
const dimmed = (r, c) => (G.cls !== null && c !== G.cls) || (G.reg && r.Wilayah !== G.reg);
function polyStyle(r) {
  const c = classOf(r[G.var]);
  return { fillColor: gcol(c), fillOpacity: dimmed(r, c) ? .16 : .94, color: '#FFFFFF', weight: .35, opacity: 1 };
}
function bubStyle(r) {
  const c = classOf(r[G.var]), d = dimmed(r, c);
  return { fillColor: gcol(c), fillOpacity: d ? .1 : .8, color: d ? 'rgba(19,35,46,.25)' : INK, weight: .7, opacity: 1 };
}
const tipHtml = r => '<b>' + esc(r.Kabupaten) + '</b><br>' + esc(r.prov) + '<br>IKG ' + nf(r.IKG, 3) + ' | IPG ' + nf(r.IPG, 2) + '<br>PDRB ' + ni(r.PDRB) + ' miliar rupiah';
const PDRBMAX = Math.max(...stat('PDRB'));
const bubR = r => Math.max(2.2, (narrow() ? 20 : 28) * Math.sqrt(r.PDRB / PDRBMAX));

/* ---------- sorotan hover dan seleksi: lapisan non-interaktif di atas semuanya ---------- */
const hlCache = {};
function hlLayer(i, kind) {
  const key = kind + i;
  if (!hlCache[key]) hlCache[key] = L.geoJSON(FEAT[i], { interactive: false, renderer: G.cv,
    style: kind === 'sel' ? { fill: false, color: INK, weight: 3.2, opacity: 1 } : { fill: false, color: INK, weight: 1.8, opacity: .9 } });
  return hlCache[key];
}
function topOverlays() {
  [G.hoverL, G.selL].forEach(g => g.eachLayer(fg => fg.eachLayer && fg.eachLayer(p => p.bringToFront && p.bringToFront())));
}
function hoverOn(i) { G.hoverL.clearLayers(); G.hoverL.addLayer(hlLayer(i, 'hover')); topOverlays(); }
function hoverOff() { G.hoverL.clearLayers(); }
function drawSel() { G.selL.clearLayers(); if (G.sel !== null) { G.selL.addLayer(hlLayer(G.sel, 'sel')); topOverlays(); } }

function geoPick(i, zoom) {
  if (!G.map) { G.pending = { i, zoom }; return; }
  if (zoom && G.reg && R[i].Wilayah !== G.reg) { G.reg = ''; gd('gReg').value = ''; restyleGeo(); }
  G.sel = i; drawSel(); renderDetail(i); drawMoran();
  if (zoom) G.map.fitBounds(G.polyByI[i].getBounds(), { maxZoom: 9, padding: [40, 40] });
}
function renderDetail(i) {
  const r = R[i];
  const rk = R.slice().sort((a, b) => a.IKG - b.IKG).findIndex(x => x.i === i) + 1;
  const mx = { RLS: 14, HLS: 20, UHH: 80, TPAK: 100, TPT: 20, IPM: 100 };
  const pair = (nm, k, dec) => {
    const L_ = r[k + '_L'], P = r[k + '_P'], w = v => Math.max(2, v / mx[k] * 100);
    return '<div class="pair"><span class="pl">' + nm + '</span><div class="bars">' +
      '<div class="b"><span class="t"><i style="width:' + w(L_) + '%;background:#7C8B96"></i></span><em>' + nf(L_, dec) + '</em></div>' +
      '<div class="b"><span class="t"><i style="width:' + w(P) + '%;background:' + BRAND + '"></i></span><em>' + nf(P, dec) + '</em></div></div></div>';
  };
  gd('detailCard').innerHTML = '<h4>' + esc(r.Kabupaten) + '</h4><div class="where">' + esc(r.prov) + ', ' + esc(r.wil) + '</div>' +
    '<div class="kpis" style="grid-template-columns:1fr 1fr;margin-bottom:6px"><div class="kpi"><div class="v">' + nf(r.IKG, 3) + '</div><div class="k">IKG, urutan ke-' + rk + ' dari ' + N + ' (dari terendah)</div></div>' +
    '<div class="kpi"><div class="v">' + nf(r.IPG, 1) + '</div><div class="k">IPG</div></div></div>' +
    '<div class="lbl" style="margin:8px 0 2px"><span style="display:inline-block;width:10px;height:10px;background:#7C8B96;border-radius:2px"></span> Laki-laki &nbsp; <span style="display:inline-block;width:10px;height:10px;background:' + BRAND + ';border-radius:2px"></span> Perempuan</div>' +
    pair('RLS (tahun)', 'RLS', 2) + pair('HLS (tahun)', 'HLS', 2) + pair('UHH (tahun)', 'UHH', 1) + pair('TPAK (%)', 'TPAK', 1) + pair('TPT (%)', 'TPT', 1) + pair('IPM', 'IPM', 1) +
    '<div class="src">Sumber: BPS. Penduduk ' + ni(r.Penduduk) + ' jiwa, PDRB ' + ni(r.PDRB) + ' miliar rupiah.</div>';
}
function renderLegend() {
  const b = bins(), d = VDEC[G.var], cnt = new Array(b.length).fill(0);
  R.forEach(r => { cnt[classOf(r[G.var])]++; });
  gd('legend').innerHTML = b.map((hi, i) => {
    const lo = i ? b[i - 1] : VMIN[G.var];
    return '<button data-c="' + i + '" aria-pressed="' + (G.cls === i) + '" title="Klik untuk menyorot kelas ini"><span class="sw" style="background:' + gcol(i) + '"></span>' + nf(lo, d) + ' sampai ' + nf(hi, d) + ' <small style="color:var(--muted)">(' + cnt[i] + ')</small></button>';
  }).join('');
  gd('mapTitle').textContent = (G.var === 'IKG' ? 'Indeks Ketimpangan Gender (IKG)' : 'Indeks Pembangunan Gender (IPG)') + ' menurut kabupaten/kota';
  gd('mapSub').textContent = 'Lima kelas ' + ({ quantile: 'kuantil', natural: 'natural breaks', equal: 'interval sama' })[G.method] + '; angka dalam kurung adalah jumlah kabupaten/kota. Klik kelas pada legenda untuk menyorotnya, atau klik wilayah pada peta untuk melihat profilnya. Lingkaran: luas sebanding PDRB.';
  gd('mapSrc').textContent = srcLine('Batas wilayah: data digital non-BPS, disederhanakan.');
  bubbleKey();
}
function bubbleKey() {
  const on = G.map && G.map.hasLayer(G.bubbles), el = gd('bubbleKey');
  el.style.display = on ? 'flex' : 'none';
  if (!on) return;
  const rMax = narrow() ? 20 : 28, vals = [10000, 100000, 500000], w = 2 * rMax + 4;
  el.innerHTML = '<span>Luas lingkaran = PDRB (miliar rupiah):</span><svg width="' + (w + 10) + '" height="' + w + '" aria-hidden="true">' +
    vals.map(v => { const r = rMax * Math.sqrt(v / PDRBMAX); return '<circle cx="' + (w / 2) + '" cy="' + (w - r - 1) + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="1"/>'; }).join('') + '</svg>' +
    '<span>' + vals.map(v => ni(v)).join(', ') + '</span>';
}
function restyleGeo() {
  G.choro.setStyle(f => polyStyle(R[kd2i[f.properties.kdkab]]));
  Object.values(G.bubByI).forEach(m => m.setStyle(bubStyle(R[m._i])));
  renderLegend(); renderGeoInsight(); drawMoran(); topOverlays();
}
function setLayers(v) {
  G.layerMode = v; hoverOff();
  [G.choro, G.bubbles].forEach(l => { if (G.map.hasLayer(l)) G.map.removeLayer(l); });
  if (v !== 'bubble') G.map.addLayer(G.choro);
  if (v !== 'choro') G.map.addLayer(G.bubbles); // gelembung selalu digambar setelah poligon
  topOverlays(); bubbleKey();
}
function focusReg(p) {
  G.reg = p; restyleGeo();
  const b = L.latLngBounds([]);
  Object.entries(G.polyByI).forEach(([i, l]) => { if (!p || R[i].Wilayah === p) b.extend(l.getBounds()); });
  if (b.isValid()) G.map.fitBounds(b, { padding: [24, 24], maxZoom: 8 });
}

/* ---------- Moran's I dinamis (variabel dan fokus wilayah) ---------- */
const MORAN_K = 8, MORAN_PERM = 999, moranCache = {}, knnMemo = {};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function buildKnn(idx, k) {
  const n = idx.length, kk = Math.min(k, n - 1);
  const xs = idx.map(i => R[i].lon * Math.cos(R[i].lat * Math.PI / 180)), ys = idx.map(i => R[i].lat), nb = new Array(n);
  for (let a = 0; a < n; a++) {
    const d = [];
    for (let b = 0; b < n; b++) if (b !== a) d.push([(xs[a] - xs[b]) ** 2 + (ys[a] - ys[b]) ** 2, b]);
    d.sort((u, v) => u[0] - v[0]);
    nb[a] = d.slice(0, kk).map(x => x[1]);
  }
  return { nb, kk };
}
function moranFor(v, reg) {
  const key = v + '|' + reg; if (moranCache[key]) return moranCache[key];
  const idx = R.filter(r => !reg || r.Wilayah === reg).map(r => r.i), nk = reg || 'ALL';
  if (!knnMemo[nk]) knnMemo[nk] = buildKnn(idx, MORAN_K);
  const { nb, kk } = knnMemo[nk], n = idx.length, vals = idx.map(i => R[i][v]), mu = mean(vals), z0 = vals.map(x => x - mu);
  let den = 0; z0.forEach(x => { den += x * x; });
  const stat_ = zz => { let num = 0; for (let a = 0; a < n; a++) { let s = 0; const q = nb[a]; for (let t = 0; t < q.length; t++) s += zz[q[t]]; num += zz[a] * s / kk; } return num / den; };
  const I = stat_(z0), rnd = mulberry32(42), zz = z0.slice(), sims = []; let ge = 0;
  for (let p = 0; p < MORAN_PERM; p++) {
    for (let a = n - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)), t = zz[a]; zz[a] = zz[b]; zz[b] = t; }
    const s = stat_(zz); sims.push(s); if (s >= I) ge++;
  }
  const ms = mean(sims), sd = Math.sqrt(mean(sims.map(s => (s - ms) ** 2))), sdv = Math.sqrt(den / n);
  const zs = z0.map(x => x / sdv), lag = zs.map((_, a) => nb[a].reduce((s, q) => s + zs[q], 0) / kk);
  const quad = zs.map((z, a) => z >= 0 ? (lag[a] >= 0 ? 'HH' : 'HL') : (lag[a] >= 0 ? 'LH' : 'LL'));
  return (moranCache[key] = { I, E: -1 / (n - 1), p: (1 + ge) / (MORAN_PERM + 1), z: (I - ms) / sd, n, kk, idx, zs, lag, quad });
}
const fmtP = p => p <= 1 / (MORAN_PERM + 1) + 1e-12 ? 'p ≤ 0,001' : 'p = ' + nf(p, 3);
const QN = { HH: 'Tinggi-Tinggi', LL: 'Rendah-Rendah', HL: 'Tinggi-Rendah', LH: 'Rendah-Tinggi' };
const QCOL = { HH: '#5B1F5E', LL: '#2E8E98', HL: '#E48C5C', LH: '#8FA3AE' }, QSYM = { HH: 'circle', LL: 'square', HL: 'diamond', LH: 'triangle-up' };
function drawMoran() {
  if (!gd('plotMoran')) return;
  const v = G.var, reg = G.reg, m = moranFor(v, reg), o = moranFor(v === 'IKG' ? 'IPG' : 'IKG', reg), ov = v === 'IKG' ? 'IPG' : 'IKG';
  const scope = reg ? pretty(reg) : 'seluruh Indonesia', sig = m.p < .05, pos = m.I > 0;
  const cnt = { HH: 0, LL: 0, HL: 0, LH: 0 }; m.quad.forEach(q => { cnt[q]++; });
  const card = gd('moranCard'); card.classList.toggle('ns', !sig); card.classList.toggle('neg', sig && !pos);
  gd('moranV').textContent = nf(m.I, 2);
  gd('moranK').innerHTML = 'Moran\'s I untuk <b>' + v + '</b><br>' + esc(scope);
  gd('moranChips').innerHTML = [['E[I] acak', nf(m.E, 3)], ['z permutasi', nf(m.z, 1)], ['Uji', fmtP(m.p)], ['Unit', m.n + ' kab/kota'], ['Tetangga', 'k = ' + m.kk]]
    .map(c => '<span class="mchip"><small>' + c[0] + '</small><b>' + c[1] + '</b></span>').join('');
  const strength = Math.abs(m.I) < .2 ? 'lemah' : Math.abs(m.I) < .5 ? 'sedang' : 'kuat';
  const pattern = !sig ? 'tidak berbeda nyata dari sebaran acak' : pos ? 'pengelompokan spasial positif (' + strength + ')' : 'pola tersebar (dispersi) yang ' + strength;
  const meaning = !sig ? 'Pada lingkup ini tidak ada bukti bahwa nilai ' + v + ' yang mirip saling berdekatan.'
    : !pos ? 'Kabupaten/kota bertetangga cenderung memiliki nilai ' + v + ' yang berlawanan.'
    : v === 'IKG' ? 'Kabupaten/kota ber-IKG tinggi cenderung bertetangga dengan sesamanya, begitu pula yang ber-IKG rendah, sehingga ketimpangan tinggi terkonsentrasi di kantong-kantong geografis.'
    : 'Kabupaten/kota dengan IPM perempuan relatif tertinggal (IPG rendah) cenderung berdekatan, begitu pula yang mendekati paritas (IPG tinggi), sehingga kesenjangan IPM perempuan dan laki-laki membentuk kantong-kantong geografis.';
  const grp = q => { const c = {}; m.idx.forEach((i, a) => { if (m.quad[a] === q) { const g = reg ? R[i].prov : R[i].wil; c[g] = (c[g] || 0) + 1; } }); const e = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return e ? e[0] + ' (' + e[1] + ' dari ' + cnt[q] + ')' : '-'; };
  const clus = (cnt.HH + cnt.LL) / m.n * 100;
  gd('moranText').innerHTML = '<ul class="clean">' +
    '<li><span class="tag fakta">Fakta</span>I = ' + nf(m.I, 2) + ' dibanding nilai harapan acak ' + nf(m.E, 3) + ' (' + fmtP(m.p) + '): ' + pattern + '.</li>' +
    '<li><span class="tag inferensi">Inferensi</span>' + meaning + (sig && pos ? ' Penyebabnya tidak dapat ditentukan dari data ini; kandidatnya mencakup struktur ekonomi, akses layanan, dan norma sosial yang bersifat regional.' : '') + '</li>' +
    '<li><span class="tag fakta">Fakta</span>' + nf(clus, 0) + '% kabupaten/kota berada pada kuadran Tinggi-Tinggi atau Rendah-Rendah (' + cnt.HH + ' dan ' + cnt.LL + '), sedangkan ' + cnt.HL + ' Tinggi-Rendah dan ' + cnt.LH + ' Rendah-Tinggi. Tinggi-Tinggi terbanyak di ' + grp('HH') + '; Rendah-Rendah terbanyak di ' + grp('LL') + '.</li>' +
    '<li><span class="tag fakta">Pembanding</span>Pada lingkup yang sama, Moran\'s I untuk ' + ov + ' = ' + nf(o.I, 2) + ' (' + fmtP(o.p) + ').</li>' +
    '</ul>';
  gd('moranSrc').textContent = srcLine('Bobot k-NN (k = ' + m.kk + ') dari titik pusat poligon, baris dibakukan; ' + MORAN_PERM + ' permutasi, uji satu arah. Kategori kekuatan memakai batas heuristik 0,2 dan 0,5.');
  // diagram sebar Moran
  const tr = Object.keys(QN).map(q => { const ix = m.quad.map((x, a) => x === q ? a : -1).filter(a => a >= 0);
    return { type: 'scatter', mode: 'markers', name: QN[q] + ' (' + cnt[q] + ')', x: ix.map(a => m.zs[a]), y: ix.map(a => m.lag[a]), text: ix.map(a => R[m.idx[a]].Kabupaten),
      customdata: ix.map(a => [m.idx[a], R[m.idx[a]].prov]), marker: { color: QCOL[q], symbol: QSYM[q], size: 7, opacity: .85, line: { width: .6, color: '#fff' } },
      hovertemplate: '<b>%{text}</b><br>%{customdata[1]}<br>nilai terbakukan %{x:.2f}, rata-rata tetangga %{y:.2f}<extra>' + QN[q] + '</extra>' }; });
  const xs = m.zs, xmin = Math.min(...xs), xmax = Math.max(...xs);
  tr.push({ type: 'scatter', mode: 'lines', x: [xmin, xmax], y: [m.I * xmin, m.I * xmax], line: { color: INK, width: 1.6, dash: 'dash' }, hoverinfo: 'skip', showlegend: false });
  const sa = G.sel !== null ? m.idx.indexOf(G.sel) : -1;
  if (sa >= 0) tr.push({ type: 'scatter', mode: 'markers', x: [m.zs[sa]], y: [m.lag[sa]], hoverinfo: 'skip', showlegend: false, marker: { size: 16, color: 'rgba(0,0,0,0)', line: { width: 2.6, color: INK } } });
  draw('plotMoran', tr, baseLayout({ showlegend: true, legend: { orientation: 'h', y: -.26, x: .5, xanchor: 'center', font: { size: 10.5 } },
    xaxis: axisStyle({ title: { text: 'Nilai ' + v + ' terbakukan (z)', font: { size: 11.5 } }, zeroline: true }),
    yaxis: axisStyle({ title: { text: 'Rata-rata z tetangga', font: { size: 11.5 } }, zeroline: true }),
    margin: { l: 52, r: 10, t: 8, b: 92 }, dragmode: narrow() ? false : 'zoom',
    annotations: [{ xref: 'paper', yref: 'paper', x: .99, y: .02, xanchor: 'right', text: 'kemiringan garis = I', showarrow: false, font: { size: 10, color: MUTED } }] }));
  const el = gd('plotMoran');
  if (!el._mb) { el._mb = true; el.on('plotly_click', ev => { const p = ev.points && ev.points[0]; if (p && p.customdata) geoPick(p.customdata[0], false); }); }
}

const METHOD_TXT = {
  quantile: 'Kuantil membagi kabupaten/kota ke lima kelas berukuran hampir sama, sehingga kelas menyatakan peringkat relatif dan seluruh warna terpakai. Kelemahannya, nilai yang berdekatan dapat terpisah kelas dan nilai berjauhan dapat sekelas.',
  natural: 'Natural breaks (Fisher-Jenks) meminimalkan ragam dalam kelas sehingga batas mengikuti celah alami data. Batas bergantung pada data, sehingga sulit dibandingkan antarperiode.',
  equal: 'Interval sama menjaga lebar kelas tetap dan mudah dibaca, tetapi pada sebaran miring sebagian kelas memuat sangat sedikit daerah (lihat angka pada legenda).',
};
function renderGeoInsight() {
  const v = G.var, rows = R.filter(r => !G.reg || r.Wilayah === G.reg), scope = G.reg ? pretty(G.reg) : 'seluruh Indonesia';
  const sorted = rows.slice().sort((a, b) => a[v] - b[v]), k = Math.min(5, Math.floor(rows.length / 2));
  const lo = sorted.slice(0, k), hi = sorted.slice(-k).reverse(), nm = r => esc(r.Kabupaten) + ' (' + nf(r[v], VDEC[v]) + ')';
  const mS = mean(rows.map(r => r[v])), mN = mean(R.map(r => r[v])), cmp = G.reg ? ' (seluruh Indonesia ' + nf(mN, VDEC[v]) + ')' : '';
  const rho = spearman(rows.map(r => r.IKG), rows.map(r => r.IPG));
  const items = [];
  if (v === 'IKG') {
    const n5 = rows.filter(r => r.IKG >= .5).length;
    items.push('<li><span class="tag fakta">Fakta</span>' + esc(scope) + ': rata-rata IKG ' + nf(mS, 3) + cmp + '; ' + n5 + ' dari ' + rows.length + ' kabupaten/kota ber-IKG 0,5 atau lebih.</li>');
    items.push('<li><span class="tag fakta">Fakta</span>IKG tertinggi: ' + hi.map(nm).join(', ') + '. Terendah: ' + lo.map(nm).join(', ') + '.</li>');
  } else {
    const n100 = rows.filter(r => r.IPG >= 100).length;
    items.push('<li><span class="tag fakta">Fakta</span>' + esc(scope) + ': rata-rata IPG ' + nf(mS, 2) + cmp + '; ' + (rows.length - n100) + ' dari ' + rows.length + ' kabupaten/kota ber-IPG di bawah 100 (IPM perempuan lebih rendah dari laki-laki) dan ' + n100 + ' ber-IPG 100 atau lebih.</li>');
    items.push('<li><span class="tag fakta">Fakta</span>IPG terendah: ' + lo.map(nm).join(', ') + '. Tertinggi: ' + hi.map(nm).join(', ') + '.</li>');
  }
  items.push('<li><span class="tag inferensi">Inferensi</span>Korelasi peringkat IKG dan IPG pada lingkup ini ρ = ' + (rho < 0 ? '\u2212' : '+') + nf(Math.abs(rho), 2) + ': ' +
    (rho <= -.3 ? 'daerah ber-IKG tinggi cenderung ber-IPG rendah, sehingga peta kedua indeks memberi gambaran yang searah.' : rho >= .3 ? 'hubungan searah antara IKG dan IPG, yang tidak lazim dan perlu dicek ke sumber.' : 'hubungan lemah, sehingga kedua indeks menangkap aspek yang berbeda (IKG: kesehatan reproduksi, pemberdayaan, dan pasar kerja; IPG: rasio IPM).') + ' Ini asosiasi, bukan sebab akibat.</li>');
  items.push('<li><span class="tag catatan">Klasifikasi</span>' + METHOD_TXT[G.method] + '</li>');
  items.push('<li><span class="tag catatan">Batasan</span>Wilayah luas berpenduduk sedikit tampak dominan pada choropleth. Lapisan simbol proporsional dan halaman Hierarki membantu mengimbangi.</li>');
  gd('geoInsight').innerHTML = '<h3 style="font-family:var(--ff-serif);font-size:1.1rem;margin-bottom:6px">Temuan untuk ' + v + '</h3><ul class="clean" style="font-size:.9rem">' + items.join('') + '</ul>';
}
const detailEmpty = () => '<h3 style="font-family:var(--ff-serif);font-size:1.1rem">Profil kabupaten/kota</h3><p class="empty">Pilih kabupaten/kota pada peta atau lewat kolom cari.</p>';

function initGeo() {
  const m = L.map('map', { preferCanvas: true, zoomSnap: .25, minZoom: 3, maxZoom: 11, zoomControl: true });
  G.map = m; m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  G.cv = L.canvas({ padding: .3 });
  const base = L.geoJSON(GEO, { style: { fillColor: '#E3EAEE', fillOpacity: 1, color: '#fff', weight: .3 }, interactive: false, renderer: G.cv }).addTo(m);
  G.polyByI = {};
  G.choro = L.geoJSON(GEO, { renderer: G.cv, style: f => polyStyle(R[kd2i[f.properties.kdkab]]),
    onEachFeature: (f, layer) => {
      const r = R[kd2i[f.properties.kdkab]]; G.polyByI[r.i] = layer;
      layer.bindTooltip(tipHtml(r), { sticky: true, className: 'tt', direction: 'top', opacity: 1 });
      layer.on({ mouseover: () => hoverOn(r.i), mouseout: hoverOff, click: () => geoPick(r.i, false) });
    } }).addTo(m);
  G.bubbles = L.layerGroup(); G.bubByI = {};
  R.slice().sort((a, b) => b.PDRB - a.PDRB).forEach(r => {
    const mk = L.circleMarker([r.lat, r.lon], Object.assign({ radius: bubR(r), renderer: G.cv }, bubStyle(r)));
    mk._i = r.i; mk.bindTooltip(tipHtml(r), { sticky: true, className: 'tt', direction: 'top', opacity: 1 });
    mk.on({ mouseover: () => hoverOn(r.i), mouseout: hoverOff, click: () => geoPick(r.i, false) });
    G.bubbles.addLayer(mk); G.bubByI[r.i] = mk;
  });
  G.hoverL = L.layerGroup().addTo(m); G.selL = L.layerGroup().addTo(m);
  const fit = () => m.fitBounds(base.getBounds(), { padding: [10, 10] });
  fit(); G.fit = fit;

  segBind('gLayer', v => setLayers(v));
  segBind('gVar', v => { G.var = v; G.cls = null; restyleGeo(); });
  gd('gMethod').addEventListener('change', e => { G.method = e.target.value; G.cls = null; restyleGeo(); });
  const sel = gd('gReg');
  sel.innerHTML = '<option value="">Semua wilayah</option>' + REGIONS.map(p => '<option value="' + esc(p) + '">' + esc(pretty(p)) + '</option>').join('');
  sel.addEventListener('change', e => focusReg(e.target.value));
  gd('kabList').innerHTML = R.map(r => '<option value="' + esc(r.Kabupaten) + '">' + esc(r.prov) + '</option>').join('');
  gd('gSearch').addEventListener('change', e => {
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const r = R.find(x => x.Kabupaten.toLowerCase() === q) || R.find(x => x.Kabupaten.toLowerCase().includes(q));
    if (r) geoPick(r.i, true);
  });
  gd('gReset').addEventListener('click', () => {
    G.cls = null; G.reg = ''; G.sel = null; gd('gReg').value = ''; gd('gSearch').value = '';
    hoverOff(); drawSel(); restyleGeo(); fit(); gd('detailCard').innerHTML = detailEmpty();
  });
  gd('legend').addEventListener('click', e => {
    const b = e.target.closest('button[data-c]'); if (!b) return;
    const c = +b.dataset.c; G.cls = G.cls === c ? null : c; restyleGeo();
  });
  gd('detailCard').innerHTML = detailEmpty();
  renderLegend(); renderGeoInsight(); drawMoran();
  if (G.pending) { geoPick(G.pending.i, G.pending.zoom); G.pending = null; }
  setTimeout(() => m.invalidateSize(), 50);
}

/* ============================================================================
 * orkestrasi
 * ========================================================================== */
const INIT = { home: initHome, multivariat: initMulti, hierarki: initHier, geospasial: initGeo };
const dirty = {};
const REFLOW = {
  home: null,
  multivariat: () => { if (dirty.multivariat) { dirty.multivariat = false; drawProj(); drawScree(); drawPar(); drawHeat(); drawRadar(); drawSplom(); drawLoad(); }
    ['plotProj', 'plotScree', 'plotPar', 'plotHeat', 'plotRadar', 'plotSplom', 'plotLoad'].forEach(id => Plotly.Plots.resize(gd(id))); },
  hierarki: () => { if (dirty.hierarki) { dirty.hierarki = false; drawHier(); } Plotly.Plots.resize(gd('plotTree')); Plotly.Plots.resize(gd('plotSun')); },
  geospasial: () => { G.map && G.map.invalidateSize(); if (gd('plotMoran') && gd('plotMoran').data) Plotly.Plots.resize(gd('plotMoran')); },
};
let lastNarrow = narrow(), rt = null;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (narrow() !== lastNarrow) {
      lastNarrow = narrow();
      ['multivariat', 'hierarki'].forEach(t => { if (inited[t]) dirty[t] = true; });
      if (current && REFLOW[current]) REFLOW[current]();
    }
  }, 200);
});

mountAllInfo();
bindTabs();
showTab(location.hash.slice(1) || 'home', false);
window.__dash = { S, UI, H, G, R, setLevel, geoPick, refreshViews, showTab, combined: () => combined() };
})();
