"""Build data/words.json from tools/words.tsv, tiering each word by stroke count.

usage: python3 tools/make_words.py
Words with a character missing from data/ are dropped and reported.
Tier 0..6 follows the 江湖 ranks: words are sorted by (max strokes, total strokes)
and cut into seven equal groups, so harder words unlock as the child ranks up.
"""
import json
from pathlib import Path

N_CHUNKS = 128
N_TIERS = 7

root = Path(__file__).resolve().parent.parent
chunks = {}


def stroke_count(ch):
    i = ord(ch) % N_CHUNKS
    if i not in chunks:
        chunks[i] = json.loads((root / 'data' / f'c{i:03d}.json').read_text(encoding='utf-8'))
    entry = chunks[i].get(ch)
    if entry is None:
        return None
    return len(entry['strokes'])


words = []
for line in (root / 'tools' / 'words.tsv').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'):
        continue
    word, meaning = line.split('\t')

    counts = []
    for ch in word:
        counts.append(stroke_count(ch))
    if None in counts:
        print('dropped (no stroke data):', word)
        continue

    words.append({'w': word, 'm': meaning, 'max': max(counts), 'sum': sum(counts)})

words.sort(key=lambda e: (e['max'], e['sum']))

out = []
for rank, e in enumerate(words):
    tier = rank * N_TIERS // len(words)
    out.append({'w': e['w'], 'm': e['m'], 't': tier})

(root / 'data' / 'words.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

per_tier = [0] * N_TIERS
for e in out:
    per_tier[e['t']] += 1
print(len(out), 'words, per tier:', per_tier)
for t in range(N_TIERS):
    sample = []
    for e in out:
        if e['t'] == t:
            sample.append(e['w'])
    print(t, ' '.join(sample[:8]))
