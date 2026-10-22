"""Cut 全字庫正楷體 (TW-Kai) down to the characters the game shows, as fonts/tw-kai.woff2.

The example characters in the game (the sentences, 注音, characters without stroke data) are shown in 標楷體, as in
a 國小 生字簿. iPad has no 標楷體 of its own, so the page brings one: TW-Kai from the CNS11643 全字庫
(國家發展委員會), under the 政府資料開放授權條款第 1 版 (or OFL 1.1), which allows a subset.
Source: https://data.gov.tw/dataset/5961 (Fonts_Kai.zip, TW-Kai-98_1.ttf).

Kept: every character of the word bank and the sentences, the children's frequency table, 注音 with its tones,
and CJK punctuation including the vertical forms. Anything else falls back to the next font.

usage: python3 -I tools/make_kai.py <TW-Kai-98_1.ttf> <SHREST1.DBF>
"""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from dbf import read_dbf  # noqa: E402

chars = set()
for entry in json.loads((ROOT / 'data' / 'words.json').read_text(encoding='utf-8')):
    chars.update(entry['w'])
for s in json.loads((ROOT / 'data' / 'sentences.json').read_text(encoding='utf-8')):
    chars.update(s['s'])
_, rows = read_dbf(sys.argv[2])
for r in rows:
    chars.add(r['DWORD'])

codepoints = set(ord(c) for c in chars if len(c) == 1)
# 注音 and its tones, CJK punctuation, full-width forms, vertical forms
for lo, hi in [(0x3105, 0x312F), (0x31A0, 0x31BF), (0x3000, 0x303F), (0xFF01, 0xFF5E), (0xFE10, 0xFE19), (0xFE30, 0xFE4F)]:
    codepoints.update(range(lo, hi + 1))
codepoints.update([0x02CA, 0x02C7, 0x02CB, 0x02D9, 0x00B7, 0x2026, 0x2014, 0x300C, 0x300D])

font = TTFont(sys.argv[1])
have = set(font.getBestCmap().keys())
keep = sorted(codepoints & have)
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['vert', 'vrt2']
options.name_IDs = ['*']
options.notdef_outline = False
options.hinting = False
sub = subset.Subsetter(options)
sub.populate(unicodes=keep)
sub.subset(font)
out = ROOT / 'fonts' / 'tw-kai.woff2'
out.parent.mkdir(exist_ok=True)
font.flavor = 'woff2'
font.save(out)
(ROOT / 'fonts' / 'TW-KAI-LICENSE.txt').write_text(
    '全字庫正楷體（TW-Kai）之子集，供本遊戲顯示範例字。\n'
    '來源：國家發展委員會 CNS11643 中文標準交換碼全字庫，https://data.gov.tw/dataset/5961（Fonts_Kai.zip，TW-Kai-98_1.ttf）。\n'
    '依「政府資料開放授權條款－第1版」使用（https://data.gov.tw/license）；原字型亦以 SIL Open Font License 1.1 提供。\n'
    '本檔只保留遊戲用到的字（詞庫、句子庫、兒童常用字、注音與標點），其餘未改動。\n', encoding='utf-8')
missing = sorted(codepoints - have)
print('kept', len(keep), 'characters |', out.stat().st_size // 1024, 'KB | not in TW-Kai:', ''.join(chr(c) for c in missing if c > 0x3400)[:40])
