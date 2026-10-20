"""Wrap app.html (the Claude artifact page) into a standalone index.html for GitHub Pages.

The standalone page adds what an installed web app needs: charset/viewport, the
manifest and home-screen icons, and the small reset the artifact host provides.
"""
from pathlib import Path

HEAD = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="描字本">
<meta name="theme-color" content="#e6e9ef">
<link rel="manifest" href="manifest.webmanifest?v=3">
<link rel="icon" href="icons/favicon-32.png?v=3" sizes="32x32" type="image/png">
<link rel="icon" href="icons/favicon-16.png?v=3" sizes="16x16" type="image/png">
<link rel="icon" href="icons/icon.svg?v=3" type="image/svg+xml">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png?v=3">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; height: 100%; }
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
