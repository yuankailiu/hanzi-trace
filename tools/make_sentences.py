"""Build data/sentences.json: sentences to read with 注音, with the characters to write marked.

Three sources:
- 教育部《國語小字典》 example sentences, verbatim, with the 注音 the dictionary gives each character in
  that sentence. What to write is the entry's own character, or the word of the word bank it forms
  there (這本書真便宜 under 便: 便宜). (CC BY-ND 3.0 TW; see data/MINIDICT-LICENSE.txt.)
- 教育部《國語辭典簡編本》 example sentences ([例] in the definitions), verbatim, for the entries that are words
  of the word bank or characters with stroke data: what to write is the entry. The dictionary gives the
  注音 of the entry only; the rest of the sentence is read like the app's own sentences, below.
  (CC BY-ND 3.0 TW; see data/CONCISED-LICENSE.txt.)
- tools/sentences.txt, everyday sentences for grades 1–4 written for this app, following the sentence
  patterns recommended per grade in 吳欣儒、洪敏雄（2023）〈臺灣國小國語教科書的常用句型分析〉.
  Their 注音 comes from the longest 教育部《重編國語辭典修訂本》 words found in the sentence, then the
  character's usual reading; 一 and 不 keep their own tones as in textbooks; {注音} after a character
  overrides.

Every sentence gets the tier of its hardest character to write, by rank in the children's character
frequency table, with the same cut-offs as the word bank.

The system voices guess the reading of a 破音字 and sometimes guess wrong (他還敢來 read ㄏㄨㄢˊ).
A voice takes only text, not 注音, so each sentence also gets v, the text to speak: every character with
several readings, and every rare one, is replaced by a common character read as the 注音 gives it
(還 ㄏㄞˊ → 孩, 嚥 ㄧㄢˋ → 驗).
Neutral tones and 一 / 不 are left to the voice. data/homophones.json keeps the table for the page, which
does the same for a single character and for 我的句子本.

Each sentence keeps r, the dictionary entry it came from, shown with the sentence.

usage: python3 -I tools/make_sentences.py <dict_mini xlsx> <SHREST1.DBF> <moedict dict-revised.json> <dict_concised xlsx>
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
                    found[text] = {'s': text, 'z': [z for _, z in ex], 'k': [], 'src': 'm', 'r': head}
                for k in word_around(text, text.index(head)):
                    if k not in found[text]['k'] and has_moe(text[k]):
                        found[text]['k'].append(k)
    for s in found.values():
        s['k'].sort()
    return list(found.values())


# ---------- the app's own sentences ----------
# words whose neutral tone is how they are said, kept even where a full-tone reading also exists
KEEP_NEUTRAL = {'東西', '姑娘', '日子', '鼻子', '妻子', '看看', '乖乖', '過去'}


def word_readings(path):
    out = {}
    for e in json.loads(Path(path).read_text(encoding='utf-8')):
        title = e.get('title', '')
        if not (2 <= len(title) <= 4) or not all(HAN.match(c) for c in title):
            continue
        # the reading with the most definitions (大家 is ㄉㄚˋ ㄐㄧㄚ, not the old 大姑 ㄉㄚˋ ㄍㄨ); a spoken neutral
        # tone gives way to the full tone the textbooks teach (告訴 ㄍㄠˋ ㄙㄨˋ, 學習 ㄒㄩㄝˊ ㄒㄧˊ), except the words
        # that are neutral in everyday speech (東西 the thing, 日子, 鼻子)
        best, most = None, -1
        full = None
        full_most = -1
        for h in e.get('heteronyms', []):
            sylls = h.get('bopomofo', '').split()
            if len(sylls) != len(title):
                continue
            n = len(h.get('definitions', []))
            if n > most:
                best, most = sylls, n
            if not any(x.startswith('˙') for x in sylls) and n > full_most:
                full, full_most = sylls, n
        # only where the full tone is the character's own usual reading (完了 stays ˙ㄌㄜ: 了 is neutral as a rule)
        if best and full and title not in KEEP_NEUTRAL and any(x.startswith('˙') for x in best):
            if all(not x.startswith('˙') or full[m] == usual_reading(title[m]) for m, x in enumerate(best)):
                best = full
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
        zy = annotate(text, words)
        for j, z in forced.items():
            zy[j] = z
        for k in targets:
            assert has_moe(chars[k]), (text, chars[k])
        out.append({'s': text, 'z': zy, 'k': targets, 'g': int(grade), 'src': 'b'})
    return out


# particles are read in the neutral tone
PARTICLES = {'吧': '˙ㄅㄚ', '嗎': '˙ㄇㄚ', '呢': '˙ㄋㄜ', '啊': '˙ㄚ', '呀': '˙ㄧㄚ', '啦': '˙ㄌㄚ', '囉': '˙ㄌㄨㄛ', '喔': '˙ㄛ'}


def annotate(text, words, how=None):
    """注音 for each character: the longest 重編國語辭典 words found, then the usual reading; 一 and 不 keep
    their own tones as in textbooks. how (a list) gets where each reading came from: bank (a word of the word
    bank), word (another 重編國語辭典 word), particle, usual."""
    chars = list(text)
    zy = [''] * len(chars)
    src = [''] * len(chars)
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
                    src[j + m] = 'bank' if w in BANK_WORDS else 'word'
                j += n
                break
        else:
            # a character left alone may still end a word with the one before it (來學 then 校: 學校)
            ch = chars[j]
            # not a neutral tone: that belongs to the word only (同學說 is not 學說 ㄒㄩㄝˊ ˙ㄕㄨㄛ)
            pair = text[j - 1:j + 1] if j > 0 else ''
            if pair in words and not words[pair][1].startswith('˙'):
                zy[j] = words[pair][1]
                src[j] = 'bank' if pair in BANK_WORDS else 'word'
            elif ch in PARTICLES:
                zy[j] = PARTICLES[ch]
                src[j] = 'particle'
            else:
                zy[j] = {'一': 'ㄧ', '不': 'ㄅㄨˋ', '得': '˙ㄉㄜ'}.get(ch, usual_reading(ch))
                src[j] = 'usual'
            j += 1
    for j, ch in enumerate(chars):
        if ch == '一':
            zy[j] = 'ㄧ'
        elif ch == '不':
            zy[j] = 'ㄅㄨˋ'
    if how is not None:
        how.extend(src)
    return zy


# ---------- 國語辭典簡編本 ----------
EXAMPLE = re.compile(r'\[例\]([^\n\r_]*)')
PER_ENTRY = 2


dropped = [0]


def settled_readings(sentences):
    """the 破音字 whose usual reading is how the 小字典 sentences (with their own 注音) read them at least
    17 times in 20, seen four times or more: 他 ㄊㄚ, 中 ㄓㄨㄥ. 給 and 為 are read more than one way there."""
    counts = {}
    for x in sentences:
        for ch, z in zip(x['s'], x['z']):
            if not z or not HAN.match(ch):
                continue
            counts.setdefault(ch, {})
            counts[ch][z] = counts[ch].get(z, 0) + 1
    out = set()
    for ch, by in counts.items():
        total = sum(by.values())
        if total >= 4 and by.get(usual_reading(ch), 0) >= 0.85 * total:
            out.add(ch)
    return out


def trusted(text, zy, how, settled, skip):
    """every reading is sure: the dictionary's own for the entry (skip), a word of the word bank, a particle, or a
    破音字 in its usual reading where the 小字典 settles it. A word outside the word bank may not move a character
    off its usual reading (成長中的: 中的 ㄓㄨㄥˋ ㄉㄧˋ)."""
    for j, ch in enumerate(text):
        if j in skip or not HAN.match(ch) or ch in '一不的了著得':
            continue
        if how[j] in ('bank', 'particle'):
            continue
        e = char_entry(ch)
        many = e is not None and len(e.get('zy') or []) > 1
        if not many:
            continue
        if zy[j] != usual_reading(ch) or ch not in settled:
            return False
    return True


def concised_sentences(path, words, taken, settled):
    out = []
    for row in read_mini(path):
        word = row.get('A', '').strip()
        if not (1 <= len(word) <= 4) or not all(HAN.match(c) for c in word):
            continue
        if len(word) == 1:
            if not has_moe(word):
                continue
        elif word not in BANK_WORDS:
            continue
        sylls = re.sub(r'（.*?）', '', row.get('G', '')).replace('\u3000', ' ').split()
        if len(sylls) != len(word) or not all(ZY.match(x[-1]) or ZY.match(x[0]) for x in sylls):
            continue
        kept = 0
        for ex in EXAMPLE.findall(row.get('N', '')):
            for text in ex.split('｜'):
                text = text.strip()
                # a sentence, not a list of words (八字、八方)
                if not re.search(r'[，。！？]', text) or len(text) > MAX_LEN or word not in text or text in taken:
                    continue
                if not all(HAN.match(c) or c in '，。！？、；：「」『』（）…—' for c in text):
                    continue
                at = text.index(word)
                targets = [at + m for m in range(len(word)) if has_moe(text[at + m])]
                if not targets:
                    continue
                how = []
                zy = annotate(text, words, how)
                for m in range(len(word)):
                    zy[at + m] = sylls[m]
                if not trusted(text, zy, how, settled, set(range(at, at + len(word)))):
                    dropped[0] += 1
                    continue
                for j, ch in enumerate(text):
                    if ch == '一':
                        zy[j] = 'ㄧ'
                    elif ch == '不':
                        zy[j] = 'ㄅㄨˋ'
                out.append({'s': text, 'z': zy, 'k': targets, 'src': 'c', 'r': word})
                taken.add(text)
                kept += 1
                if kept >= PER_ENTRY:
                    break
            if kept >= PER_ENTRY:
                break
    return out


# ---------- what to say ----------
def homophones():
    """{注音: the most common character whose only reading it is}; neutral tones are left to the voice.
    Where every common character with that sound has several readings (ㄧㄤˋ), the most common one whose
    usual reading it is (樣) stands in: voices read a character alone in its usual reading."""
    only = {}
    usual = {}
    for f in sorted((ROOT / 'data').glob('c*.json')):
        for ch, e in json.loads(f.read_text(encoding='utf-8')).items():
            zy = e.get('zy') or []
            if not zy or zy[0].startswith('˙') or ch not in char_rank or char_rank[ch] > 2000:
                continue
            # 一 and 不 change tone before other syllables, so they never stand in for anything
            if ch in '一不':
                continue
            table = only if len(zy) == 1 else usual
            if zy[0] not in table or char_rank[ch] < char_rank[table[zy[0]]]:
                table[zy[0]] = ch
    best = dict(usual)
    best.update(only)
    return best


def spoken(text, zys, homo):
    out = []
    for ch, zy in zip(text, zys):
        e = char_entry(ch) if HAN.match(ch) else None
        many = e is not None and len(e.get('zy') or []) > 1
        # a rare character is misread too (嚥 ㄧㄢˋ said as 燕 ㄧㄢ)
        rare = e is not None and char_rank.get(ch, 99999) > 3000
        if (many or rare) and zy and not zy.startswith('˙') and ch not in '一不' and homo.get(zy, ch) != ch:
            out.append(homo[zy])
        else:
            out.append(ch)
    return ''.join(out)


words = word_readings(sys.argv[3])
bank = bank_sentences(words)
mini = mini_sentences(sys.argv[1])
taken = set(x['s'] for x in bank + mini)
concised = concised_sentences(sys.argv[4], words, taken, settled_readings(mini))
homo = homophones()
(ROOT / 'data' / 'homophones.json').write_text(json.dumps(homo, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
for s in bank + mini + concised:
    s['t'] = tier_of([s['s'][k] for k in s['k']])
    v = spoken(s['s'], s['z'], homo)
    if v != s['s']:
        s['v'] = v
(ROOT / 'data' / 'sentences.json').write_text(json.dumps(bank + mini + concised, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('bank', len(bank), 'mini', len(mini), 'concised', len(concised), '(left out, a reading not sure:', dropped[0], ') homophones', len(homo))
for s in bank + mini + concised:
    if s['s'] in ('他還敢來？', '化悲憤為力量') or '還敢來' in s['s'] or '化悲憤為' in s['s']:
        print('voice:', s['s'], '→', s.get('v', s['s']))
tiers = {}
for s in bank + mini + concised:
    tiers[s['t']] = tiers.get(s['t'], 0) + 1
print('by tier', dict(sorted(tiers.items())))
for s in bank:
    print(s['g'], s['t'], ''.join(c + (('(' + z + ')') if z else '') for c, z in zip(s['s'], s['z'])), '→', ''.join(s['s'][k] for k in s['k']))
