"""Write icons/icon.svg: 字 on a 田字格 practice square, its last stroke traced in red.

usage: python3 tools/make_icon.py
The glyph comes from the same 教育部 stroke data the app draws with.
PNG sizes (16/32 favicon, 180 apple-touch, 192/512 manifest) are rendered from this SVG separately.
iOS rounds the corners itself, so the square is full-bleed.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
ch = '字'
chunk = json.loads((root / 'data' / f'c{ord(ch) % 128:03d}.json').read_text(encoding='utf-8'))
strokes = chunk[ch]['strokes']

ink = ''
for d in strokes[:-1]:
    ink += f'<path d="{d}"/>'
traced = f'<path d="{strokes[-1]}"/>'

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#eff1f5"/>
<rect x="40" y="40" width="432" height="432" rx="20" fill="#ffffff" stroke="#e64553" stroke-width="12"/>
<path d="M256 52V460M52 256H460" stroke="#e64553" stroke-opacity="0.35" stroke-width="6" stroke-dasharray="18 14"/>
<g transform="translate(70 70) scale(0.3633)"><g transform="scale(1,-1) translate(0,-900)">
<g fill="#4c4f69">{ink}</g>
<g fill="#d20f39">{traced}</g>
</g></g>
</svg>
'''
(root / 'icons' / 'icon.svg').write_text(svg, encoding='utf-8')
print('wrote icons/icon.svg')
