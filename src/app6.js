
/* ============================================================================
 * Boot
 * ========================================================================== */
renderFocusbar(); renderChips();
$$('.viz').forEach(v => { const pgid = (v.closest('.pg') || {}).id || '', d = document.createElement('div'); d.className = 'src';
  d.textContent = srcLine(/geospasial/.test(pgid) ? 'Batas wilayah: data digital non-BPS, disederhanakan' : /multivariat/.test(pgid) ? 'Diolah: z-score, PCA, UMAP' : /hierarki/.test(pgid) ? 'Simpul induk: rata-rata tertimbang' : ''); v.appendChild(d); });
$$('.chart').forEach(el => { if (RO) RO.observe(el); });
{ const [t0, k0] = parseHash(); go(t0, k0, false); }
window.__dash = { FOCUS, S, UI, H, G, R, NAV, go, setKab, setRegion, moranFor, subsetStats, get MASK() { return MASK; } };
