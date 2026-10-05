/* ============================================================================
 * Dashboard Ketimpangan Gender Indonesia (desain halaman penuh)
 * Plotly.js (hierarki, multivariat) + Leaflet (geospasial). Tanpa server data.
 * Data: window.__DATA__ (tabular + statistik) dan window.__GEO__ (GeoJSON).
 * ========================================================================== */
'use strict';

/* ---------------------------------------------------------------- metadata (Soal UAS butir 2b) */
const META = {
  sumber: 'Badan Pusat Statistik (BPS)',
  tahunData: '2025',
  judulTabel: '',
  url: '',
  tanggalAkses: '3 Oktober 2026',
  pdrbCatatan: 'miliar rupiah',
  urlProyek: '', urlRepo: '',
  identitas: { nama: 'Aulia Ul Hasanah', nim: '222313000', kelas: '3SD2' },
  foto: 'assets/foto_aul.jpg',
  batasUrl: 'https://github.com/Alf-Anas/batas-administrasi-indonesia',
};

/* ---------------------------------------------------------------- util */
const D = window.__DATA__, GEO = window.__GEO__, ST = D.stats;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const gd = id => document.getElementById(id);
const nf = (x, d = 2) => Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const ni = x => Math.round(x).toLocaleString('id-ID');
const pct = (x, d = 1) => nf(x * 100, d);
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const median = a => { const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
function ranks(a) { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[o[t][1]] = rk; i = j + 1; } return r; }
function pearson(a, b) { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; } return sab / Math.sqrt(saa * sbb); }
const spearman = (a, b) => pearson(ranks(a), ranks(b));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sgn = (v, d = 2) => (v < 0 ? '\u2212' : '+') + nf(Math.abs(v), d);
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const narrow = () => window.innerWidth < 920;
const shortScr = () => window.innerHeight < 540;
const compact = () => narrow() || shortScr();
const isDesk = () => window.matchMedia('(min-width: 920px) and (min-height: 540px)').matches;
const corrWord = r => (r < 0 ? 'negatif ' : 'positif ') + (Math.abs(r) < .2 ? 'lemah' : Math.abs(r) < .5 ? 'sedang' : 'kuat');
function pretty(s) {
  return s.toLowerCase().replace(/(^|[\s.\-/(])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\bDki\b/, 'DKI').replace(/\bDi\b/, 'DI');
}

/* ---------------------------------------------------------------- data */
const R = D.rows.map((row, i) => { const o = { i }; D.cols.forEach((c, k) => { o[c] = row[k]; }); o.wil = pretty(o.Wilayah); o.prov = pretty(o.Provinsi); return o; });
const N = R.length;
const kd2i = {}; R.forEach(r => { kd2i[r.kdkab] = r.i; });
const PCF = D.features;
const LAB = { RLS_LP: 'RLS total', 'RLS_L-P': 'Selisih RLS', HLS_LP: 'HLS total', 'HLS_L-P': 'Selisih HLS', TPT_LP: 'TPT total', 'TPT_L-P': 'Selisih TPT', TPAK_LP: 'TPAK total', 'TPAK_L-P': 'Selisih TPAK', UHH_LP: 'UHH total', 'UHH_L-P': 'Selisih UHH' };
const UNIT = { RLS_LP: 'tahun', 'RLS_L-P': 'tahun', HLS_LP: 'tahun', 'HLS_L-P': 'tahun', TPT_LP: '%', 'TPT_L-P': 'poin', TPAK_LP: '%', 'TPAK_L-P': 'poin', UHH_LP: 'tahun', 'UHH_L-P': 'tahun' };
const LABLONG = {
  RLS_LP: 'Rata-rata lama sekolah penduduk usia 25 tahun ke atas, laki-laki dan perempuan gabungan.', 'RLS_L-P': 'RLS laki-laki dikurangi RLS perempuan. Positif berarti laki-laki lebih tinggi.',
  HLS_LP: 'Harapan lama sekolah anak usia 7 tahun, laki-laki dan perempuan gabungan.', 'HLS_L-P': 'HLS laki-laki dikurangi HLS perempuan. Positif berarti laki-laki lebih tinggi.',
  TPT_LP: 'Tingkat pengangguran terbuka: persentase penganggur terhadap angkatan kerja, gabungan.', 'TPT_L-P': 'TPT laki-laki dikurangi TPT perempuan. Negatif berarti pengangguran perempuan lebih tinggi.',
  TPAK_LP: 'Tingkat partisipasi angkatan kerja: angkatan kerja terhadap penduduk usia kerja (15 tahun ke atas), gabungan.', 'TPAK_L-P': 'TPAK laki-laki dikurangi TPAK perempuan. Positif berarti partisipasi laki-laki lebih tinggi.',
  UHH_LP: 'Umur harapan hidup saat lahir, laki-laki dan perempuan gabungan.', 'UHH_L-P': 'UHH laki-laki dikurangi UHH perempuan. Negatif berarti perempuan berumur harapan lebih panjang.',
};
const stat = k => R.map(r => r[k]);
const IKGMIN = Math.min(...stat('IKG')), IKGMAX = Math.max(...stat('IKG'));
const IPGMIN = Math.min(...stat('IPG')), IPGMAX = Math.max(...stat('IPG'));
const NAT = {}; PCF.concat(['IKG', 'IPG', 'PC1', 'PC2', 'PC3', 'PC4', 'PC5']).forEach(f => { const v = stat(f); NAT[f] = { m: mean(v), s: sd(v) }; });

/* ---------------------------------------------------------------- palet
 * IKG (makin tinggi makin timpang): merah muda ke merah tua. IPG (makin tinggi makin setara): biru muda ke biru tua.
 * Keduanya sekuensial dengan kecerahan menurun monoton (aman buta warna). Wilayah: palet delapan warna Okabe-Ito. */
const IKG_STOPS = ['#FFF1F0', '#FFC8C3', '#F4898A', '#CF3D5C', '#7E1239'];
const IPG_STOPS = ['#EEF5FF', '#BFD9F8', '#80B1EA', '#3E7FCB', '#14418A'];
const REGIONS = ['SUMATERA', 'JAWA', 'KALIMANTAN', 'SULAWESI', 'BALI & NUSRA', 'MALUKU & PAPUA'];
const RCOL = { 'SUMATERA': '#0072B2', 'JAWA': '#D55E00', 'KALIMANTAN': '#009E73', 'SULAWESI': '#CC79A7', 'BALI & NUSRA': '#E69F00', 'MALUKU & PAPUA': '#56B4E9' };
const RSYM = { 'SUMATERA': 'circle', 'JAWA': 'diamond', 'KALIMANTAN': 'square', 'SULAWESI': 'triangle-up', 'BALI & NUSRA': 'cross', 'MALUKU & PAPUA': 'x' };
const RSVG = { circle: '<circle cx="6" cy="6" r="5"/>', diamond: '<path d="M6 .5L11.5 6L6 11.5L.5 6z"/>', square: '<rect x="1" y="1" width="10" height="10"/>', 'triangle-up': '<path d="M6 .8L11.5 11H.5z"/>', cross: '<path d="M4 .5h4v3.5h3.5v4H8v3.5H4V8H.5V4H4z"/>', x: '<path d="M2.2.5L6 4.3L9.8.5L11.5 2.2L7.7 6L11.5 9.8L9.8 11.5L6 7.7L2.2 11.5L.5 9.8L4.3 6L.5 2.2z"/>' };
const INK = '#1A1630', MUTED = '#5E5978', LINE = '#CFC8DD', GRID = '#EAE4F2', RED = '#C42E4C', BLUE = '#154A94';
const GREY_OFF = '#D6D1E2';
const FF = "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const DIV_SCALE = [[0, '#2166AC'], [0.25, '#92C5DE'], [0.5, '#F7F7F7'], [0.75, '#F4A582'], [1, '#B2182B']];
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function ramp(stops, t) { t = Math.max(0, Math.min(1, t)); const x = t * (stops.length - 1), i = Math.min(Math.floor(x), stops.length - 2), f = x - i, a = hex2rgb(stops[i]), b = hex2rgb(stops[i + 1]); return 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',') + ')'; }
const plScale = stops => stops.map((c, i) => [i / (stops.length - 1), c]);
const STOPS = { IKG: IKG_STOPS, IPG: IPG_STOPS };
const VMIN = { IKG: IKGMIN, IPG: IPGMIN }, VMAX = { IKG: IKGMAX, IPG: IPGMAX };
const VDEC = { IKG: 3, IPG: 2 };
const VNAME = { IKG: 'IKG (Indeks Ketimpangan Gender)', IPG: 'IPG (Indeks Pembangunan Gender)' };
const regionOf = id => id === 'ID' ? '' : id.startsWith('W|') ? id.slice(2) : id.startsWith('P|') ? (R.find(r => r.Provinsi === id.slice(2)) || {}).Wilayah || '' : (R[kd2i[+id.slice(2)]] || {}).Wilayah || '';

