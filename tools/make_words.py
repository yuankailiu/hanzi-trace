"""Build data/words.json from the MOE 國小學童常用字詞調查報告書 frequency tables.

usage: python3 tools/make_words.py <SHREST1.DBF 字頻總表> <shrest2.dbf 詞頻總表>
(both from https://language.moe.gov.tw/001/Upload/files/SITE_CONTENT/M0001/PRIMARY/download/result.zip)

Keeps the most frequent 2-4 character words (up to MAX_PER_TIER per tier) that the report marks as dictionary words (JDICT),
whose characters all have 教育部 stroke data, followed by the top 2,700 single characters
of the children's character-frequency table (the Chinese "sight words"). A word's tier follows its rarest character's rank
in the children's character-frequency table, with cut-offs at the 108 課綱 reading targets
(低年級 1,000 字, 中年級 1,800 字, 高年級 2,700 字).
"""
import json
import sys
from pathlib import Path

from dbf import read_dbf

N_CHUNKS = 128
MAX_PER_TIER = 500
TIER_CUTS = [300, 600, 1000, 1400, 1800, 2300, 2700]

root = Path(__file__).resolve().parent.parent
chunks = {}


def has_moe(ch):
    i = ord(ch) % N_CHUNKS
    if i not in chunks:
        chunks[i] = json.loads((root / 'data' / f'c{i:03d}.json').read_text(encoding='utf-8'))
    entry = chunks[i].get(ch)
    return entry is not None and entry.get('src') == 'moe'


_, char_rows = read_dbf(sys.argv[1])
char_rank = {}
for r in char_rows:
    char_rank[r['DWORD']] = int(r['NO'])

_, word_rows = read_dbf(sys.argv[2])
words = []
counts = [0] * len(TIER_CUTS)
for r in word_rows:
    w = r['PHRASE']
    if not 2 <= len(w) <= 4 or r['JDICT'] != '*':
        continue
    ranks = []
    for ch in w:
        ranks.append(char_rank.get(ch, 99999))
    rarest = max(ranks)
    if rarest > TIER_CUTS[-1]:
        continue
    ok = True
    for ch in w:
        if not has_moe(ch):
            ok = False
    if not ok:
        continue
    tier = 0
    while rarest > TIER_CUTS[tier]:
        tier += 1
    if counts[tier] >= MAX_PER_TIER:
        continue
    counts[tier] += 1
    words.append({'w': w, 't': tier})

# single characters, the Chinese "sight words": the report's character-frequency ranking up to 2,700
for r in char_rows:
    ch = r['DWORD']
    rank = int(r['NO'])
    if rank > TIER_CUTS[-1] or len(ch) != 1 or not has_moe(ch):
        continue
    tier = 0
    while rank > TIER_CUTS[tier]:
        tier += 1
    words.append({'w': ch, 't': tier})

(root / 'data' / 'words.json').write_text(json.dumps(words, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

per_tier = [0] * len(TIER_CUTS)
n_chars = 0
for e in words:
    per_tier[e['t']] += 1
    if len(e['w']) == 1:
        n_chars += 1
print(len(words), 'entries (', n_chars, 'single characters ), per tier:', per_tier)
for t in range(len(TIER_CUTS)):
    sample = []
    for e in words:
        if e['t'] == t:
            sample.append(e['w'])
    print(t, ' '.join(sample[:14]))
