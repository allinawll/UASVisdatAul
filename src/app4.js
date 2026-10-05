
/* ============================================================================
 * GEOSPASIAL (Leaflet). Satu renderer kanvas bersama untuk poligon, simbol, dan sorotan.
 * ========================================================================== */
const G = { var: 'IPG', method: 'quantile', cls: null, reg: '', sel: null, map: null, cv: null, choro: null, bubbles: null, hoverL: null, selL: null, polyByI: {}, bubByI: {}, layerMode: 'choro' };
const FEAT = {}; GEO.features.forEach(f => { FEAT[kd2i[f.properties.kdkab]] = f; });
const bins = () => D.breaks[G.var][G.method];
function classOf(v) { const b = bins(); for (let i = 0; i < b.length; i++) if (v <= b[i] + 1e-9) return i; return b.length - 1; }
const gcol = c => STOPS[G.var][c];
const dimmed = (r, c) => (G.cls !== null && c !== G.cls) || (G.reg && r.Wilayah !== G.reg);
const polyStyle = r => { const c = classOf(r[G.var]); return { fillColor: gcol(c), fillOpacity: dimmed(r, c) ? .16 : .94, color: '#FFFFFF', weight: .35, opacity: 1 }; };
const bubStyle = r => { const c = classOf(r[G.var]), d = dimmed(r, c); return { fillColor: gcol(c), fillOpacity: d ? .1 : .8, color: d ? 'rgba(26,22,48,.25)' : INK, weight: .7, opacity: 1 }; };
const tipHtml = r => '<b>' + esc(r.Kabupaten) + '</b><br>' + esc(r.prov) + '<br>IKG ' + nf(r.IKG, 3) + ' | IPG ' + nf(r.IPG, 2) + '<br>PDRB ' + ni(r.PDRB) + ' miliar rupiah';
const PDRBMAX = Math.max(...stat('PDRB'));
const bubR = r => Math.max(2.2, (compact() ? 18 : 26) * Math.sqrt(r.PDRB / PDRBMAX));
const hlCache = {};
function hlLayer(i, kind) { const key = kind + i; if (!hlCache[key]) hlCache[key] = L.geoJSON(FEAT[i], { interactive: false, renderer: G.cv, style: kind === 'sel' ? { fill: false, color: INK, weight: 3.2, opacity: 1 } : { fill: false, color: INK, weight: 1.8, opacity: .9 } }); return hlCache[key]; }
const topOverlays = () => { [G.hoverL, G.selL].forEach(g => g && g.eachLayer(fg => fg.eachLayer && fg.eachLayer(p => p.bringToFront && p.bringToFront()))); };
const hoverOn = i => { G.hoverL.clearLayers(); G.hoverL.addLayer(hlLayer(i, 'hover')); topOverlays(); };
const hoverOff = () => { if (G.hoverL) G.hoverL.clearLayers(); };
const drawSel = () => { if (!G.selL) return; G.selL.clearLayers(); if (G.sel !== null) { G.selL.addLayer(hlLayer(G.sel, 'sel')); topOverlays(); } };