/* kata arah menurut indeks: IKG tinggi = timpang; IPG tinggi = setara */
function worse(v, c) { return c === 'IKG' ? v : -v; } // nilai positif berarti kondisi lebih buruk
function cmpPhrase(c, diff, ref) {
  const rel = Math.abs(diff) / (ref || 1);
  if (rel < 0.015) return 'setara dengan';
  return worse(diff, c) > 0 ? (c === 'IKG' ? 'lebih timpang dari' : 'lebih tertinggal dari') : (c === 'IKG' ? 'lebih setara dari' : 'lebih setara dari');
}

/* ---------------------------------------------------------------- Plotly */
const PCFG = { responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: false };
function baseLayout(extra) {
  return Object.assign({ font: { family: FF, size: compact() ? 10.5 : 12, color: INK }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 48, r: 10, t: 8, b: 42 }, hoverlabel: { font: { family: FF, size: 12 }, bgcolor: '#fff', bordercolor: INK, align: 'left' }, showlegend: false }, extra);
}
const axisStyle = e => Object.assign({ gridcolor: GRID, zerolinecolor: LINE, linecolor: LINE, tickfont: { size: compact() ? 9.5 : 11 }, automargin: true }, e);
const draw = (id, data, layout, cfg) => { try { return Plotly.react(gd(id), data, layout, Object.assign({}, PCFG, cfg || {})); } catch (e) { console.warn('Plotly:', id, e && e.message); } };
const srcLine = extra => 'Sumber: BPS' + (META.tahunData ? ', data ' + META.tahunData : '') + (extra ? '. ' + extra : '.');
function resizePlot(id) { const el = gd(id); if (el && el.data && el.offsetParent !== null) { try { Plotly.Plots.resize(el); } catch (e) { /* abaikan */ } } }

