"""Bundle stroke data into data/cNNN.json chunks for the app.

usage: python3 tools/make_data.py <hanzi-writer-data dir> <makemeahanzi dictionary.txt> <zh-stroke-data json dir> <out dir> [moedict dict-revised.json]

Glyph shapes and stroke order come from the Taiwan Ministry of Education stroke-order site
(教育部國字標準字體筆順, via g0v/zh-stroke-data) for the ~4,800 common characters it covers;
every other character falls back to Make Me a Hanzi (hanzi-writer-data).
注音 comes from the MOE 重編國語辭典 (Taiwan readings, via g0v/moedict-data) when given,
else it is converted from the Make Me a Hanzi pinyin.
Each entry: {strokes, medians, radStrokes, rad, zy, src}; chunk index = codepoint % 128.
"""
import json
import math
import os
import re
import sys

from zhuyin import to_zhuyin

N_CHUNKS = 128
MEDIAN_STEP = 40      # densify MOE tracks to a point every ~40 units (1024 frame)
RESAMPLE_N = 8        # points per median when matching radical strokes


def moe_point(x, y):
    """MOE frame: 2048 square, y down. Hanzi Writer frame: 1024 wide, y up, glyph top at 900."""
    return x / 2.0, 900.0 - y / 2.0


def fmt(v):
    return str(round(v, 1)).rstrip('0').rstrip('.')


def moe_outline_path(outline):
    parts = []
    for cmd in outline:
        kind = cmd['type']
        if kind in ('M', 'L'):
            x, y = moe_point(cmd['x'], cmd['y'])
            parts.append(f'{kind} {fmt(x)} {fmt(y)}')
        elif kind == 'Q':
            bx, by = moe_point(cmd['begin']['x'], cmd['begin']['y'])
            ex, ey = moe_point(cmd['end']['x'], cmd['end']['y'])
            parts.append(f'Q {fmt(bx)} {fmt(by)} {fmt(ex)} {fmt(ey)}')
        elif kind == 'C':
            bx, by = moe_point(cmd['begin']['x'], cmd['begin']['y'])
            mx, my = moe_point(cmd['mid']['x'], cmd['mid']['y'])
            ex, ey = moe_point(cmd['end']['x'], cmd['end']['y'])
            parts.append(f'C {fmt(bx)} {fmt(by)} {fmt(mx)} {fmt(my)} {fmt(ex)} {fmt(ey)}')
        else:
            raise ValueError('unknown outline command ' + kind)
    parts.append('Z')
    return ' '.join(parts)


