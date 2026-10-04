"""
build.py: menggabungkan src/ (template, css, js) dengan data/ menjadi satu berkas index.html
yang berdiri sendiri (hanya pustaka Plotly dan Leaflet dimuat dari CDN).

    python scripts/build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tpl = (ROOT / "src" / "index.template.html").read_text(encoding="utf-8")
html = (tpl.replace("/*__CSS__*/", (ROOT / "src" / "styles.css").read_text(encoding="utf-8"))
           .replace("/*__DATA__*/", (ROOT / "data" / "dashboard_data.json").read_text(encoding="utf-8"))
           .replace("/*__GEO__*/", (ROOT / "data" / "kab.geojson").read_text(encoding="utf-8"))
           .replace("/*__APP__*/", (ROOT / "src" / "app.js").read_text(encoding="utf-8")))
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html ditulis: {len(html)/1e6:.2f} MB")
