#!/usr/bin/env python3
"""Build revised lessons 71-120."""
import json
import sys

# Read existing files
with open('data/lessons-051-100.json', 'r', encoding='utf-8') as f:
    file1 = json.load(f)
with open('data/lessons-101-150.json', 'r', encoding='utf-8') as f:
    file2 = json.load(f)

# Keep words 51-70 from file1
keep_51_70 = [x for x in file1 if x['id'] <= 70]
# Keep words 121-150 from file2
keep_121_150 = [x for x in file2 if x['id'] >= 121]

# Build revised lesson map (id -> new lesson HTML)
revised = {}

# Helper to build a godan verb conj chart
def godan_chart(stem, endings, particle_base, particle_pot=None, particle_pass="に", particle_caus="に／を", particle_causpass="に"):
    """
    endings: dict with keys: dict, neg, polite, polneg, past, polpast, te, vol, polvol, passive, caus, causpass, pot, imp, impnasai, condba, condtara
    particle_base: default particle for most forms
    particle_pot: particle for potential (defaults to particle_base for intransitive)
    """
    if particle_pot is None:
        particle_pot = particle_base
    rows = [
        ("Dictionary", endings["dict"], particle_base),
        ("Negative", endings["neg"], particle_base),
        ("Polite", endings["polite"], particle_base),
        ("Polite neg", endings["polneg"], particle_base),
        ("Past", endings["past"], particle_base),
        ("Polite past", endings["polpast"], particle_base),
        ("て-form", endings["te"], particle_base),
        ("Volitional", endings["vol"], particle_base),
        ("Polite vol", endings["polvol"], particle_base),
        ("Passive", endings["passive"], particle_pass),
        ("Causative", endings["caus"], particle_caus),
        ("Caus-pass", endings["causpass"], particle_causpass),
        ("Potential", endings["pot"], particle_pot),
        ("Imperative", endings["imp"], particle_base),
        ("Imp なさい", endings["impnasai"], particle_base),
        ("Cond ～ば", endings["condba"], particle_base),
        ("Cond ～たら", endings["condtara"], particle_base),
    ]
    html = '<table class="conj-chart">'
    for label, ending, particle in rows:
        html += f'<tr><td>{label}</td><td><span class="stem">{stem}</span><span class="ending">{ending}</span></td><td class="particle">{particle}</td></tr>'
    html += '</table>'
    return html

def ichidan_chart(stem, particle_base, particle_pot=None, particle_pass="に", particle_caus="に／を", particle_causpass="に"):
    if particle_pot is None:
        particle_pot = particle_base
    endings = {
        "dict": "る", "neg": "ない", "polite": "ます", "polneg": "ません",
        "past": "た", "polpast": "ました", "te": "て", "vol": "よう",
        "polvol": "ましょう", "passive": "られる", "caus": "させる",
        "causpass": "させられる", "pot": "られる", "imp": "ろ",
        "impnasai": "なさい", "condba": "れば", "condtara": "たら"
    }
    rows = [
        ("Dictionary", endings["dict"], particle_base),
        ("Negative", endings["neg"], particle_base),
        ("Polite", endings["polite"], particle_base),
        ("Polite neg", endings["polneg"], particle_base),
        ("Past", endings["past"], particle_base),
        ("Polite past", endings["polpast"], particle_base),
        ("て-form", endings["te"], particle_base),
        ("Volitional", endings["vol"], particle_base),
        ("Polite vol", endings["polvol"], particle_base),
        ("Passive", endings["passive"], particle_pass),
        ("Causative", endings["caus"], particle_caus),
        ("Caus-pass", endings["causpass"], particle_causpass),
        ("Potential", endings["pot"], particle_pot),
        ("Imperative", endings["imp"], particle_base),
        ("Imp なさい", endings["impnasai"], particle_base),
        ("Cond ～ば", endings["condba"], particle_base),
        ("Cond ～たら", endings["condtara"], particle_base),
    ]
    html = '<table class="conj-chart">'
    for label, ending, particle in rows:
        html += f'<tr><td>{label}</td><td><span class="stem">{stem}</span><span class="ending">{ending}</span></td><td class="particle">{particle}</td></tr>'
    html += '</table>'
    return html

def adj_i_chart(stem):
    rows = [
        ("Dictionary", "い"),
        ("Negative", "くない"),
        ("Past", "かった"),
        ("Past neg", "くなかった"),
        ("Adverb", "く"),
        ("て-form", "くて"),
    ]
    html = '<table class="conj-chart">'
    for label, ending in rows:
        html += f'<tr><td>{label}</td><td><span class="stem">{stem}</span><span class="ending">{ending}</span></td></tr>'
    html += '</table>'
    return html

def adj_na_chart(stem):
    rows = [
        ("Dictionary", "だ"),
        ("Negative", "じゃない"),
        ("Past", "だった"),
        ("Past neg", "じゃなかった"),
        ("Adverb", "に"),
        ("て-form", "で"),
    ]
    html = '<table class="conj-chart">'
    for label, ending in rows:
        html += f'<tr><td>{label}</td><td><span class="stem">{stem}</span><span class="ending">{ending}</span></td></tr>'
    html += '</table>'
    return html

print("Helper functions defined. Building lessons...", file=sys.stderr)
print("OK")