def densify(points, step):
    out = [points[0]]
    for i in range(1, len(points)):
        x0, y0 = points[i - 1]
        x1, y1 = points[i]
        seg = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(seg // step))
        for k in range(1, n + 1):
            out.append((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n))
    return out


def resample(points, n):
    """n points evenly spaced along the polyline."""
    if len(points) == 1:
        return [points[0]] * n
    lengths = [0.0]
    for i in range(1, len(points)):
        lengths.append(lengths[-1] + math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
    total = lengths[-1] or 1.0
    out = []
    j = 0
    for k in range(n):
        target = total * k / (n - 1)
        while j < len(points) - 2 and lengths[j + 1] < target:
            j += 1
        span = lengths[j + 1] - lengths[j] or 1.0
        t = (target - lengths[j]) / span
        x = points[j][0] + (points[j + 1][0] - points[j][0]) * t
        y = points[j][1] + (points[j + 1][1] - points[j][1]) * t
        out.append((x, y))
    return out


def median_distance(a, b):
    ra = resample(a, RESAMPLE_N)
    rb = resample(b, RESAMPLE_N)
    forward = 0.0
    backward = 0.0
    for i in range(RESAMPLE_N):
        forward += math.hypot(ra[i][0] - rb[i][0], ra[i][1] - rb[i][1])
        backward += math.hypot(ra[i][0] - rb[-1 - i][0], ra[i][1] - rb[-1 - i][1])
    return min(forward, backward) / RESAMPLE_N


def map_radical(moe_medians, mmh):
    """A MOE stroke belongs to the radical when its nearest Make Me a Hanzi stroke does."""
    if not mmh or not mmh.get('radStrokes'):
        return []
    rad = set(mmh['radStrokes'])
    out = []
    for i, m in enumerate(moe_medians):
        best_j = -1
        best_d = float('inf')
        for j, q in enumerate(mmh['medians']):
            d = median_distance(m, [tuple(p) for p in q])
            if d < best_d:
                best_d = d
                best_j = j
        if best_j in rad:
            out.append(i)
    return out


# single characters whose everyday reading is a particle or the commoner of two equals
# the everyday reading first, where the reading with the most definitions is not the one children use
READING_FIRST = {
    '了': '˙ㄌㄜ', '著': '˙ㄓㄜ', '長': 'ㄔㄤˊ', '都': 'ㄉㄡ', '還': 'ㄏㄞˊ', '鳥': 'ㄋㄧㄠˇ',
    '喝': 'ㄏㄜ', '騎': 'ㄑㄧˊ', '那': 'ㄋㄚˋ', '沒': 'ㄇㄟˊ', '什': 'ㄕㄣˊ', '怎': 'ㄗㄣˇ',
    '嚇': 'ㄒㄧㄚˋ', '棋': 'ㄑㄧˊ', '鉛': 'ㄑㄧㄢ', '蘋': 'ㄆㄧㄥˊ', '椅': 'ㄧˇ', '胖': 'ㄆㄤˋ',
    '校': 'ㄒㄧㄠˋ', '曾': 'ㄘㄥˊ', '難': 'ㄋㄢˊ', '藏': 'ㄘㄤˊ', '塞': 'ㄙㄞ', '炮': 'ㄆㄠˋ',
    '挑': 'ㄊㄧㄠ', '粽': 'ㄗㄨㄥˋ',
}


def load_moe_readings(path):
    """{char: [注音, ...]} from the single-character entries of dict-revised.json."""
    keep = re.compile('[^\u3105-\u3129\u02ca\u02c7\u02cb\u02d9]')
    readings = {}
    for entry in json.load(open(path, encoding='utf-8')):
        title = entry.get('title', '')
        if len(title) != 1:
            continue
        # the dictionary lists readings in 注音 order, not by use: the everyday reading is the one
        # carrying the most definitions (白 ㄅㄞˊ over its literary ㄅㄛˊ, 色 ㄙㄜˋ, 落 ㄌㄨㄛˋ)
        heteronyms = sorted(entry.get('heteronyms', []), key=lambda h: -len(h.get('definitions', [])))
        out = []
        for h in heteronyms:
            zy = keep.sub('', h.get('bopomofo', '').split('（')[0])
            if zy and zy not in out:
                out.append(zy)
        first = READING_FIRST.get(title)
        if first in out:
            out.remove(first)
            out.insert(0, first)
        if out:
            readings[title] = out
    return readings


def load_moe(path):
    raw = json.load(open(path, encoding='utf-8'))
    strokes = []
    medians = []
    for s in raw:
        strokes.append(moe_outline_path(s['outline']))
        track = []
        for p in s['track']:
            track.append(moe_point(p['x'], p['y']))
        if len(track) == 1:
            track.append((track[0][0] + 1, track[0][1] - 1))
        medians.append(densify(track, MEDIAN_STEP))
    return strokes, medians


def main():
    mmh_dir, dict_path, moe_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    moe_readings = {}
    if len(sys.argv) > 5:
        moe_readings = load_moe_readings(sys.argv[5])

    dictionary = {}
    for line in open(dict_path, encoding='utf-8'):
        entry = json.loads(line)
        dictionary[entry['character']] = entry

    mmh = {}
    for fn in os.listdir(mmh_dir):
        ch = fn[:-5]
        if fn.endswith('.json') and len(ch) == 1:
            mmh[ch] = json.load(open(os.path.join(mmh_dir, fn), encoding='utf-8'))

    moe_files = {}
    for fn in os.listdir(moe_dir):
        if not fn.endswith('.json'):
            continue
        try:
            ch = chr(int(fn[:-5], 16))
        except ValueError:
            continue
        if '㐀' <= ch <= '鿿' or '豈' <= ch <= '﫿' or ord(ch) >= 0x20000:
            moe_files[ch] = os.path.join(moe_dir, fn)

    chunks = [dict() for _ in range(N_CHUNKS)]
    n_moe = 0
    n_failed = 0
    n_tw = 0
    for ch in sorted(set(mmh) | set(moe_files)):
        entry = dictionary.get(ch, {})
        data = None
        if ch in moe_files:
            try:
                strokes, medians = load_moe(moe_files[ch])
                data = {
                    'strokes': strokes,
                    'medians': [[[round(x), round(y)] for x, y in m] for m in medians],
                    'radStrokes': map_radical(medians, mmh.get(ch)),
                    'src': 'moe',
                }
                n_moe += 1
            except (ValueError, KeyError, IndexError):
                n_failed += 1
                data = None
        if data is None:
            if ch not in mmh:
                continue
            data = dict(mmh[ch])
            data['src'] = 'mmh'

        data['rad'] = entry.get('radical', '')
        readings = moe_readings.get(ch)
        if readings:
            n_tw += 1
        else:
            readings = []
            for py in entry.get('pinyin', []):
                zy = to_zhuyin(py)
                if zy and zy not in readings:
                    readings.append(zy)
        data['zy'] = readings[:3]
        chunks[ord(ch) % N_CHUNKS][ch] = data

    for i in range(N_CHUNKS):
        with open(os.path.join(out_dir, f'c{i:03d}.json'), 'w', encoding='utf-8') as f:
            json.dump(chunks[i], f, ensure_ascii=False, separators=(',', ':'))

    total = sum(len(c) for c in chunks)
    print(total, 'characters;', n_moe, 'glyphs from 教育部 (MOE);', n_failed, 'MOE files failed;', n_tw, 'with Taiwan 注音')


main()
