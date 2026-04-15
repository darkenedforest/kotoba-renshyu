#!/usr/bin/env python3
"""Transform conjugation tables: recolor with .changed/.suffix and dash unused forms."""

import json, os, re

DATA_DIR = '/home/user/kotoba-renshyu/data'

# ── Godan conjugation row mappings ──
# For each dictionary ending, map to the 5 vowel rows: a, i, u, e, o
GODAN_ROWS = {
    'う': ('わ','い','う','え','お'),
    'く': ('か','き','く','け','こ'),
    'ぐ': ('が','ぎ','ぐ','げ','ご'),
    'す': ('さ','し','す','せ','そ'),
    'つ': ('た','ち','つ','て','と'),
    'ぬ': ('な','に','ぬ','ね','の'),
    'ぶ': ('ば','び','ぶ','べ','ぼ'),
    'む': ('ま','み','む','め','も'),
    'る': ('ら','り','る','れ','ろ'),
}

# Past/て-form patterns by ending (suffix only, no changed kana — except す)
# Format: (past_suffix, te_suffix, tara_suffix, has_changed_in_past)
GODAN_PAST = {
    'う': ('った','って','ったら', False),
    'く': ('いた','いて','いたら', False),
    'ぐ': ('いだ','いで','いだら', False),
    'す': ('した','して','したら', True),   # し is changed (s-row)
    'つ': ('った','って','ったら', False),
    'ぬ': ('んだ','んで','んだら', False),
    'ぶ': ('んだ','んで','んだら', False),
    'む': ('んだ','んで','んだら', False),
    'る': ('った','って','ったら', False),
}

# ── Forms that get dashed per verb (by lesson ID) ──
# Standard set for event/state intransitive verbs
STD_EVENT = {'Passive','Causative','Caus-pass','Potential','Imperative','Imp なさい'}
# Event verbs that keep causative (it's commonly used)
STD_EVENT_KEEP_CAUS = {'Passive','Caus-pass','Potential','Imperative','Imp なさい'}
# Event verbs that keep potential and imperative
STD_EVENT_KEEP_POT_IMP = {'Passive','Causative','Caus-pass'}

DASH_FORMS = {
    # ── Pure event/state verbs: dash all 6 ──
    175: STD_EVENT,              # 起こる (to occur)
    226: STD_EVENT,              # 始まる (to begin)
    185: STD_EVENT,              # 続く (to continue)
    314: STD_EVENT,              # 違う (to differ)
    400: STD_EVENT,              # 閉まる (to close by itself)
    404: STD_EVENT,              # 開く/あく (to open by itself)
    288: STD_EVENT,              # 直る (to be fixed)
    406: STD_EVENT,              # 治る (to heal)
    588: STD_EVENT,              # 流行る (to be popular)
    384: STD_EVENT,              # 見つかる (to be found)
    254: STD_EVENT,              # 空く (to become empty)
    271: STD_EVENT,              # 曇る (to become cloudy)
    280: STD_EVENT,              # 渇く (to become thirsty)
    650: STD_EVENT,              # 届く (to reach/arrive)
    459: STD_EVENT,              # 目立つ (to stand out)
    619: STD_EVENT,              # 合う (to match/fit)
    439: STD_EVENT,              # 減る (to decrease)
    114: STD_EVENT,              # 落ちる (to fall)
    440: STD_EVENT,              # 消える (to disappear)
    415: STD_EVENT,              # 増える (to increase)
    661: STD_EVENT,              # こぼれる (to spill)
    251: STD_EVENT,              # 晴れる (to clear up)
    573: STD_EVENT,              # 壊れる (to break)
    607: STD_EVENT,              # 似ている (to resemble)
    826: STD_EVENT,              # 切れる (to be cut/run out)
    611: STD_EVENT,              # 遅れる (to be late)
    443: STD_EVENT,              # 生まれる (to be born)
    403: STD_EVENT,              # もつ (to last/endure)

    # ── Event verbs that keep causative ──
    45:  STD_EVENT_KEEP_CAUS,    # 終わる (終わらせる is very common)
    71:  STD_EVENT_KEEP_CAUS,    # 分かる (分からせる is common)
    608: STD_EVENT_KEEP_CAUS,    # 驚く (驚かせる is common)

    # ── Event verbs that keep potential + imperative ──
    430: STD_EVENT_KEEP_POT_IMP, # 変わる (変われ! = Change!)
    425: STD_EVENT_KEEP_POT_IMP, # 上がる (上がれる, 上がれ = Come up!)
    620: STD_EVENT_KEEP_POT_IMP, # 当たる (当たれ! = Hit!)
    23:  {'Passive','Causative','Caus-pass'},  # なる: keep potential (なれる), imperative (なれ)

    # ── Special: ある ──
    327: {'Volitional','Polite vol','Passive','Causative','Caus-pass','Potential','Imperative','Imp なさい'},

    # ── Special: できる (already potential of する) ──
    112: {'Volitional','Polite vol','Passive','Causative','Caus-pass','Potential','Imperative','Imp なさい'},

    # ── Special: 見える / 聞こえる (inherently potential-like) ──
    368: {'Passive','Causative','Caus-pass','Potential','Imperative','Imp なさい'},  # 見える
    803: {'Passive','Causative','Caus-pass','Potential','Imperative','Imp なさい'},  # 聞こえる
}

