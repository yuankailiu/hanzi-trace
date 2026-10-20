"""Wrap app.html (the Claude artifact fragment) into a standalone index.html for GitHub Pages."""
from pathlib import Path

HEAD = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="描字本">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font: 14px system-ui, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
</head>
<body>
"""

TAIL = """
</body>
</html>
"""

here = Path(__file__).parent
fragment = (here / 'app.html').read_text(encoding='utf-8')
(here / 'index.html').write_text(HEAD + fragment + TAIL, encoding='utf-8')
print('wrote index.html')
