"""Write data/readings.json: the 注音 of whole words, so polyphonic characters read right in context.

usage: python3 tools/make_readings.py <moedict dict-revised.json>
Covers the word bank (data/words.json) plus the shop item and title names in js/hero.js.
A word the MOE dictionary lists gets its dictionary reading (葫蘆 ㄏㄨˊ ˙ㄌㄨ, 鳳冠 ㄍㄨㄢ);
other names are left to the per-character readings in data/.
"""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
keep = re.compile('[^ㄅ-ㄩˊˇˋ˙ ]')

word_readings = {}
for entry in json.load(open(sys.argv[1], encoding='utf-8')):
    title = entry.get('title', '')
    if len(title) < 2 or title in word_readings:
        continue
    for h in entry.get('heteronyms', []):
        raw = h.get('bopomofo', '').split('（')[0].replace('　', ' ')
        syllables = keep.sub('', raw).split()
        if len(syllables) == len(title):
            word_readings[title] = syllables
            break

wanted = []
for e in json.loads((root / 'data' / 'words.json').read_text(encoding='utf-8')):
    if len(e['w']) > 1:
        wanted.append(e['w'])
hero = (root / 'js' / 'hero.js').read_text(encoding='utf-8')
for name in re.findall(r"name: '([^']+)'", hero):
    if len(name) > 1:
        wanted.append(name)

out = {}
for w in wanted:
    if w in word_readings:
        out[w] = word_readings[w]

(root / 'data' / 'readings.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(len(out), 'of', len(wanted), 'words and names have a dictionary reading')
for w in ['葫蘆', '鳳冠', '書卷', '長鞭', '干將莫邪', '回家', '快樂', '長大', '音樂']:
    print(w, out.get(w))