function geoPick(i, zoom) { // pilih dari peta atau pencarian
  if (G.map && zoom && G.reg && R[i].Wilayah !== G.reg) { G.reg = ''; setRegion('', 'geo'); syncCtrl('gReg'); restyleGeo(); }
  G.sel = i; if (G.map) { drawSel(); if (zoom && G.polyByI[i]) G.map.fitBounds(G.polyByI[i].getBounds(), { maxZoom: 9, padding: [40, 40] }); }
  geoRefresh();
}
function legendCounts() { const b = bins(), cnt = new Array(b.length).fill(0); R.forEach(r => { cnt[classOf(r[G.var])]++; }); return cnt; }
function renderLegend() {
  const b = bins(), d = VDEC[G.var], cnt = legendCounts();
  gd('legend').innerHTML = b.map((hi, i) => { const lo = i ? b[i - 1] : VMIN[G.var]; return '<button type="button" data-c="' + i + '" aria-pressed="' + (G.cls === i) + '" title="Klik untuk menyorot kelas ini"><span class="sw" style="background:' + gcol(i) + '"></span>' + nf(lo, d) + '\u2013' + nf(hi, d) + ' <small style="color:#5E5978">(' + cnt[i] + ')</small></button>'; }).join('');
  bubbleKey();
}
gd('legend').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (!b) return; const c = +b.dataset.c; G.cls = G.cls === c ? null : c; restyleGeo(); });
function bubbleKey() {
  const on = G.map && G.map.hasLayer(G.bubbles), el = gd('bubbleKey'); el.style.display = on ? 'flex' : 'none'; if (!on) return;
  const rMax = compact() ? 18 : 26, vals = [10000, 100000, 500000], w = 2 * rMax + 4;
  el.innerHTML = '<span>Luas lingkaran = PDRB (miliar rupiah):</span><svg width="' + (w + 8) + '" height="' + w + '" aria-hidden="true">' + vals.map(v => { const r = rMax * Math.sqrt(v / PDRBMAX); return '<circle cx="' + (w / 2) + '" cy="' + (w - r - 1) + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="1"/>'; }).join('') + '</svg><span>' + vals.map(ni).join(' | ') + '</span>';
}
function restyleGeo() { if (!G.map) return; G.choro.setStyle(f => polyStyle(R[kd2i[f.properties.kdkab]])); Object.values(G.bubByI).forEach(m => m.setStyle(bubStyle(R[m._i]))); renderLegend(); topOverlays(); geoRefresh(); }
function setLayers(v) { G.layerMode = v; if (!G.map) return; hoverOff(); [G.choro, G.bubbles].forEach(l => { if (G.map.hasLayer(l)) G.map.removeLayer(l); }); if (v !== 'bubble') G.map.addLayer(G.choro); if (v !== 'choro') G.map.addLayer(G.bubbles); topOverlays(); bubbleKey(); }
function fitRegion() {
  if (!G.map) return; const b = L.latLngBounds([]);
  Object.entries(G.polyByI).forEach(([i, l]) => { if (!G.reg || R[i].Wilayah === G.reg) b.extend(l.getBounds()); });
  if (b.isValid()) G.map.fitBounds(b, { padding: [16, 16], maxZoom: 8 });
}
regCtrl('gVar', () => G.var, v => { G.var = v; G.cls = null; restyleGeo(); geoMoranDirty(); });
regCtrl('gMethod', () => G.method, v => { G.method = v; G.cls = null; restyleGeo(); });
regCtrl('gLayer', () => G.layerMode, v => setLayers(v));
regCtrl('gReg', () => G.reg, v => { G.reg = v; restyleGeo(); fitRegion(); setRegion(v, 'geo'); geoMoranDirty(); });
ACT.gReset = () => { G.cls = null; G.reg = ''; G.sel = null; syncCtrl('gReg'); hoverOff(); drawSel(); setRegion('', 'geo'); setKab(null, 'geo'); restyleGeo(); if (G.map) G.map.fitBounds(G.base.getBounds(), { padding: [10, 10] }); };
$$('select[data-sel="gReg"]').forEach(s => { s.innerHTML = '<option value="">Semua wilayah</option>' + REGIONS.map(p => '<option value="' + esc(p) + '">' + esc(pretty(p)) + '</option>').join(''); });

/* ---------- profil singkat kabupaten/kota terpilih ---------- */
function profileMini(i) {
  const r = R[i], rkK = R.slice().sort((a, b) => a.IKG - b.IKG).findIndex(x => x.i === i) + 1, rkG = R.slice().sort((a, b) => b.IPG - a.IPG).findIndex(x => x.i === i) + 1;
  return '<div class="mini"><h4>' + esc(r.Kabupaten) + '</h4><div class="sub">' + esc(r.prov) + ' \u00B7 ' + esc(r.wil) + '</div><div class="nums"><span><b>' + nf(r.IKG, 3) + '</b> IKG (urutan ' + rkK + ' dari ' + N + ', terendah = 1)</span><span><b>' + nf(r.IPG, 1) + '</b> IPG (urutan ' + rkG + ', tertinggi = 1)</span></div></div>';
}
const GMETHOD = { quantile: 'kuantil', natural: 'natural breaks', equal: 'interval sama' };
function insightGE0() {
  const v = G.var, o = v === 'IKG' ? 'IPG' : 'IKG', rows = R.filter(r => !G.reg || r.Wilayah === G.reg), scope = G.reg ? pretty(G.reg) : 'seluruh Indonesia', vd = VDEC[v];
  const m = mean(rows.map(r => r[v])), mN = mean(R.map(r => r[v])), words = extremeWords(v);
  const sorted = rows.slice().sort((a, b) => b[v] - a[v]), k = Math.min(3, Math.floor(rows.length / 2));
  const badTop = v === 'IKG' ? sorted.slice(0, k) : sorted.slice(-k).reverse(), goodTop = v === 'IKG' ? sorted.slice(-k).reverse() : sorted.slice(0, k);
  const nm = r => esc(r.Kabupaten);
  const flag = v === 'IKG' ? rows.filter(r => r.IKG >= .5) : rows.filter(r => r.IPG < 90), flagTxt = v === 'IKG' ? 'ber-IKG 0,5 atau lebih' : 'ber-IPG di bawah 90';
  const flagReg = {}; flag.forEach(r => { flagReg[r.wil] = (flagReg[r.wil] || 0) + 1; }); const topReg = Object.entries(flagReg).sort((a, b) => b[1] - a[1])[0];
  const head = (G.reg ? esc(scope) + ' ' + cmpPhrase(v, m - mN, mN) + ' nasional: ' : '') + flag.length + ' dari ' + rows.length + ' kab/kota ' + flagTxt + (topReg && !G.reg ? ', terbanyak di ' + esc(topReg[0]) : '') + '.';
  const items = [];
  items.push(['fakta', words[0].charAt(0).toUpperCase() + words[0].slice(1) + ': ' + badTop.map(nm).join(', ') + '. ' + words[1].charAt(0).toUpperCase() + words[1].slice(1) + ': ' + goodTop.map(nm).join(', ') + '.']);
  if (G.cls !== null) { const sub = rows.filter(r => classOf(r[v]) === G.cls), pp = sub.reduce((a, r) => a + r.Penduduk, 0) / rows.reduce((a, r) => a + r.Penduduk, 0) * 100;
    items.push(['fakta', 'Kelas yang disorot: ' + sub.length + ' kab/kota, ' + nf(pp, 1) + '% penduduk' + (sub.length ? ', terbanyak di ' + esc(Object.entries(sub.reduce((a, r) => { a[r.wil] = (a[r.wil] || 0) + 1; return a; }, {})).sort((x, y) => y[1] - x[1])[0][0]) : '') + '.']); }
  const rho = spearman(rows.map(r => r.IKG), rows.map(r => r.IPG));
  items.push(['inferensi', 'IKG dan IPG berkorelasi ' + corrWord(rho) + ': ' + (rho <= -.3 ? 'daerah ber-IKG tinggi cenderung ber-IPG rendah, sehingga peta ' + o + ' memberi gambaran searah.' : rho >= .3 ? 'hubungan searah yang tak lazim; cek ke sumber.' : 'kedua peta menangkap aspek berbeda dan perlu dibaca berdampingan.') + ' Asosiasi, bukan sebab akibat.']);
  items.push(['catatan', 'Klasifikasi ' + GMETHOD[G.method] + (G.method === 'quantile' ? ': kelas berukuran hampir sama dan paling sesuai untuk membaca peta umum (Brewer dan Pickle, 2002).' : ': batas kelas bergantung pada metode; bandingkan dengan kuantil sebelum menyimpulkan.'), true]);
  return { scope: [esc(scope), v + ' \u00B7 ' + GMETHOD[G.method]], big: { v: nf(m, vd), k: v + ' rata-rata sederhana' + (G.reg ? '<br>nasional ' + nf(mN, vd) : ''), tone: v.toLowerCase() }, head, extra: G.sel !== null ? profileMini(G.sel) : '', items, cta: [{ label: 'Apakah daerah serupa berdekatan? \u2192', main: true, fn: () => go('geospasial', 1, true) }] };
}

/* ---------- Moran: diagram sebar dan interpretasi ---------- */
const QN = { HH: 'Tinggi-Tinggi', LL: 'Rendah-Rendah', HL: 'Tinggi-Rendah', LH: 'Rendah-Tinggi' };
const QCOL = { HH: '#C42E4C', LL: '#2F73D0', HL: '#E69F00', LH: '#8E88A6' }, QSYM = { HH: 'circle', LL: 'square', HL: 'diamond', LH: 'triangle-up' };
function geoMoranDirty() { HOOKS['geospasial-1'].dirty = true; if (NAV.tab === 'geospasial' && NAV.idx === 1) HOOKS['geospasial-1'].show(); }
function drawMoran() {
  const v = G.var, reg = G.reg, m = moranFor(v, reg);
  const cnt = { HH: 0, LL: 0, HL: 0, LH: 0 }; m.quad.forEach(q => { cnt[q]++; });
  const tr = Object.keys(QN).map(q => { const ix = m.quad.map((x, a) => x === q ? a : -1).filter(a => a >= 0);
    return { type: 'scatter', mode: 'markers', name: QN[q] + ' (' + cnt[q] + ')', x: ix.map(a => m.zs[a]), y: ix.map(a => m.lag[a]), text: ix.map(a => R[m.idx[a]].Kabupaten), customdata: ix.map(a => [m.idx[a], R[m.idx[a]].prov]),
      marker: { color: QCOL[q], symbol: QSYM[q], size: compact() ? 6 : 8, opacity: .85, line: { width: .6, color: '#fff' } }, hovertemplate: '<b>%{text}</b><br>%{customdata[1]}<br>z = %{x:.2f}; rata-rata tetangga = %{y:.2f}<extra>' + QN[q] + '</extra>' }; });
  const xmin = Math.min(...m.zs), xmax = Math.max(...m.zs);
  tr.push({ type: 'scatter', mode: 'lines', x: [xmin, xmax], y: [m.I * xmin, m.I * xmax], line: { color: INK, width: 1.6, dash: 'dash' }, hoverinfo: 'skip', showlegend: false });
  const sa = G.sel !== null ? m.idx.indexOf(G.sel) : -1;
  if (sa >= 0) tr.push({ type: 'scatter', mode: 'markers+text', x: [m.zs[sa]], y: [m.lag[sa]], text: [R[G.sel].Kabupaten], textposition: 'top center', textfont: { size: 11, color: INK }, hoverinfo: 'skip', showlegend: false, marker: { size: 16, color: 'rgba(0,0,0,0)', line: { width: 2.6, color: INK } } });
  const qa = (q, x, y, xa, ya) => ({ xref: 'paper', yref: 'paper', x, y, xanchor: xa, yanchor: ya, text: '<b>' + QN[q] + '</b> ' + cnt[q], showarrow: false, font: { size: compact() ? 9.5 : 11.5, color: q === 'LH' ? '#5E5978' : QCOL[q] }, bgcolor: 'rgba(255,255,255,.7)' });
  draw('plotMoran', tr, baseLayout({ showlegend: false,
    xaxis: axisStyle({ title: { text: 'Nilai ' + v + ' terbakukan (z)', font: { size: 11.5 } }, zeroline: true }), yaxis: axisStyle({ title: { text: 'Rata-rata z tetangga', font: { size: 11.5 } }, zeroline: true }),
    annotations: [qa('HH', .99, .99, 'right', 'top'), qa('LH', .01, .99, 'left', 'top'), qa('LL', .01, .01, 'left', 'bottom'), qa('HL', .99, .01, 'right', 'bottom')],
    margin: { l: 50, r: 10, t: 8, b: 44 }, dragmode: false }));
  const el = gd('plotMoran'); if (!el._mb) { el._mb = true; el.on('plotly_click', ev => { const p = ev.points && ev.points[0]; if (p && p.customdata) { setKab(p.customdata[0], 'geo', { zoom: false }); } }); }
}
function insightGE1() {
  const v = G.var, reg = G.reg, m = moranFor(v, reg), ov = v === 'IKG' ? 'IPG' : 'IKG', o = moranFor(ov, reg), scope = reg ? pretty(reg) : 'seluruh Indonesia';
  const cnt = { HH: 0, LL: 0, HL: 0, LH: 0 }; m.quad.forEach(q => { cnt[q]++; });
  const sig = m.p < .05, pos = m.I > 0, strength = Math.abs(m.I) < .2 ? 'lemah' : Math.abs(m.I) < .5 ? 'sedang' : 'kuat';
  const pattern = !sig ? 'tidak berbeda nyata dari sebaran acak' : pos ? 'pengelompokan spasial positif (' + strength + ')' : 'pola tersebar (dispersi) yang ' + strength;
  const grp = q => { const c = {}; m.idx.forEach((i, a) => { if (m.quad[a] === q) { const g = reg ? R[i].prov : R[i].wil; c[g] = (c[g] || 0) + 1; } }); const e = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return e ? e[0] : '-'; };
  const clus = (cnt.HH + cnt.LL) / m.n * 100;
  const meaning = !sig ? 'Pada lingkup ini tidak ada bukti bahwa nilai ' + v + ' yang mirip saling berdekatan.' : !pos ? 'Daerah bertetangga cenderung bernilai ' + v + ' berlawanan.' :
    v === 'IKG' ? 'Daerah ber-IKG tinggi bertetangga dengan sesamanya, begitu pula yang rendah, sehingga ketimpangan terkonsentrasi di cluster geografis.' : 'Daerah dengan IPM perempuan tertinggal (IPG rendah) cenderung berdekatan, begitu pula yang mendekati paritas, sehingga kesenjangan membentuk cluster geografis.';
  const big = { v: nf(m.I, 2), k: 'Moran\'s I ' + v + ' \u00B7 ' + esc(scope) + '<br>' + fmtP(m.p) + ' \u00B7 ' + m.n + ' kab/kota', tone: !sig ? 'ns' : v.toLowerCase() };
  const items = [
    ['fakta', 'Sebagian besar (' + nf(clus, 0) + '%) berada di kuadran Tinggi-Tinggi atau Rendah-Rendah. Tinggi-Tinggi terbanyak di ' + esc(grp('HH')) + ', Rendah-Rendah di ' + esc(grp('LL')) + '.'],
    ['inferensi', meaning + (sig && pos ? ' Penyebab tidak dapat ditentukan dari data ini.' : '')],
    ['fakta', 'Pembanding: Moran\'s I ' + ov + ' pada lingkup yang sama ' + (o.p < .05 ? (o.I > 0 ? 'juga positif' : 'negatif') : 'tidak nyata') + ' (' + nf(o.I, 2) + ').', true],
    ['catatan', 'Bobot ' + m.kk + ' tetangga terdekat dari titik pusat poligon, ' + MORAN_PERM + ' permutasi. Batas kekuatan hanya heuristik.', true],
  ];
  if (G.sel !== null && m.idx.indexOf(G.sel) >= 0) { const a = m.idx.indexOf(G.sel); items.unshift(['fakta', '<b>' + esc(R[G.sel].Kabupaten) + '</b> berada di kuadran ' + QN[m.quad[a]] + ': nilainya ' + (m.zs[a] >= 0 ? 'di atas' : 'di bawah') + ' rata-rata dan tetangganya ' + (m.lag[a] >= 0 ? 'juga di atas' : 'di bawah') + ' rata-rata.']); }
  return { scope: [esc(scope), v], big, head: 'Moran\'s I ' + v + ' ' + (reg ? 'di ' + esc(scope) : 'nasional') + ': ' + pattern + '.', items, cta: [{ label: 'Seperti apa profil daerahnya? \u2192', main: true, fn: () => go('multivariat', 0, true) }, { label: '\u2190 Kembali ke peta', fn: () => go('geospasial', 0, true) }] };
}
function geoRefresh() {
  if (NAV.tab !== 'geospasial') return;
  if (NAV.idx === 0) renderInsight(gd('insGE0'), insightGE0()); else renderInsight(gd('insGE1'), insightGE1());
}
HOOKS['geospasial-0'] = { dirty: false, init() {
  const m = L.map('map', { preferCanvas: true, zoomSnap: .25, minZoom: 3, maxZoom: 11, zoomControl: true, attributionControl: false }); G.map = m;
  { const md = gd('mapDrag'), dragOn = !(isTouch && !isDesk()); if (!dragOn) m.dragging.disable(); md.setAttribute('aria-pressed', dragOn); md.classList.toggle('on', dragOn); md.textContent = dragOn ? 'Geser peta: aktif' : 'Geser peta: mati';
    md.addEventListener('click', () => { const on = md.getAttribute('aria-pressed') !== 'true'; md.setAttribute('aria-pressed', on); md.classList.toggle('on', on); on ? m.dragging.enable() : m.dragging.disable(); md.textContent = on ? 'Geser peta: aktif' : 'Geser peta: mati'; }); }
  G.cv = L.canvas({ padding: .3 });
  G.base = L.geoJSON(GEO, { style: { fillColor: '#E4DDF0', fillOpacity: 1, color: '#fff', weight: .3 }, interactive: false, renderer: G.cv }).addTo(m);
  G.choro = L.geoJSON(GEO, { renderer: G.cv, style: f => polyStyle(R[kd2i[f.properties.kdkab]]), onEachFeature: (f, layer) => {
    const r = R[kd2i[f.properties.kdkab]]; G.polyByI[r.i] = layer; layer.bindTooltip(tipHtml(r), { sticky: true, className: 'tt', direction: 'top', opacity: 1 });
    layer.on({ mouseover: () => hoverOn(r.i), mouseout: hoverOff, click: () => setKab(r.i, 'geo', { zoom: false }) }); } }).addTo(m);
  G.bubbles = L.layerGroup(); G.bubByI = {};
  R.slice().sort((a, b) => b.PDRB - a.PDRB).forEach(r => { const mk = L.circleMarker([r.lat, r.lon], Object.assign({ radius: bubR(r), renderer: G.cv }, bubStyle(r))); mk._i = r.i; mk.bindTooltip(tipHtml(r), { sticky: true, className: 'tt', direction: 'top', opacity: 1 }); mk.on({ mouseover: () => hoverOn(r.i), mouseout: hoverOff, click: () => setKab(r.i, 'geo', { zoom: false }) }); G.bubbles.addLayer(mk); G.bubByI[r.i] = mk; });
  G.hoverL = L.layerGroup().addTo(m); G.selL = L.layerGroup().addTo(m);
  m.fitBounds(G.base.getBounds(), { padding: [10, 10] });
  setLayers(G.layerMode); if (G.sel !== null) drawSel(); renderLegend(); if (RO) RO.observe(gd('map').parentNode);
}, resize() { if (G.map) G.map.invalidateSize(); }, show() { if (!G.map) return; G.map.invalidateSize(); if (G.fitPending) { fitRegion(); G.fitPending = false; } if (G.zoomPending && FOCUS.kab !== null && G.polyByI[FOCUS.kab]) { G.map.fitBounds(G.polyByI[FOCUS.kab].getBounds(), { maxZoom: 9, padding: [40, 40] }); G.zoomPending = false; } renderLegend(); geoRefresh(); } };
HOOKS['geospasial-1'] = { dirty: true, init() {}, show() { if (this.dirty) { this.dirty = false; drawMoran(); } resizePlot('plotMoran'); geoRefresh(); } };
onFocus((what, src, opt) => {
  if (src === 'geo') { if (what === 'kab') { G.sel = FOCUS.kab; drawSel(); geoRefresh(); HOOKS['geospasial-1'].dirty = true; if (NAV.tab === 'geospasial' && NAV.idx === 1) HOOKS['geospasial-1'].show(); } return; }
  if (what === 'region') { G.reg = FOCUS.region; syncCtrl('gReg'); if (G.map) { restyleGeo(); G.fitPending = true; } geoMoranDirty(); }
  if (what === 'kab') { G.sel = FOCUS.kab; if (G.map) { drawSel(); if (FOCUS.kab !== null && opt && opt.zoom && G.polyByI[FOCUS.kab]) { if (NAV.tab === 'geospasial' && NAV.idx === 0) G.map.fitBounds(G.polyByI[FOCUS.kab].getBounds(), { maxZoom: 9, padding: [40, 40] }); else G.zoomPending = true; } } HOOKS['geospasial-1'].dirty = true; if (NAV.tab === 'geospasial') { geoRefresh(); if (NAV.idx === 1) HOOKS['geospasial-1'].show(); } }
});
