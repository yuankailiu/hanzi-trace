"""Build data/sentences.json: sentences to read with 注音, with the characters to write marked.

Two sources:
- 教育部《國語小字典》 example sentences, verbatim, with the 注音 the dictionary gives each character in
  that sentence. What to write is the entry's own character, or the word of the word bank it forms
  there (這本書真便宜 under 便: 便宜). (CC BY-ND 3.0 TW; see data/MINIDICT-LICENSE.txt.)
- tools/sentences.txt, everyday sentences for grades 1–4 written for this app, following the sentence
  patterns recommended per grade in 吳欣儒、洪敏雄（2023）〈臺灣國小國語教科書的常用句型分析〉.
  Their 注音 comes from the longest 教育部《重編國語辭典修訂本》 words found in the sentence, then the
  character's usual reading; 一 and 不 keep their own tones as in textbooks; {注音} after a character
  overrides.

Every sentence gets the tier of its hardest character to write, by rank in the children's character
frequency table, with the same cut-offs as the word bank.

The system voices guess the reading of a 破音字 and sometimes guess wrong (他還敢來 read ㄏㄨㄢˊ).
A voice takes only text, not 注音, so each sentence also gets v, the text to speak: every character with
several readings is replaced by a common character with only the reading the 注音 gives it (還 ㄏㄞˊ → 孩).
Neutral tones and 一 / 不 are left to the voice. data/homophones.json keeps the table for the page, which
does the same for a single character and for 我的句子本.

usage: python3 -I tools/make_sentences.py <dict_mini xlsx> <SHREST1.DBF> <moedict dict-revised.json>
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dbf import read_dbf  # noqa: E402

N_CHUNKS = 128
TIER_CUTS = [300, 600, 1000, 1400, 1800, 2300, 2700]
MAX_LEN = 26
ROOT = Path(__file__).resolve().parent.parent
HAN = re.compile(r'[㐀-鿿豈-﫿]')
ZY = re.compile(r'[˙ˊˇˋㄅ-ㄩ]')

chunks = {}


def char_entry(ch):
    i = ord(ch) % N_CHUNKS
    if i not in chunks:
        chunks[i] = json.loads((ROOT / 'data' / f'c{i:03d}.json').read_text(encoding='utf-8'))
    return chunks[i].get(ch)


def has_moe(ch):
    e = char_entry(ch)
    return e is not None and e.get('src') == 'moe'


def usual_reading(ch):
    e = char_entry(ch)
    return e['zy'][0] if e and e.get('zy') else ''


_, char_rows = read_dbf(sys.argv[2])
char_rank = {}
for r in char_rows:
    char_rank[r['DWORD']] = int(r['NO'])


def tier_of(chars):
    worst = max(char_rank.get(c, 99999) for c in chars)
    for t, cut in enumerate(TIER_CUTS):
        if worst <= cut:
            return t
    return len(TIER_CUTS) - 1


# ---------- 國語小字典 ----------
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
T = '{%s}t' % NS['m']


def read_mini(path):
    z = zipfile.ZipFile(path)
    shared = [''.join(t.text or '' for t in si.iter(T)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    rows = []
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter('{%s}row' % NS['m']):
        vals = {}
        for c in row.findall('m:c', NS):
            ref = re.match(r'[A-Z]+', c.get('r')).group(0)
            v = c.find('m:v', NS)
            if v is not None:
                vals[ref] = shared[int(v.text)] if c.get('t') == 's' else v.text
        rows.append(vals)
    return rows[1:]


def tokens(markup):
    """(character, 注音) pairs from the dictionary's &&字注音&& markup; punctuation has no 注音."""
    out = []
    text = markup.replace('&&', '')
    i = 0
    while i < len(text):
        ch = text[i]
        i += 1
        zy = ''
        if HAN.match(ch):
            while i < len(text) and ZY.match(text[i]):
                zy += text[i]
                i += 1
        out.append((ch, zy))
    return out


BANK_WORDS = set()
for entry in json.loads((ROOT / 'data' / 'words.json').read_text(encoding='utf-8')):
    if 2 <= len(entry['w']) <= 4:
        BANK_WORDS.add(entry['w'])


def word_around(text, k):
    """positions of the longest word-bank word in text that covers position k, else just k"""
    for n in (4, 3, 2):
        for start in range(k - n + 1, k + 1):
            if start >= 0 and start + n <= len(text) and text[start:start + n] in BANK_WORDS:
                return list(range(start, start + n))
    return [k]


def mini_sentences(path):
    found = {}
    for row in read_mini(path):
        head = row.get('A', '')
        if not head or not has_moe(head):
            continue
        seq = tokens(row.get('F', ''))
        start = None
        for j, (ch, _) in enumerate(seq):
            if ch == '「':
                start = j + 1
            elif ch == '」' and start is not None:
                ex = seq[start:j]
                start = None
                text = ''.join(c for c, _ in ex)
                is_sentence = re.search(r'[，。！？]', text) or len(text) >= 6
                if not is_sentence or len(text) > MAX_LEN or head not in text:
                    continue
                if text not in found:
                    found[text] = {'s': text, 'z': [z for _, z in ex], 'k': [], 'src': 'm'}
                for k in word_around(text, text.index(head)):
                    if k not in found[text]['k'] and has_moe(text[k]):
                        found[text]['k'].append(k)
    for s in found.values():
        s['k'].sort()
    return list(found.values())


