
/* ============================================================================
 * HIERARKI
 * ========================================================================== */
const H = { size: 'Penduduk', color: 'IKG', level: 'ID', nodes: null, pick: null };
const SIZELAB = { Penduduk: 'penduduk (jiwa)', PDRB: 'PDRB (miliar rupiah)' };
function buildNodes() {
  const nodes = new Map();
  const add = (id, label, parent) => { if (!nodes.has(id)) nodes.set(id, { id, label, parent, v: 0, cw: 0, n: 0, kids: [], leaf: false }); return nodes.get(id); };
  add('ID', 'Indonesia', '');
  R.forEach(r => {
    const w = 'W|' + r.Wilayah, p = 'P|' + r.Provinsi, k = 'K|' + r.kdkab;
    add(w, r.wil, 'ID'); add(p, r.prov, w); const kn = add(k, r.Kabupaten, p); kn.leaf = true; kn.i = r.i;
    const v = r[H.size], c = r[H.color]; ['ID', w, p, k].forEach(id => { const nd = nodes.get(id); nd.v += v; nd.cw += v * c; nd.n++; });
  });
  nodes.forEach(nd => { nd.c = nd.cw / nd.v; if (nd.parent) nodes.get(nd.parent).kids.push(nd.id); });
  return nodes;
}
const lvl = id => id === 'ID' ? '' : id;
const inNode = (r, id) => id === 'ID' || id === 'W|' + r.Wilayah || id === 'P|' + r.Provinsi || id === 'K|' + r.kdkab;
function ensureNodes() { if (!H.nodes) H.nodes = buildNodes(); if (!H.nodes.has(H.level)) H.level = 'ID'; return H.nodes; }

function hierTrace(type) {
  const nodes = ensureNodes(), ids = Array.from(nodes.keys()), c = H.color, cp = compact();
  const tr = { type, ids, labels: ids.map(i => nodes.get(i).label), parents: ids.map(i => nodes.get(i).parent), values: ids.map(i => nodes.get(i).v), branchvalues: 'total', level: lvl(H.level),
    customdata: ids.map(i => { const n = nodes.get(i); return [ni(n.v), nf(n.c, VDEC[c]), n.n, n.leaf ? '' : ' (rata-rata tertimbang)']; }),
    hovertemplate: '<b>%{label}</b><br>' + SIZELAB[H.size] + ': %{customdata[0]}<br>' + c + ': %{customdata[1]}%{customdata[3]}<br>Kabupaten/kota: %{customdata[2]}<extra></extra>',
    marker: { colors: ids.map(i => nodes.get(i).c), colorscale: plScale(STOPS[c]), cmin: VMIN[c], cmax: VMAX[c], line: { width: 1, color: '#fff' },
      colorbar: { orientation: 'h', thickness: 9, lenmode: 'pixels', len: cp ? 190 : 260, x: .5, xref: 'paper', xanchor: 'center', y: 0, yref: 'container', yanchor: 'bottom', ypad: 6, tickfont: { size: 10 }, outlinewidth: 0, title: { text: c, side: 'right', font: { size: 11 } } } },
    textfont: { family: FF, size: type === 'treemap' ? (cp ? 13 : 15) : (cp ? 12 : 13) }, hoverlabel: { bgcolor: '#fff', bordercolor: INK, font: { family: FF, size: 12, color: INK } }, textinfo: 'label', root: { color: '#F3EAF6' } };
  if (type === 'treemap') { tr.maxdepth = cp ? 2 : 3; tr.pathbar = { visible: false }; tr.marker.pad = { t: cp ? 24 : 28, l: 4, r: 4, b: 4 }; }
  else { tr.maxdepth = 3; tr.insidetextorientation = 'radial'; }
  return tr;
}
const HLAY = () => baseLayout({ margin: { l: 2, r: 2, t: 2, b: 52 }, dragmode: false });
function nextOf(ev) { if (ev.nextLevel !== undefined) return ev.nextLevel === '' ? 'ID' : ev.nextLevel; const p = ev.points && ev.points[0]; return p && p.id ? p.id : 'ID'; }
function hierClick(ev) {
  const id = nextOf(ev), nd = H.nodes.get(id);
  if (nd && nd.leaf) { setKab(nd.i, 'hier'); H.pick = nd.i; hierRefresh(); return false; }
  setLevel(id, true);
}
function drawTree() { draw('plotTree', [hierTrace('treemap')], HLAY()); const el = gd('plotTree'); if (!el._hb) { el._hb = true; el.on('plotly_treemapclick', hierClick); } }
function drawSun() { draw('plotSun', [hierTrace('sunburst')], HLAY()); const el = gd('plotSun'); if (!el._hb) { el._hb = true; el.on('plotly_sunburstclick', hierClick); } }
function hierPageChart() { return NAV.tab === 'hierarki' ? (NAV.idx === 0 ? 'plotTree' : 'plotSun') : null; }
function hierMarkDirty() { HOOKS['hierarki-0'].dirty = true; HOOKS['hierarki-1'].dirty = true; }
function hierRedrawVisible() { if (NAV.tab !== 'hierarki') return; const h = HOOKS[pageId('hierarki', NAV.idx)]; h.dirty = false; NAV.idx === 0 ? drawTree() : drawSun(); hierRefresh(); }
function setLevel(id, fromChart) {
  ensureNodes(); if (!H.nodes.has(id)) id = 'ID'; H.level = id; H.pick = null;
  hierMarkDirty();
  if (fromChart) { const other = HOOKS[pageId('hierarki', NAV.idx)]; other.dirty = false; } // grafik terlihat sudah bergerak sendiri
  else hierRedrawVisible();
  setRegion(regionOf(id), 'hier'); hierRefresh();
}
function renderCrumbs() {
  const path = []; let id = H.level; ensureNodes();
  while (id) { const n = H.nodes.get(id); path.unshift(n); id = n.parent; }
  const html = path.map((n, k) => (k ? '<span class="sep" aria-hidden="true">/</span>' : '') + '<button type="button" data-id="' + esc(n.id) + '"' + (k === path.length - 1 ? ' aria-current="true"' : '') + '>' + esc(n.label) + '</button>').join('');
  $$('[data-crumbs]').forEach(el => { el.innerHTML = html; });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-crumbs] button'); if (b && b.getAttribute('aria-current') !== 'true') setLevel(b.dataset.id, false); });
