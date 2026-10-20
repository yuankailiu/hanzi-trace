"""Write icons/icon.svg: a cinnabar seal with 武 drawn from the same stroke data as the app.

usage: python3 tools/make_icon.py
PNG sizes (192, 512, apple-touch 180) are rendered from this SVG separately.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
ch = '武'
chunk = json.loads((root / 'data' / f'c{ord(ch) % 128:03d}.json').read_text(encoding='utf-8'))
strokes = chunk[ch]['strokes']

paths = ''
for d in strokes:
    paths += f'<path d="{d}"/>'

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#B23A2E"/>
<rect x="34" y="34" width="444" height="444" rx="18" fill="none" stroke="#FFF4EC" stroke-width="10"/>
<g fill="#FFF4EC" transform="translate(76 76) scale(0.3516)"><g transform="scale(1,-1) translate(0,-900)">{paths}</g></g>
</svg>
'''
(root / 'icons' / 'icon.svg').write_text(svg, encoding='utf-8')
print('wrote icons/icon.svg')