# ---------- the app's own sentences ----------
def word_readings(path):
    out = {}
    for e in json.loads(Path(path).read_text(encoding='utf-8')):
        title = e.get('title', '')
        if not (2 <= len(title) <= 4) or not all(HAN.match(c) for c in title):
            continue
        # the reading with the most definitions (大家 is ㄉㄚˋ ㄐㄧㄚ, not the old 大姑 ㄉㄚˋ ㄍㄨ)
        best, most = None, -1
        for h in e.get('heteronyms', []):
            sylls = h.get('bopomofo', '').split()
            if len(sylls) == len(title) and len(h.get('definitions', [])) > most:
                best, most = sylls, len(h.get('definitions', []))
        if best:
            out[title] = best
    return out


def bank_sentences(words):
    out = []
    for line in (ROOT / 'tools' / 'sentences.txt').read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        grade, raw = line.split(' ', 1)
        chars, targets, forced = [], [], {}
        i = 0
        while i < len(raw):
            ch = raw[i]
            if ch == '[':
                targets.append(len(chars))
                i += 1
                continue
            if ch == ']':
                i += 1
                continue
            if ch == '{':
                end = raw.index('}', i)
                forced[len(chars) - 1] = raw[i + 1:end]
                i = end + 1
                continue
            chars.append(ch)
            i += 1
        text = ''.join(chars)
        zy = [''] * len(chars)
        j = 0
        while j < len(chars):
            if not HAN.match(chars[j]):
                j += 1
                continue
            for n in (4, 3, 2):
                w = text[j:j + n]
                if len(w) == n and w in words:
                    for m in range(n):
                        zy[j + m] = words[w][m]
                    j += n
                    break
            else:
                # a character left alone may still end a word with the one before it (來學 then 校: 學校)
                ch = chars[j]
                pair = text[j - 1:j + 1] if j > 0 else ''
                if pair in words:
                    zy[j] = words[pair][1]
                else:
                    zy[j] = {'一': 'ㄧ', '不': 'ㄅㄨˋ', '得': '˙ㄉㄜ'}.get(ch, usual_reading(ch))
                j += 1
        for j, ch in enumerate(chars):
            if ch == '一':
                zy[j] = 'ㄧ'
            elif ch == '不':
                zy[j] = 'ㄅㄨˋ'
        for j, z in forced.items():
            zy[j] = z
        for k in targets:
            assert has_moe(chars[k]), (text, chars[k])
        out.append({'s': text, 'z': zy, 'k': targets, 'g': int(grade), 'src': 'b'})
    return out


# ---------- what to say ----------
def homophones():
    """{注音: the most common character whose only reading it is}; neutral tones are left to the voice."""
    best = {}
    for f in sorted((ROOT / 'data').glob('c*.json')):
        for ch, e in json.loads(f.read_text(encoding='utf-8')).items():
            zy = e.get('zy') or []
            if len(zy) != 1 or zy[0].startswith('˙') or ch not in char_rank or char_rank[ch] > 2000:
                continue
            if zy[0] not in best or char_rank[ch] < char_rank[best[zy[0]]]:
                best[zy[0]] = ch
    return best


def spoken(text, zys, homo):
    out = []
    for ch, zy in zip(text, zys):
        e = char_entry(ch) if HAN.match(ch) else None
        many = e is not None and len(e.get('zy') or []) > 1
        if many and zy and not zy.startswith('˙') and ch not in '一不' and homo.get(zy, ch) != ch:
            out.append(homo[zy])
        else:
            out.append(ch)
    return ''.join(out)


bank = bank_sentences(word_readings(sys.argv[3]))
mini = mini_sentences(sys.argv[1])
homo = homophones()
(ROOT / 'data' / 'homophones.json').write_text(json.dumps(homo, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
for s in bank + mini:
    s['t'] = tier_of([s['s'][k] for k in s['k']])
    v = spoken(s['s'], s['z'], homo)
    if v != s['s']:
        s['v'] = v
(ROOT / 'data' / 'sentences.json').write_text(json.dumps(bank + mini, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('bank', len(bank), 'mini', len(mini), 'homophones', len(homo))
for s in bank + mini:
    if s['s'] in ('他還敢來？', '化悲憤為力量') or '還敢來' in s['s'] or '化悲憤為' in s['s']:
        print('voice:', s['s'], '→', s.get('v', s['s']))
tiers = {}
for s in bank + mini:
    tiers[s['t']] = tiers.get(s['t'], 0) + 1
print('by tier', dict(sorted(tiers.items())))
for s in bank:
    print(s['g'], s['t'], ''.join(c + (('(' + z + ')') if z else '') for c, z in zip(s['s'], s['z'])), '→', ''.join(s['s'][k] for k in s['k']))
