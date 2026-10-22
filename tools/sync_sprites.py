"""Bring the sprite pack into the game: copy what the game draws into sprites/, and write js/catalog.js.

The sprite pack (made separately, with its own README) is taken as it is; its manifest.json is the contract.
This copies the layer sheets, pets, treasures, backgrounds and the 96 px shop icons (not the 4× copies, not the
combos), and writes sprites/manifest.json with only what the game reads. js/catalog.js gets the items for the
shop: weapons, accessories, hair dyes, pets and treasures, with prices, the 名望 they need, and chance encounters.

Pets listed in EXCLUDE are left out (none at present: all of the pack's pets are in).

usage: python3 -I tools/sync_sprites.py <sprite_pack folder>
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = Path(sys.argv[1]).resolve()
OUT = ROOT / 'sprites'

# pets to leave out of the game, by id
EXCLUDE = set()
# the sword-qi colour of each weapon class
QI = {'Sword': '#6F9FC0', 'Sabre': '#AEB8C2', 'Spear': '#C2453C', 'Fist': '#C9A03A', 'HiddenWeapon': '#8E6FB8'}

M = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))


def price(shop):
    """'20 銀' → {'taels': 20}, '3 元寶' → {'ingots': 3}; None when not sold"""
    if not shop:
        return None
    m = re.match(r'(\d+)\s*(銀|元寶)', shop['price'])
    n = int(m.group(1))
    return {'taels': n} if m.group(2) == '銀' else {'ingots': n}


def rate(enc):
    """'5%' → 0.05"""
    return float(enc['rate'].rstrip('%')) / 100


def item(id, slot, name, shop, encounter, art, extra):
    it = {'id': id, 'slot': slot, 'name': name}
    it.update(extra)
    cost = price(shop)
    if cost:
        it.update(cost)
        it['minTitle'] = shop['unlock'] - 1
    else:
        it['shop'] = False
        it['minTitle'] = (encounter['unlock'] - 1) if encounter else 19
    if encounter:
        it['encounter'] = {'minTitle': encounter['unlock'] - 1, 'rate': rate(encounter)}
    if art:
        it['art'] = art
    return it


items = []
for cls, list_ in M['weapons'].items():
    for w in list_:
        items.append(item(w['id'], 'weapon', w['name'], w.get('shop'), w.get('encounter'), w.get('shopArt'),
                          {'cls': cls, 'tier': w['tier'], 'qi': QI[cls]}))
for place, list_ in M['accessories'].items():
    for a in list_:
        items.append(item(a['id'], 'acc', a['name'], a.get('shop'), a.get('encounter'), a.get('shopArt'), {'place': place}))
for h in M['hairstyles']:
    items.append(item(h['id'], 'acc', h['name'], h.get('shop'), h.get('encounter'), h.get('shopArt'), {'place': 'hair'}))
for pid, p in M['pets'].items():
    if pid in EXCLUDE:
        continue
    items.append(item(pid, 'pet', p['name'], p.get('shop'), p.get('encounter'), p.get('shopArt'),
                      {'fly': p.get('habitat') == 'fly', 'divine': bool(p.get('divine'))}))
for tid, t in M['treasures'].items():
    items.append(item(tid, 'treasure', t['name'], t.get('shop'), t.get('encounter'), t.get('shopArt'), {}))

# ---------- files ----------
if OUT.exists():
    shutil.rmtree(OUT)
copied = 0
for sub in ['layers', 'pets', 'treasures', 'backgrounds', 'shop_art']:
    for f in sorted((PACK / sub).rglob('*.png')):
        rel = f.relative_to(PACK)
        if '@4x' in rel.parts:
            continue
        if sub == 'pets' and f.stem in EXCLUDE:
            continue
        if sub == 'shop_art' and rel.parts[1] == 'pets' and f.stem in EXCLUDE:
            continue
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(f, dest)
        copied += 1

# what the compositor reads: the frame, ranks and their sources, clips, sheets, pets, treasures, the effect formula
sheets = {}
for path, meta in M['sheets'].items():
    if path.startswith('pets/') and Path(path).stem in EXCLUDE:
        continue
    if path.startswith('combos/'):
        continue
    sheets[path] = meta
pets = {}
for pid, p in M['pets'].items():
    if pid not in EXCLUDE:
        pets[pid] = {'pivot': p['pivot'], 'clips': p['clips'], 'habitat': p.get('habitat'), 'width': p['width'], 'height': p['height']}
treasures = {}
for tid, t in M['treasures'].items():
    treasures[tid] = {'width': t['width'], 'height': t['height']}
ranks = []
for r in M['ranks']:
    ranks.append({'id': r['id'], 'n': r['n'], 'realm': r['realm'], 'sources': r['sources']})
small = {
    'built': M['built'], 'frame': M['frame'], 'ranks': ranks, 'clips': M['clips'], 'sheets': sheets,
    'pets': pets, 'treasures': treasures, 'fxFormula': M['fxFormula'],
}
(OUT / 'manifest.json').write_text(json.dumps(small, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

js = ('// Written by tools/sync_sprites.py from the sprite pack (manifest built ' + M['built'] + '); do not edit by hand.\n'
      '// slot: weapon / acc (place head, waist, back, hair) / pet / treasure. taels or ingots = shop price;\n'
      '// shop: false = only met by chance (encounter: from minTitle, rate per finished word). art = 96 px shop icon.\n'
      'const ITEMS = [\n')
for it in items:
    js += '  ' + json.dumps(it, ensure_ascii=False) + ',\n'
js += '];\n'
(ROOT / 'js' / 'catalog.js').write_text(js, encoding='utf-8')

counts = {}
for it in items:
    key = it['slot'] + (':' + it['place'] if 'place' in it else '')
    counts[key] = counts.get(key, 0) + 1
print('copied', copied, 'files | items', len(items), counts, '| with icon', sum(1 for it in items if 'art' in it),
      '| chance only', sum(1 for it in items if it.get('shop') is False))
