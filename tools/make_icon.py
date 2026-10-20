"""Write icons/icon.svg: 永 (the 永字八法 character, holding the eight basic strokes) with a small seal.

usage: python3 tools/make_icon.py [light|dark] [out.svg]
The glyph comes from the same 教育部 stroke data the app draws with. The square is full-bleed;
iOS and the manifest's maskable icon round the corners themselves.
"""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
variant = sys.argv[1] if len(sys.argv) > 1 else 'dark'
out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'icons' / 'icon.svg'

ch = '永'
chunk = json.loads((root / 'data' / f'c{ord(ch) % 128:03d}.json').read_text(encoding='utf-8'))
paths = ''
for d in chunk[ch]['strokes']:
    paths += f'<path d="{d}"/>'

if variant == 'dark':
    bg_top, bg_bottom, ink, seal, seal_mark = '#4a4659', '#36334a', '#f3eadf', '#c9665c', '#36334a'
else:
    bg_top, bg_bottom, ink, seal, seal_mark = '#f4ece1', '#e7dbcc', '#3f3d52', '#c65b52', '#f4ece1'

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg_top}"/><stop offset="1" stop-color="{bg_bottom}"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g fill="{ink}" transform="translate(84 70) scale(0.3359)"><g transform="scale(1,-1) translate(0,-900)">{paths}</g></g>
<rect x="352" y="356" width="76" height="76" rx="14" fill="{seal}"/>
<rect x="366" y="370" width="48" height="48" rx="7" fill="none" stroke="{seal_mark}" stroke-width="6"/>
</svg>
'''
out.write_text(svg, encoding='utf-8')
print('wrote', out)
