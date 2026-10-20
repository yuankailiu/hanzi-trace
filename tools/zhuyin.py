import unicodedata

INITIALS = [
    ('zh', 'ㄓ'), ('ch', 'ㄔ'), ('sh', 'ㄕ'),
    ('b', 'ㄅ'), ('p', 'ㄆ'), ('m', 'ㄇ'), ('f', 'ㄈ'),
    ('d', 'ㄉ'), ('t', 'ㄊ'), ('n', 'ㄋ'), ('l', 'ㄌ'),
    ('g', 'ㄍ'), ('k', 'ㄎ'), ('h', 'ㄏ'),
    ('j', 'ㄐ'), ('q', 'ㄑ'), ('x', 'ㄒ'),
    ('r', 'ㄖ'), ('z', 'ㄗ'), ('c', 'ㄘ'), ('s', 'ㄙ'),
]

FINALS = {
    'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ê': 'ㄝ',
    'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
    'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ', 'er': 'ㄦ', 'ong': 'ㄨㄥ',
    'i': 'ㄧ', 'ia': 'ㄧㄚ', 'ie': 'ㄧㄝ', 'io': 'ㄧㄛ', 'iao': 'ㄧㄠ', 'iu': 'ㄧㄡ', 'iou': 'ㄧㄡ',
    'ian': 'ㄧㄢ', 'in': 'ㄧㄣ', 'iang': 'ㄧㄤ', 'ing': 'ㄧㄥ', 'iong': 'ㄩㄥ',
    'u': 'ㄨ', 'ua': 'ㄨㄚ', 'uo': 'ㄨㄛ', 'uai': 'ㄨㄞ', 'ui': 'ㄨㄟ', 'uei': 'ㄨㄟ',
    'uan': 'ㄨㄢ', 'un': 'ㄨㄣ', 'uen': 'ㄨㄣ', 'uang': 'ㄨㄤ', 'ueng': 'ㄨㄥ',
    'ü': 'ㄩ', 'üe': 'ㄩㄝ', 'üan': 'ㄩㄢ', 'ün': 'ㄩㄣ',
}

Y_W = {
    'yi': 'i', 'ya': 'ia', 'ye': 'ie', 'yo': 'io', 'yao': 'iao', 'you': 'iou',
    'yan': 'ian', 'yin': 'in', 'yang': 'iang', 'ying': 'ing', 'yong': 'iong',
    'yu': 'ü', 'yue': 'üe', 'yuan': 'üan', 'yun': 'ün',
    'wu': 'u', 'wa': 'ua', 'wo': 'uo', 'wai': 'uai', 'wei': 'uei',
    'wan': 'uan', 'wen': 'uen', 'wang': 'uang', 'weng': 'ueng',
}

TONE_MARKS = {'̄': 1, '́': 2, '̌': 3, '̀': 4}
TONE_ZY = {1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ'}


def split_tone(syllable):
    """'liú' -> ('liu', 2); 'lǜ' -> ('lü', 4); no mark -> neutral tone 5."""
    tone = 5
    base = ''
    for ch in unicodedata.normalize('NFD', syllable.lower()):
        if ch in TONE_MARKS:
            tone = TONE_MARKS[ch]
        else:
            base += ch
    base = unicodedata.normalize('NFC', base).replace('v', 'ü')
    return base, tone


def to_zhuyin(syllable):
    base, tone = split_tone(syllable)

    initial_zy = ''
    rest = base
    for py, zy in INITIALS:
        if base.startswith(py):
            initial_zy = zy
            rest = base[len(py):]
            break

    if initial_zy == '':
        rest = Y_W.get(base, base)
    elif initial_zy in 'ㄓㄔㄕㄖㄗㄘㄙ' and rest == 'i':
        rest = ''
    elif initial_zy in 'ㄐㄑㄒ' and rest.startswith('u'):
        rest = 'ü' + rest[1:]

    if rest == '':
        final_zy = ''
    elif rest in FINALS:
        final_zy = FINALS[rest]
    else:
        return None

    if tone == 5:
        return '˙' + initial_zy + final_zy
    return initial_zy + final_zy + TONE_ZY[tone]


if __name__ == '__main__':
    tests = ['liú', 'dài', 'tián', 'zhī', 'shì', 'lǜ', 'nǚ', 'jué', 'quán', 'xūn', 'yǔ', 'yuè', 'wèi',
             'wēn', 'yī', 'yòu', 'xiōng', 'yǒng', 'ér', 'de', 'guǐ', 'chūn', 'ài', 'ō', 'sī', 'zuò', 'en']
    for t in tests:
        print(t, to_zhuyin(t))