# Special: 行く past is いった not いいた
SPECIAL_PAST = {1}  # 行く

ALL_FORMS = [
    'Dictionary','Negative','Polite','Polite neg','Past','Polite past',
    'て-form','Volitional','Polite vol','Passive','Causative','Caus-pass',
    'Potential','Imperative','Imp なさい','Cond ～ば','Cond ～たら'
]

ADJ_FORMS_I = ['Dictionary','Negative','Past','Past neg','Adverb','て-form']
ADJ_FORMS_NA = ['Dictionary','Negative','Past','Past neg','Adverb','て-form']


def make_cell(stem, changed='', suffix=''):
    """Build HTML for a conjugation cell with color classes."""
    html = f'<span class="stem">{stem}</span>'
    if changed:
        html += f'<span class="changed">{changed}</span>'
    if suffix:
        html += f'<span class="suffix">{suffix}</span>'
    return html


def make_dash():
    return '—'


def build_godan_table(stem, ending, particle_map, dash_set, is_iku=False):
    """Generate full conjugation table for a godan verb."""
    rows_map = GODAN_ROWS[ending]
    a, i, u, e, o = rows_map
    past_info = GODAN_PAST[ending]
    past_suf, te_suf, tara_suf, past_has_changed = past_info

    # For す-ending verbs, past/te changed kana is し (i-row of s)
    if past_has_changed:
        past_changed = i  # し for す-verbs
        past_suffix_only = past_suf[1:]   # た from した
        te_suffix_only = te_suf[1:]       # て from して
        tara_suffix_only = tara_suf[1:]   # たら from したら
    else:
        past_changed = ''
        past_suffix_only = past_suf
        te_suffix_only = te_suf
        tara_suffix_only = tara_suf

    # Special case: 行く → 行った (not 行いた)
    if is_iku:
        past_changed = ''
        past_suffix_only = 'った'
        te_suffix_only = 'って'
        tara_suffix_only = 'ったら'

    form_data = {
        'Dictionary':  (stem, u, ''),
        'Negative':    (stem, a, 'ない'),
        'Polite':      (stem, i, 'ます'),
        'Polite neg':  (stem, i, 'ません'),
        'Past':        (stem, past_changed, past_suffix_only),
        'Polite past': (stem, i, 'ました'),
        'て-form':     (stem, past_changed, te_suffix_only),
        'Volitional':  (stem, o, 'う'),
        'Polite vol':  (stem, i, 'ましょう'),
        'Passive':     (stem, a, 'れる'),
        'Causative':   (stem, a, 'せる'),
        'Caus-pass':   (stem, a, 'せられる'),
        'Potential':   (stem, e, 'る'),
        'Imperative':  (stem, e, ''),
        'Imp なさい':   (stem, i, 'なさい'),
        'Cond ～ば':    (stem, e, 'ば'),
        'Cond ～たら':   (stem, past_changed, tara_suffix_only),
    }

    rows = []
    for form in ALL_FORMS:
        if form in dash_set:
            particle = ''
            cell = make_dash()
        else:
            s, c, sf = form_data[form]
            cell = make_cell(s, c, sf)
            particle = particle_map.get(form, particle_map.get('default', ''))
        rows.append(build_row(form, cell, particle))

    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_ichidan_table(stem, particle_map, dash_set):
    """Generate full conjugation table for an ichidan verb."""
    form_data = {
        'Dictionary':  (stem, 'る', ''),
        'Negative':    (stem, '', 'ない'),
        'Polite':      (stem, '', 'ます'),
        'Polite neg':  (stem, '', 'ません'),
        'Past':        (stem, '', 'た'),
        'Polite past': (stem, '', 'ました'),
        'て-form':     (stem, '', 'て'),
        'Volitional':  (stem, '', 'よう'),
        'Polite vol':  (stem, '', 'ましょう'),
        'Passive':     (stem, '', 'られる'),
        'Causative':   (stem, '', 'させる'),
        'Caus-pass':   (stem, '', 'させられる'),
        'Potential':   (stem, '', 'られる'),
        'Imperative':  (stem, '', 'ろ'),
        'Imp なさい':   (stem, '', 'なさい'),
        'Cond ～ば':    (stem, '', 'れば'),
        'Cond ～たら':   (stem, '', 'たら'),
    }

    rows = []
    for form in ALL_FORMS:
        if form in dash_set:
            cell = make_dash()
            particle = ''
        else:
            s, c, sf = form_data[form]
            cell = make_cell(s, c, sf)
            particle = particle_map.get(form, particle_map.get('default', ''))
        rows.append(build_row(form, cell, particle))

    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_iadj_table(stem):
    """Generate conjugation table for an い-adjective."""
    form_data = {
        'Dictionary': (stem, 'い', ''),
        'Negative':   (stem, '', 'くない'),
        'Past':       (stem, '', 'かった'),
        'Past neg':   (stem, '', 'くなかった'),
        'Adverb':     (stem, '', 'く'),
        'て-form':    (stem, '', 'くて'),
    }
    rows = []
    for form in ADJ_FORMS_I:
        s, c, sf = form_data[form]
        cell = make_cell(s, c, sf)
        rows.append(build_row(form, cell, ''))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_iadj_ii_table():
    """Special table for いい/よい."""
    rows = []
    rows.append(build_row('Dictionary', make_cell('', 'いい', ''), ''))
    rows.append(build_row('Negative', make_cell('よ', '', 'くない'), ''))
    rows.append(build_row('Past', make_cell('よ', '', 'かった'), ''))
    rows.append(build_row('Past neg', make_cell('よ', '', 'くなかった'), ''))
    rows.append(build_row('Adverb', make_cell('よ', '', 'く'), ''))
    rows.append(build_row('て-form', make_cell('よ', '', 'くて'), ''))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_nadj_table(stem):
    """Generate conjugation table for a な-adjective."""
    form_data = {
        'Dictionary': (stem, '', 'だ'),
        'Negative':   (stem, '', 'じゃない'),
        'Past':       (stem, '', 'だった'),
        'Past neg':   (stem, '', 'じゃなかった'),
        'Adverb':     (stem, '', 'に'),
        'て-form':    (stem, '', 'で'),
    }
    rows = []
    for form in ADJ_FORMS_NA:
        s, c, sf = form_data[form]
        cell = make_cell(s, c, sf)
        rows.append(build_row(form, cell, ''))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_row(form, cell_html, particle):
    """Build a single <tr> row."""
    parts = f'<tr><td>{form}</td><td>{cell_html}</td>'
    if particle is not None:
        parts += f'<td class="particle">{particle}</td>'
    return parts + '</tr>'