/* ---------------------------------------------------------------- kontrol bersama (seg, select, chips) */
const CTRL = {};
function regCtrl(key, get, set) { CTRL[key] = { get, set }; syncCtrl(key); }
function syncCtrl(key) {
  const c = CTRL[key]; if (!c) return; const v = String(c.get());
  $$('.seg[data-seg="' + key + '"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  $$('select[data-sel="' + key + '"]').forEach(s => { if (s.value !== v) s.value = v; });
}
document.addEventListener('click', e => {
  const b = e.target.closest('.seg[data-seg] button');
  if (b) { const key = b.parentNode.dataset.seg; if (CTRL[key]) { CTRL[key].set(b.dataset.v); syncCtrl(key); } closeAdv(b); return; }
  const adv = e.target.closest('[data-adv]');
  if (adv) { const w = adv.parentNode.querySelector('.advwrap'); const open = !w.classList.contains('open'); w.classList.toggle('open', open); adv.setAttribute('aria-expanded', open); return; }
  if (!e.target.closest('.advwrap')) $$('.advwrap.open').forEach(w => { w.classList.remove('open'); const bt = w.parentNode.querySelector('[data-adv]'); if (bt) bt.setAttribute('aria-expanded', 'false'); });
  const act = e.target.closest('[data-act]');
  if (act && ACT[act.dataset.act]) ACT[act.dataset.act]();
});
document.addEventListener('change', e => { const s = e.target.closest('select[data-sel]'); if (s && CTRL[s.dataset.sel]) { CTRL[s.dataset.sel].set(s.value); syncCtrl(s.dataset.sel); closeAdv(s); } });
function closeAdv(el) { const w = el.closest('.advwrap'); if (w && w.classList.contains('open')) { w.classList.remove('open'); const bt = w.parentNode.querySelector('[data-adv]'); if (bt) bt.setAttribute('aria-expanded', 'false'); } }
const ACT = {};
const regionChip = (reg, interactive) => {
  const el = document.createElement(interactive ? 'button' : 'span'); el.className = 'chip'; if (interactive) { el.type = 'button'; el.setAttribute('aria-pressed', 'false'); el.dataset.r = reg; } else el.style.cursor = 'default';
  el.innerHTML = '<svg viewBox="0 0 12 12" fill="' + RCOL[reg] + '" stroke="#1A1630" stroke-width=".6" aria-hidden="true">' + RSVG[RSYM[reg]] + '</svg>' + esc(pretty(reg)) + ' <small>' + R.filter(r => r.Wilayah === reg).length + '</small>';
  return el;
};

/* ---------------------------------------------------------------- tooltip info (ikon i) */
let tipFor = null;
function hideTip() { const t = gd('tipbox'); t.hidden = true; if (tipFor) tipFor.setAttribute('aria-expanded', 'false'); tipFor = null; }
function showTip(btn) {
  const t = gd('tipbox'); t.textContent = btn.dataset.tip; t.hidden = false; btn.setAttribute('aria-expanded', 'true'); tipFor = btn;
  const r = btn.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8), y = r.bottom + 6; if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 6);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
