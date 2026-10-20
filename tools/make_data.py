"""Bundle hanzi-writer-data stroke files + makemeahanzi dictionary into data/cNNN.json chunks.

usage: python3 tools/make_data.py <hanzi-writer-data package dir> <makemeahanzi dictionary.txt> <out dir>
Each entry: {strokes, medians, radStrokes, rad, zy}; chunk index = codepoint % 128.
"""
import json
import os
import sys

from zhuyin import to_zhuyin

N_CHUNKS = 128

stroke_dir, dict_path, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]

dictionary = {}
for line in open(dict_path, encoding='utf-8'):
    entry = json.loads(line)
    dictionary[entry['character']] = entry

chunks = [dict() for _ in range(N_CHUNKS)]
n_zy = 0
for fn in os.listdir(stroke_dir):
    ch = fn[:-5]
    if not fn.endswith('.json') or len(ch) != 1:
        continue
    data = json.load(open(os.path.join(stroke_dir, fn), encoding='utf-8'))

    entry = dictionary.get(ch, {})
    data['rad'] = entry.get('radical', '')
    readings = []
    for py in entry.get('pinyin', []):
        zy = to_zhuyin(py)
        if zy and zy not in readings:
            readings.append(zy)
    data['zy'] = readings[:3]
    if readings:
        n_zy += 1

    chunks[ord(ch) % N_CHUNKS][ch] = data

for i in range(N_CHUNKS):
    with open(os.path.join(out_dir, f'c{i:03d}.json'), 'w', encoding='utf-8') as f:
        json.dump(chunks[i], f, ensure_ascii=False, separators=(',', ':'))

print(sum(len(c) for c in chunks), 'characters,', n_zy, 'with zhuyin')