def extract_particles(html):
    """Extract existing particle values from a conj-chart."""
    particle_map = {}
    rows = re.findall(r'<tr><td>(.*?)</td><td>.*?</td>(?:<td class="particle">(.*?)</td>)?</tr>', html)
    for form_name, particle in rows:
        if particle:
            particle_map[form_name] = particle
    # Set default from most common particle
    if particle_map:
        # Dictionary form particle is the default
        particle_map['default'] = particle_map.get('Dictionary', '')
    return particle_map


def extract_stem(html):
    """Extract stem text from existing conj-chart."""
    m = re.search(r'<span class="stem">(.*?)</span>', html)
    return m.group(1) if m else None


def get_verb_type(tags):
    """Determine verb type from tags."""
    if 'godan verb' in tags:
        return 'godan'
    if 'ichidan verb' in tags:
        return 'ichidan'
    if 'irregular verb' in tags:
        return 'irregular'
    if 'する-verb' in tags:
        return 'suru'
    if 'い-adjective' in tags:
        return 'i-adj'
    if 'な-adjective' in tags:
        return 'na-adj'
    return 'other'


def build_irregular_suru_table(particle_map, dash_set):
    """する conjugation."""
    form_data = {
        'Dictionary':  ('', 'する', ''),
        'Negative':    ('', '', 'しない'),
        'Polite':      ('', '', 'します'),
        'Polite neg':  ('', '', 'しません'),
        'Past':        ('', '', 'した'),
        'Polite past': ('', '', 'しました'),
        'て-form':     ('', '', 'して'),
        'Volitional':  ('', '', 'しよう'),
        'Polite vol':  ('', '', 'しましょう'),
        'Passive':     ('', '', 'される'),
        'Causative':   ('', '', 'させる'),
        'Caus-pass':   ('', '', 'させられる'),
        'Potential':   ('', '', 'できる'),
        'Imperative':  ('', '', 'しろ'),
        'Imp なさい':   ('', '', 'しなさい'),
        'Cond ～ば':    ('', '', 'すれば'),
        'Cond ～たら':   ('', '', 'したら'),
    }
    rows = []
    for form in ALL_FORMS:
        if form in dash_set:
            cell = make_dash()
            particle = ''
        else:
            s, c, sf = form_data[form]
            cell = make_cell(s, c, sf)
            particle = particle_map.get(form, particle_map.get('default', ''))
        rows.append(build_row(form, cell, particle))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_irregular_kuru_table(particle_map, dash_set):
    """来る conjugation."""
    form_data = {
        'Dictionary':  ('', 'くる', ''),
        'Negative':    ('', '', 'こない'),
        'Polite':      ('', '', 'きます'),
        'Polite neg':  ('', '', 'きません'),
        'Past':        ('', '', 'きた'),
        'Polite past': ('', '', 'きました'),
        'て-form':     ('', '', 'きて'),
        'Volitional':  ('', '', 'こよう'),
        'Polite vol':  ('', '', 'きましょう'),
        'Passive':     ('', '', 'こられる'),
        'Causative':   ('', '', 'こさせる'),
        'Caus-pass':   ('', '', 'こさせられる'),
        'Potential':   ('', '', 'こられる'),
        'Imperative':  ('', '', 'こい'),
        'Imp なさい':   ('', '', 'きなさい'),
        'Cond ～ば':    ('', '', 'くれば'),
        'Cond ～たら':   ('', '', 'きたら'),
    }
    rows = []
    for form in ALL_FORMS:
        if form in dash_set:
            cell = make_dash()
            particle = ''
        else:
            s, c, sf = form_data[form]
            cell = make_cell(s, c, sf)
            particle = particle_map.get(form, particle_map.get('default', ''))
        rows.append(build_row(form, cell, particle))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def build_suru_compound_table(stem, particle_map, dash_set):
    """ごちそうする etc. — stem + する conjugation."""
    form_data = {
        'Dictionary':  (stem, 'する', ''),
        'Negative':    (stem, '', 'しない'),
        'Polite':      (stem, '', 'します'),
        'Polite neg':  (stem, '', 'しません'),
        'Past':        (stem, '', 'した'),
        'Polite past': (stem, '', 'しました'),
        'て-form':     (stem, '', 'して'),
        'Volitional':  (stem, '', 'しよう'),
        'Polite vol':  (stem, '', 'しましょう'),
        'Passive':     (stem, '', 'される'),
        'Causative':   (stem, '', 'させる'),
        'Caus-pass':   (stem, '', 'させられる'),
        'Potential':   (stem, '', 'できる'),
        'Imperative':  (stem, '', 'しろ'),
        'Imp なさい':   (stem, '', 'しなさい'),
        'Cond ～ば':    (stem, '', 'すれば'),
        'Cond ～たら':   (stem, '', 'したら'),
    }
    rows = []
    for form in ALL_FORMS:
        if form in dash_set:
            cell = make_dash()
            particle = ''
        else:
            s, c, sf = form_data[form]
            cell = make_cell(s, c, sf)
            particle = particle_map.get(form, particle_map.get('default', ''))
        rows.append(build_row(form, cell, particle))
    return '<table class="conj-chart">' + ''.join(rows) + '</table>'