document.addEventListener('click', e => { const b = e.target.closest('.btn-i'); if (b) { e.stopPropagation(); tipFor === b ? hideTip() : showTip(b); } else if (!e.target.closest('#tipbox')) hideTip(); });
document.addEventListener('mouseover', e => { const b = e.target.closest('.btn-i'); if (b && window.matchMedia('(hover: hover)').matches && tipFor !== b) showTip(b); });
document.addEventListener('mouseout', e => { const b = e.target.closest('.btn-i'); if (b && window.matchMedia('(hover: hover)').matches && b.getAttribute('aria-expanded') === 'true' && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#tipbox'))) hideTip(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideTip(); closeSearch(); } });

/* ---------------------------------------------------------------- fokus bersama antarhalaman */
const FOCUS = { region: '', kab: null };
const FSUBS = [];
const onFocus = fn => FSUBS.push(fn);
function renderFocusbar() {
  const f = gd('focusbar'); let h = '';
  if (FOCUS.region) h += '<span class="fchip"><span class="pre">Wilayah:</span> <b>' + esc(pretty(FOCUS.region)) + '</b><button type="button" data-clear="region" aria-label="Hapus fokus wilayah">&times;</button></span>';
  if (FOCUS.kab !== null) h += '<span class="fchip"><span class="pre">Dipilih:</span> <b>' + esc(R[FOCUS.kab].Kabupaten) + '</b><button type="button" data-clear="kab" aria-label="Hapus pilihan kabupaten/kota">&times;</button></span>';
  f.innerHTML = h;
}
gd('focusbar').addEventListener('click', e => { const b = e.target.closest('[data-clear]'); if (!b) return; b.dataset.clear === 'region' ? setRegion('', 'bar') : setKab(null, 'bar'); });
function setRegion(reg, src) { if (FOCUS.region === reg) return; FOCUS.region = reg; renderFocusbar(); FSUBS.forEach(f => f('region', src)); }
function setKab(i, src, opt) {
  if (i !== null && FOCUS.region && R[i].Wilayah !== FOCUS.region) { FOCUS.region = ''; FSUBS.forEach(f => f('region', 'auto')); } // pilihan di luar fokus wilayah: lepas fokus wilayah
  FOCUS.kab = i; renderFocusbar(); FSUBS.forEach(f => f('kab', src, opt || {}));
}

/* ---------------------------------------------------------------- pencarian kabupaten/kota (combobox) */
const sbIn = gd('sbInput'), sbList = gd('sbList'), sbClear = gd('sbClear'), sbWrap = gd('gsearch');
let sbItems = [], sbAct = -1;
const norm = s => s.toLowerCase().replace(/[.,]/g, '').replace(/\bkab\b/g, 'kabupaten').replace(/\bkep\b/g, 'kepulauan').replace(/\s+/g, ' ').trim();
const POPORDER = R.slice().sort((a, b) => b.Penduduk - a.Penduduk);
function sbMatches(q) {
  q = norm(q); if (!q) return POPORDER.slice(0, 8);
  const toks = q.split(' '), out = [];
  R.forEach(r => { const nm = norm(r.Kabupaten), full = nm + ' ' + norm(r.prov); if (!toks.every(t => full.includes(t))) return;
    const bare = nm.replace(/^(kota|kabupaten) /, ''); const sc = nm.startsWith(q) ? 0 : bare.startsWith(q) ? 1 : nm.includes(q) ? 2 : 3; out.push([sc, r]); });
  out.sort((a, b) => a[0] - b[0] || a[1].Kabupaten.localeCompare(b[1].Kabupaten)); return out.slice(0, 8).map(x => x[1]);
}
function sbRender() {
  const q = sbIn.value; sbItems = sbMatches(q); sbAct = sbItems.length ? 0 : -1;
  sbList.innerHTML = (q.trim() ? '' : '<li class="sb-hd" role="presentation">Terpadat penduduknya</li>') +
    (sbItems.length ? sbItems.map((r, k) => '<li role="option" id="sbo' + k + '" data-i="' + r.i + '" aria-selected="' + (k === 0) + '"><b>' + esc(r.Kabupaten) + '</b><small>' + esc(r.prov) + ' · ' + esc(r.wil) + '</small></li>').join('') : '<li class="sb-empty" role="presentation">Tidak ada kabupaten/kota yang cocok</li>');
  sbPlace(); sbList.hidden = false; sbIn.setAttribute('aria-expanded', 'true'); sbClear.hidden = !q;
  sbIn.setAttribute('aria-activedescendant', sbItems.length ? 'sbo0' : '');
}
function sbPlace() {
  const r = sbIn.closest('.sb').getBoundingClientRect(), vv = window.visualViewport, vh = vv ? vv.height : window.innerHeight, below = vh - r.bottom - 10, above = r.top - 10;
  sbList.style.minWidth = Math.max(250, r.width) + 'px'; sbList.style.left = Math.max(8, Math.min(r.left, window.innerWidth - sbList.offsetWidth - 8)) + 'px';
  if (below < 190 && above > below) { sbList.style.maxHeight = Math.min(280, above) + 'px'; sbList.style.top = 'auto'; sbList.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
  else { sbList.style.maxHeight = Math.min(280, below) + 'px'; sbList.style.bottom = 'auto'; sbList.style.top = (r.bottom + 6) + 'px'; }
}
function sbMove(d) { if (!sbItems.length) return; sbAct = (sbAct + d + sbItems.length) % sbItems.length; $$('#sbList li[role="option"]').forEach((li, k) => { li.setAttribute('aria-selected', k === sbAct); if (k === sbAct) { li.scrollIntoView({ block: 'nearest' }); sbIn.setAttribute('aria-activedescendant', li.id); } }); }
function sbPick(i) { const r = R[i]; sbIn.value = r.Kabupaten; sbClear.hidden = false; closeSearch(); setKab(i, 'search', { zoom: true }); sbIn.blur(); }
function closeSearch() { sbList.hidden = true; sbIn.setAttribute('aria-expanded', 'false'); if (narrow()) sbWrap.classList.remove('open'); }
sbIn.addEventListener('focus', sbRender);
sbIn.addEventListener('input', sbRender);
sbIn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (sbList.hidden) sbRender(); else sbMove(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sbMove(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); if (sbItems[sbAct]) sbPick(sbItems[sbAct].i); }
  else if (e.key === 'Escape') { closeSearch(); }
});
sbList.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); sbPick(+li.dataset.i); } });
sbClear.addEventListener('click', () => { sbIn.value = ''; sbClear.hidden = true; sbIn.focus(); sbRender(); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#gsearch') && !e.target.closest('#sbList')) { if (!sbList.hidden) closeSearch(); } });
gd('sbToggle').addEventListener('click', () => { sbWrap.classList.toggle('open'); if (sbWrap.classList.contains('open')) setTimeout(() => sbIn.focus(), 30); else closeSearch(); });
window.addEventListener('resize', () => { if (!sbList.hidden) sbPlace(); });

/* ---------------------------------------------------------------- insight (interpretasi dinamis) */
function renderInsight(el, o) {
  el._ctas = o.cta || [];
  const cta = el._ctas.map((c, k) => '<button type="button" class="pill ' + (c.main ? 'cta' : '') + '" data-cta="' + k + '">' + c.label + '</button>').join('');
  el.innerHTML = '<div class="ins-top"><span class="ins-k">Apa artinya</span>' + (o.scope || []).map(s => '<span class="ins-scope">' + s + '</span>').join('') + '</div>' +
    '<div class="ins-body">' + (o.big ? '<div class="bigstat ' + (o.big.tone || '') + '"><span class="v">' + o.big.v + '</span><span class="k">' + o.big.k + '</span></div>' : '') + (o.extra || '') + '<p class="ins-head">' + o.head + '</p><ul class="ins-list">' +
    (o.items || []).map((it, k) => '<li class="' + (it[2] ? 'opt' : '') + '"><span class="tag ' + it[0] + '">' + ({ fakta: 'Fakta', inferensi: 'Inferensi', catatan: 'Catatan' })[it[0]] + '</span>' + it[1] + '</li>').join('') + '</ul></div>' +
    (cta ? '<div class="ins-cta">' + cta + '</div>' : '');
  fitInsight(el);
}
function fitInsight(el) {
  const body = $('.ins-body', el); if (!body) return;
  el.style.removeProperty('--ins-fs'); body.classList.remove('scroll'); $$('.hide', body).forEach(l => l.classList.remove('hide'));
  if (!isDesk()) return; // mode gulir: tampilkan seluruh isi
  const over = () => body.scrollHeight > body.clientHeight + 1;
  if (!over()) return;
  $$('.opt', body).forEach(l => l.classList.add('hide')); if (!over()) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  for (let fs = base - .5; fs >= 11; fs -= .5) { el.style.setProperty('--ins-fs', fs + 'px'); if (!over()) return; }
  const bs = $('.bigstat', body); if (bs) { bs.classList.add('hide'); if (!over()) return; }
  const lis = $$('li', body); for (let k = lis.length - 1; k >= 2 && over(); k--) lis[k].classList.add('hide');
  if (over()) body.classList.add('scroll');
}
document.addEventListener('click', e => { const c = e.target.closest('[data-cta]'); if (c) { const el = c.closest('.insight'), f = el && el._ctas && el._ctas[+c.dataset.cta]; if (f && f.fn) f.fn(); } });
const insightScope = () => { const s = []; if (FOCUS.region) s.push(esc(pretty(FOCUS.region))); return s; };

/* ringkasan subset: simpangan terbakukan terhadap nasional */
function subsetStats(idx) {
  const rows = idx.map(i => R[i]), m = f => mean(rows.map(r => r[f]));
  const dev = PCF.map(f => ({ f, v: m(f), z: (m(f) - NAT[f].m) / NAT[f].s })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return { n: rows.length, ikg: m('IKG'), ipg: m('IPG'), pc: [1, 2, 3, 4, 5].map(k => m('PC' + k)), dev };
}
const fmtDev = d => LAB[d.f] + ' ' + (d.z < 0 ? 'lebih rendah' : 'lebih tinggi');

/* ---------------------------------------------------------------- shell: halaman dan navigasi */
const TABS = ['home', 'hierarki', 'geospasial', 'multivariat'];
const TABNAME = { home: 'Home', hierarki: 'Hierarki', geospasial: 'Geospasial', multivariat: 'Multivariat' };
const PAGES = {
  home: [['Ringkasan'], ['Cara membaca'], ['Sumber dan identitas']],
  hierarki: [['Besaran'], ['Peringkat']],
  geospasial: [['Sebaran'], ['Pengelompokan']],
  multivariat: [['Proyeksi'], ['Komponen'], ['Profil'], ['Keterkaitan']],
};
const FLAT = []; TABS.forEach(t => PAGES[t].forEach((p, k) => FLAT.push([t, k])));
const NAV = { tab: 'home', idx: 0 };
const HOOKS = {}; // id -> {init, show}
const inited = {};
function pageId(t, k) { return t + '-' + k; }
function go(tab, idx, push) {
  if (!PAGES[tab]) tab = 'home'; idx = Math.max(0, Math.min(PAGES[tab].length - 1, idx || 0));
  hideTip(); closeSearch();
  NAV.tab = tab; NAV.idx = idx;
  TABS.forEach(t => { const on = t === tab; $('#tabpane-' + t).classList.toggle('on', on); [gd('tab-' + t), gd('mtab-' + t)].forEach(a => { a.setAttribute('aria-selected', on); a.tabIndex = on ? 0 : -1; }); });
  PAGES[tab].forEach((p, k) => gd('pg-' + pageId(tab, k)).classList.toggle('on', k === idx));
  renderPager();
  const id = pageId(tab, idx), h = HOOKS[id];
  if (h) { if (!inited[id]) { inited[id] = true; h.init && h.init(); } h.show && h.show(); }
  requestAnimationFrame(() => requestAnimationFrame(() => { $$('#pg-' + id + ' .insight').forEach(fitInsight); resizeAll(); }));
  const hash = '#' + tab + (idx ? '/' + (idx + 1) : ''); if (push && location.hash !== hash) history.pushState(null, '', hash);
  document.title = TABNAME[tab] + ' · ' + PAGES[tab][idx][0] + ' | Ketimpangan Gender Indonesia';
}
function renderPager() {
  const pg = PAGES[NAV.tab];
  gd('pbWhere').innerHTML = '<b>' + TABNAME[NAV.tab] + '</b> / ' + esc(pg[NAV.idx][0]);
  gd('pbDots').innerHTML = pg.map((p, k) => '<button type="button" role="tab" data-k="' + k + '" aria-label="Halaman ' + (k + 1) + ': ' + esc(p[0]) + '" aria-current="' + (k === NAV.idx) + '"></button>').join('');
  const pos = FLAT.findIndex(f => f[0] === NAV.tab && f[1] === NAV.idx), nx = FLAT[pos + 1], pv = FLAT[pos - 1];
  gd('pbPrev').disabled = !pv; gd('pbNext').disabled = !nx;
  gd('pbNextLab').textContent = nx ? (nx[0] !== NAV.tab ? TABNAME[nx[0]] : PAGES[nx[0]][nx[1]][0]) : 'Selesai';
}
const step = d => { const pos = FLAT.findIndex(f => f[0] === NAV.tab && f[1] === NAV.idx), n = FLAT[pos + d]; if (n) go(n[0], n[1], true); };
gd('pbPrev').addEventListener('click', () => step(-1));
gd('pbNext').addEventListener('click', () => step(1));
gd('pbDots').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) go(NAV.tab, +b.dataset.k, true); });
document.addEventListener('click', e => { const a = e.target.closest('a[data-tab], a.brand'); if (a) { e.preventDefault(); go(a.dataset.tab || 'home', 0, true); } });
document.addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); });
function parseHash() { const m = location.hash.slice(1).split('/'); return [TABS.includes(m[0]) ? m[0] : 'home', Math.max(0, (parseInt(m[1], 10) || 1) - 1)]; }
window.addEventListener('popstate', () => { const [t, k] = parseHash(); go(t, k, false); });
window.addEventListener('hashchange', () => { const [t, k] = parseHash(); if (t !== NAV.tab || k !== NAV.idx) go(t, k, false); });

/* ukuran: amati kontainer grafik */
let rzT = null;
function resizeAll() {
  $$('#pg-' + pageId(NAV.tab, NAV.idx) + ' .chart [id^="plot"]').forEach(el => resizePlot(el.id));
  const gh = HOOKS['geospasial-0']; if (gh && gh.resize && NAV.tab === 'geospasial' && NAV.idx === 0) gh.resize();
}
const RO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(() => { resizeAll(); $$('.tabpane.on .pg.on .insight').forEach(fitInsight); }, 90); }) : null;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { REDRAW_ON_RESIZE(); resizeAll(); $$('.tabpane.on .pg.on .insight').forEach(fitInsight); }, 120); });
let lastCompact = compact();
function REDRAW_ON_RESIZE() { if (compact() !== lastCompact) { lastCompact = compact(); Object.keys(HOOKS).forEach(id => { if (inited[id] && 'dirty' in HOOKS[id]) HOOKS[id].dirty = true; }); const h = HOOKS[pageId(NAV.tab, NAV.idx)]; if (h && h.show) h.show(); } }
