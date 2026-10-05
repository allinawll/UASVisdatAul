"""
build.py: menggabungkan src/ (template, css, app*.js) dengan data/ menjadi satu berkas index.html
yang berdiri sendiri (hanya pustaka Plotly, Leaflet, dan font dimuat dari CDN).

    python scripts/build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
S = ROOT / "src"
app = "".join((S / f"app{i}.js").read_text(encoding="utf-8") for i in range(1, 7))
app = "(function () {\n" + app + "\n})();"
tpl = (S / "index.template.html").read_text(encoding="utf-8")
html = (tpl.replace("/*__CSS__*/", (S / "styles.css").read_text(encoding="utf-8"))
           .replace("/*__DATA__*/", (ROOT / "data" / "dashboard_data.json").read_text(encoding="utf-8"))
           .replace("/*__GEO__*/", (ROOT / "data" / "kab.geojson").read_text(encoding="utf-8"))
           .replace("/*__APP__*/", app))
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html ditulis: {len(html)/1e6:.2f} MB")