def transform_lesson(lesson):
    """Transform a single lesson's conjugation table."""
    html = lesson.get('lesson', '')
    if 'conj-chart' not in html:
        return html

    tags = lesson.get('tags', [])
    verb_type = get_verb_type(tags)
    lesson_id = lesson['id']
    kana = lesson['kana']
    dash_set = DASH_FORMS.get(lesson_id, set())

    # Extract existing particles and stem
    chart_match = re.search(r'<table class="conj-chart">.*?</table>', html, re.DOTALL)
    if not chart_match:
        return html

    old_chart = chart_match.group(0)
    particle_map = extract_particles(old_chart)
    stem = extract_stem(old_chart)

    if stem is None:
        print(f"  WARNING: Could not extract stem for lesson {lesson_id} ({kana})")
        return html

    new_chart = None

    if verb_type == 'godan':
        ending = kana[-1]
        if ending not in GODAN_ROWS:
            print(f"  WARNING: Unknown godan ending '{ending}' for lesson {lesson_id} ({kana})")
            return html
        is_iku = (lesson_id == 1)  # 行く
        new_chart = build_godan_table(stem, ending, particle_map, dash_set, is_iku)

    elif verb_type == 'ichidan':
        new_chart = build_ichidan_table(stem, particle_map, dash_set)

    elif verb_type == 'i-adj':
        if lesson_id == 328:  # いい
            new_chart = build_iadj_ii_table()
        else:
            new_chart = build_iadj_table(stem)

    elif verb_type == 'na-adj':
        new_chart = build_nadj_table(stem)

    elif verb_type == 'irregular':
        if kana == 'する':
            new_chart = build_irregular_suru_table(particle_map, dash_set)
        elif kana == 'くる':
            new_chart = build_irregular_kuru_table(particle_map, dash_set)

    elif verb_type == 'suru':
        # Compound する verb like ごちそうする
        suru_stem = kana[:-2]  # Remove する
        new_chart = build_suru_compound_table(suru_stem, particle_map, dash_set)

    if new_chart:
        html = html[:chart_match.start()] + new_chart + html[chart_match.end():]

    return html


def main():
    files = sorted(f for f in os.listdir(DATA_DIR) if f.startswith('lessons-') and f.endswith('.json'))
    total_transformed = 0

    for fname in files:
        path = os.path.join(DATA_DIR, fname)
        with open(path, 'r', encoding='utf-8') as f:
            lessons = json.load(f)

        changed = 0
        for lesson in lessons:
            old_html = lesson.get('lesson', '')
            if 'conj-chart' not in old_html:
                continue

            new_html = transform_lesson(lesson)
            if new_html != old_html:
                lesson['lesson'] = new_html
                changed += 1

        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(lessons, f, ensure_ascii=False, separators=(',', ':'))
            total_transformed += changed
            print(f"{fname}: {changed} lessons transformed")

    print(f"\nTotal: {total_transformed} lessons transformed")


if __name__ == '__main__':
    main()