regCtrl('hSize', () => H.size, v => { H.size = v; H.nodes = null; hierMarkDirty(); hierRedrawVisible(); });
regCtrl('hColor', () => H.color, v => { H.color = v; H.nodes = null; hierMarkDirty(); hierRedrawVisible(); });

const CHILD = id => id === 'ID' ? 'wilayah' : id.startsWith('W|') ? 'provinsi' : id.startsWith('P|') ? 'kabupaten/kota' : '';
const wavg = (rows, f, w) => rows.reduce((a, r) => a + r[f] * r[w], 0) / rows.reduce((a, r) => a + r[w], 0);
const extremeWords = c => c === 'IKG' ? ['paling timpang', 'paling setara'] : ['paling tertinggal', 'paling setara']; // [kondisi terburuk, terbaik]
function hierInfo() {
  ensureNodes(); const nd = H.nodes.get(H.level), c = H.color, rows = R.filter(r => inNode(r, H.level)), root = H.nodes.get('ID');
  const kids = nd.kids.map(id => H.nodes.get(id)), pop = rows.reduce((a, r) => a + r.Penduduk, 0), totPop = root.n ? R.reduce((a, r) => a + r.Penduduk, 0) : 1;
  const pdrb = rows.reduce((a, r) => a + r.PDRB, 0), totPdrb = R.reduce((a, r) => a + r.PDRB, 0);
  return { nd, c, rows, root, kids, popShare: pop / totPop * 100, pdrbShare: pdrb / totPdrb * 100 };
}
function pickLine(info) {
  if (H.pick === null || !R[H.pick] || !inNode(R[H.pick], H.level)) return null;
  const r = R[H.pick]; return ['fakta', '<b>' + esc(r.Kabupaten) + '</b>: IKG ' + nf(r.IKG, 3) + ' dan IPG ' + nf(r.IPG, 1) + '.'];
}
function insightHR0() {
  const I = hierInfo(), { nd, c, rows, root, kids } = I, vd = VDEC[c], nat = root.c, diff = nd.c - nat, words = extremeWords(c);
  let head;
  if (nd.id === 'ID') {
    const bad = c === 'IKG' ? rows.filter(r => r.IKG >= .5) : rows.filter(r => r.IPG < 90), badPop = bad.reduce((a, r) => a + r.Penduduk, 0) / R.reduce((a, r) => a + r.Penduduk, 0) * 100;
    head = bad.length + ' kab/kota ber-' + c + (c === 'IKG' ? ' 0,5 atau lebih' : ' di bawah 90') + ' hanya dihuni ' + nf(badPop, 1) + '% penduduk.';
  } else head = esc(nd.label) + ' ' + cmpPhrase(c, diff, nat) + ' nasional dan memuat ' + nf(I.popShare, 1) + '% penduduk.';
  const items = [];
  if (kids.length >= 2) {
    const s = kids.slice().sort((a, b) => b.c - a.c), hi = s[0], lo = s[s.length - 1], top = c === 'IKG' ? hi : lo, bot = c === 'IKG' ? lo : hi;
    items.push(['fakta', 'Tingkat ' + CHILD(nd.id) + ': ' + words[0] + ' ' + esc(top.label) + ', ' + words[1] + ' ' + esc(bot.label) + '.']);
  } else if (nd.leaf) { const r = R[nd.i]; items.push(['fakta', 'IKG ' + nf(r.IKG, 3) + ' dan IPG ' + nf(r.IPG, 1) + '.']); }
  if (nd.id !== 'ID') items.push(['fakta', 'Memuat ' + nf(I.popShare, 1) + '% penduduk dan ' + nf(I.pdrbShare, 1) + '% PDRB nasional.', true]);
  const unit = kids.length >= 5 ? kids.map(k => [k.v, worse(k.c, c)]) : (rows.length >= 8 ? rows.map(r => [r[H.size], worse(r[c], c)]) : null);
  if (unit) {
    const rho = spearman(unit.map(u => u[0]), unit.map(u => u[1]));
    items.push(['inferensi', rho <= -.3 ? 'Bidang besar cenderung lebih setara: rata-rata induk dibentuk terutama oleh daerah yang kondisinya lebih baik.' : rho >= .3 ? 'Bidang besar cenderung ' + (c === 'IKG' ? 'lebih timpang' : 'lebih tertinggal') + ': ukuran dan masalah berjalan searah.' : 'Ukuran dan kondisi tidak berkaitan jelas: daerah kecil bisa sama timpangnya dengan daerah besar.']);
  }
  if (rows.length >= 3) { const v = rows.map(r => r[c]), wide = (Math.max(...v) - Math.min(...v)) / (VMAX[c] - VMIN[c]); items.push(['inferensi', 'Ragam antar kab/kota di sini ' + (wide > .6 ? 'sangat lebar' : wide > .3 ? 'cukup lebar' : 'sempit') + ', sehingga rata-rata induk ' + (wide > .3 ? 'menutupi perbedaan; masuk satu tingkat untuk melihatnya.' : 'cukup mewakili.'), true]); }
  const pl = pickLine(I); if (pl) items.unshift(pl);
  const cta = [{ label: 'Struktur dan peringkat \u2192', main: true, fn: () => go('hierarki', 1, true) }];
  if (nd.id !== 'ID') cta.push({ label: 'Lihat di peta', fn: () => go('geospasial', 0, true) });
  return { scope: [esc(nd.label), c + ' \u00B7 ' + SIZELAB[H.size].split(' (')[0]], big: { v: nf(nd.c, vd), k: c + ' rata-rata tertimbang' + (nd.id === 'ID' ? '' : '<br>nasional ' + nf(nat, vd)), tone: c.toLowerCase() }, head, items, cta };
}
function rankBars(list, c) { const vd = VDEC[c]; return list.map(r => { const t = (r[c] - VMIN[c]) / (VMAX[c] - VMIN[c]); return '<div class="row"><span class="nm" title="' + esc(r.Kabupaten + ', ' + r.prov) + '">' + esc(r.Kabupaten) + '</span><span class="bar"><i style="width:' + Math.max(4, t * 100) + '%;background:' + ramp(STOPS[c], t) + '"></i></span><span class="val">' + nf(r[c], vd) + '</span></div>'; }).join(''); }
function insightHR1() {
  const I = hierInfo(), { nd, c, rows } = I, vd = VDEC[c];
  if (rows.length < 2) return { scope: [esc(nd.label)], head: esc(nd.label) + ': hanya satu kabupaten/kota pada tingkat ini.', items: pickLine(I) ? [pickLine(I)] : [], cta: [{ label: 'Lihat di peta \u2192', main: true, fn: () => go('geospasial', 0, true) }] };
  const s = rows.slice().sort((a, b) => b[c] - a[c]), worstFirst = c === 'IKG' ? s : s.slice().reverse(), k = Math.min(3, Math.floor(rows.length / 2));
  const badList = worstFirst.slice(0, k), goodList = worstFirst.slice(-k).reverse(), bad = worstFirst[0], good = worstFirst[worstFirst.length - 1], words = extremeWords(c);
  const extra = '<div class="rank"><h4>' + (c === 'IKG' ? 'IKG tertinggi' : 'IPG terendah') + '</h4>' + rankBars(badList, c) + '<div class="opt"><h4>' + (c === 'IKG' ? 'IKG terendah' : 'IPG tertinggi') + '</h4>' + rankBars(goodList, c) + '</div></div>';
  const head = 'Kontras terbesar di ' + esc(nd.label) + ': ' + esc(bad.Kabupaten) + ' dan ' + esc(good.Kabupaten) + '.';
  const items = [], flag = c === 'IKG' ? rows.filter(r => r.IKG >= .5) : rows.filter(r => r.IPG < 90);
  items.push(['fakta', flag.length + ' dari ' + rows.length + ' kab/kota ber-' + c + (c === 'IKG' ? ' 0,5 atau lebih' : ' di bawah 90') + '.']);
  const nTop = Math.min(10, rows.length), grpKey = nd.id === 'ID' ? 'wil' : nd.id.startsWith('W|') ? 'prov' : null;
  if (grpKey) { const cnt = {}; worstFirst.slice(0, nTop).forEach(r => { cnt[r[grpKey]] = (cnt[r[grpKey]] || 0) + 1; }); const e = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    items.push(['inferensi', e[1] + ' dari ' + nTop + ' daerah ' + words[0] + ' berada di ' + esc(e[0]) + (e[1] >= nTop * .5 ? ': masalahnya mengumpul secara regional, bukan tersebar acak.' : ': sebarannya relatif merata antargrup.')]); }
  const pl = pickLine(I); if (pl) items.unshift(pl);
  items.push(['catatan', 'Warna simpul induk adalah rata-rata tertimbang ' + SIZELAB[H.size].split(' (')[0] + ', bukan angka resmi.', true]);
  return { scope: [esc(nd.label), c], big: { v: nf(Math.abs(bad[c] - good[c]), vd), k: 'selisih ' + c + ' tertinggi dan terendah antar kab/kota', tone: c.toLowerCase() }, head, extra, items, cta: [{ label: 'Lihat sebarannya di peta \u2192', main: true, fn: () => go('geospasial', 0, true) }] };
}
function hierRefresh() {
  renderCrumbs();
  if (NAV.tab !== 'hierarki') return;
  const el = gd(NAV.idx === 0 ? 'insHR0' : 'insHR1'); renderInsight(el, NAV.idx === 0 ? insightHR0() : insightHR1());
}
function hierShow(k) { const h = HOOKS[pageId('hierarki', k)]; if (h.dirty) { h.dirty = false; k === 0 ? drawTree() : drawSun(); } resizePlot(k === 0 ? 'plotTree' : 'plotSun'); hierRefresh(); }
HOOKS['hierarki-0'] = { dirty: true, init() { ensureNodes(); }, show() { hierShow(0); } };
HOOKS['hierarki-1'] = { dirty: true, init() { ensureNodes(); }, show() { hierShow(1); } };
onFocus((what, src) => {
  if (src === 'hier') return; ensureNodes();
  if (what === 'region') { if (regionOf(H.level) !== FOCUS.region) { H.level = FOCUS.region ? 'W|' + FOCUS.region : 'ID'; H.pick = null; } }
  if (what === 'kab') { if (FOCUS.kab !== null) { H.pick = FOCUS.kab; H.level = 'P|' + R[FOCUS.kab].Provinsi; } else H.pick = null; }
  hierMarkDirty(); if (NAV.tab === 'hierarki') hierRedrawVisible(); else renderCrumbs();
});
