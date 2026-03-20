# Kotoba Renshyu — Project Outline

## 1. Project Overview

Kotoba Renshyu is a companion web app for the Anki Core 1000 Japanese vocabulary deck. Every word in the deck gets a pregenerated lesson — not a dictionary entry, but a genuinely insightful, memorable piece designed to make the word stick. The app presents words in adjustable batches with a sliding queue, letting you work through the Core 1000 at your own pace.

Built for one person (Tyler), deployed on GitHub Pages, no backend.

## 2. Lesson Spec

### What Makes a Good Lesson

A good lesson creates a **brain-anchor** — something that makes the word click so it sticks on the next Anki review. The goal is insight, not information. A dictionary already has the information; the lesson's job is to connect the word to something memorable.

### What a Lesson Might Draw On

These are ingredients, not a checklist. A lesson uses whichever of these genuinely illuminate *this specific word* — and ignores the rest. The structure, order, and emphasis should be completely different from word to word.

- **Kanji origins** — where did this character come from? Oracle bone script, pictographic roots, how the visual evolved. Not "here are the radicals" but the actual story of the symbol.
- **Sound-meaning bridges** — how can the learner connect what the word *sounds like* to what it *means*? False cognates, mouth-feel, phonetic coincidences with English or other known Japanese words. The goal is a mnemonic anchor between sound and concept.
- **Etymology / word formation** — how the pieces combine, especially when it's surprising or clarifying
- **Cultural context** — when knowing how/where the word is actually used changes understanding
- **Surprising usage** — things that defy expectations (e.g., 夢を見る — you "see" dreams in Japanese, you don't "have" them)
- **Common confusion** — distinguishing from similar words the learner likely already knows
- **Word neighborhood** — when it makes sense, show what other words live in the same semantic space and *why you'd pick this one*. Not a synonym list — a practical comparison. Examples: an adverb meaning "just now" vs other time-related adverbs (さっき vs 先ほど vs ついさっき — when do you reach for each?). An adjective vs its adverb form (早い vs 早く — why the adverb here?). A 自動詞/他動詞 pair (開く vs 開ける — what changes?). Only include this when the distinction is genuinely useful for the word at hand; don't force comparisons where there's nothing interesting to say.
- **Register and nuance** — formal vs casual, written vs spoken, connotation

### Verb Lessons

Verb lessons include structured metadata in addition to the freeform lesson content:

- **Group** — ichidan (一段) or godan (五段), displayed as a small label
- **Transitivity** — 自動詞 (intransitive) or 他動詞 (transitive). If the verb has a 自動詞/他動詞 pair, name the counterpart and briefly explain the difference in use.
- **Particle explanation** — a series of short paragraphs just before the conjugation chart, each wrapped in `<p class="particle-note">`. Cover **every** particle situation for the verb:
  1. **Base particle** — why the verb takes the particle it does in its standard forms. Don't just say "it's transitive so it takes を." Explain what relationship the particle marks (e.g., を = you're acting on the thing, に = you're heading toward it).
  2. **Potential** — if the particle shifts (e.g., を → が for transitive verbs), explain why: the thing is no longer something you're doing to, it's something that's possible.
  3. **Passive** — explain that に marks the agent (the person who did the action to you). Give a concrete example.
  4. **Causative** — explain the に／を split: に for the person being made/allowed to act, を for what they're acting on (for transitive verbs). If the verb is intransitive, explain the を (coercive) vs に (permissive) distinction for the causee.
  Keep each paragraph to 1–3 sentences. The goal is intuition — the learner should understand *why* the particle changes, not just memorize which one to use.

- **Conjugation chart** — an HTML table with class `conj-chart` at the bottom of the lesson. Three columns per row:
  1. **Label** (first `<td>`) — the form name
  2. **Conjugation** (second `<td>`) — the conjugated form, split into `<span class="stem">` (unchanging part) and `<span class="ending">` (inflected part)
  3. **Particle** (third `<td class="particle">`) — the particle the verb takes in that form

  **Required rows, in this exact order:**
  Dictionary, Negative, Polite, Polite neg, Past, Polite past, て-form, Volitional, Polite vol, Passive, Causative, Caus-pass, Potential, Imperative, Imp なさい, Cond ～ば, Cond ～たら

  **Particle column rules:**
  - Show the particle the verb takes for each form. For most forms this is the verb's base particle (を for transitive, に/へ for movement verbs, etc.).
  - Forms where the particle shifts from the base: **Passive** → に (marks the agent), **Causative** → に／を (marks the causee), **Caus-pass** → に (marks the agent), **Potential** → が (marks what can be done, for transitive verbs; intransitive verbs keep their base particle).
  - Use ／ (fullwidth slash) to separate either/or particle options. Never use dots, dashes, or other separators.

  **Stem/ending split rules:**
  - The stem is the part of the kana that never changes across any conjugation. The ending is everything after.
  - For godan verbs: the stem is everything before the final consonant row (e.g., 買う → stem か, ending う/わない/います etc.)
  - For ichidan verbs: the stem is everything before る (e.g., 見る → stem み, ending る/ます/ない etc.)
  - For irregular verbs (する, 来る): the stem changes across forms — show whatever is most visually informative.

  This is reference material, not the lesson itself — keep it clean and compact.

### Adjective Lessons

い-adjective and な-adjective lessons include a conjugation chart at the bottom, just like verbs:

- **い-adjectives** — key forms: dictionary, negative (〜くない), past (〜かった), past negative (〜くなかった), adverb (〜く), て-form (〜くて). Use the same stem/ending color highlighting as verb charts.
- **な-adjectives** — key forms: dictionary, negative (〜じゃない), past (〜だった), past negative (〜じゃなかった), adverb (〜に), て-form (〜で). Same color treatment.

### Target Level

Low intermediate: knows hiragana and katakana, basic grammar, roughly 200–400 words. Lessons can reference basic vocabulary and grammar without explanation but should not assume knowledge of advanced structures.

### Anti-Patterns

- **No AI slop.** No bullet-point lists of disconnected facts. No "Let's explore this fascinating word!" No template fill-ins where you could swap any word in and get the same structure.
- **No templates.** If you can describe a formula that all the lessons follow (e.g., "paragraph 1 is always etymology, paragraph 2 is always sound, paragraph 3 is always usage"), you've failed. Each lesson should feel like it was written specifically for that word, with its own shape and emphasis. Some words need three paragraphs. Some need five. Some should lead with the sound, some with the kanji, some with a cultural detail. Let the word dictate the structure.
- **No padding.** If the word is straightforward, the lesson is short. Not every word needs a cultural deep-dive.
- **No dictionary regurgitation.** The learner can look up the definition themselves. The lesson adds what a dictionary can't.
- **No dry grammar notes.** Textbook explanations are not interesting. If grammar is relevant, weave it into a story or a practical insight, don't present it as a fact sheet. (Exception: verb lessons include a conjugation chart as structured reference at the bottom — but the lesson *content* itself should still not read like a grammar textbook.)

### Generation Process

Lessons are produced through a two-role editorial loop: a **Reviser** writes and rewrites, an **Editor** reviews and gates quality. They alternate until the Editor signs off.

1. **Reviser pass** — write the lesson content for each word, following the spec above
2. **Editor review** — a separate agent (or separate pass) reviews every lesson against the criteria below. The Editor produces specific notes for every lesson that fails. No lesson ships without Editor sign-off.
3. **Reviser revision** — rewrite only the flagged lessons based on Editor notes
4. **Editor re-review** — check the revisions. If any still fail, write more notes and kick back.
5. **Repeat steps 3–4** until the Editor has zero notes remaining.

### Editor Directive

The Editor's job is to ensure every lesson passes four gates. A lesson must clear **all four** to ship.

**1. Memorability** — Does the lesson contain a single clear brain-anchor that will make this word stick on the next Anki review? Not a definition, not a list of facts — one vivid thing (an image, a story, a surprising connection, a usage trap) that the learner will actually remember. If you read the lesson and can't point to that one thing, it fails.

**2. Authenticity** — Does the lesson sound like a knowledgeable human wrote it, or like AI generated it? Check for: formulaic transitions ("Here's the thing", "Interestingly"), uniform paragraph lengths, enthusiasm without substance, generic comparisons ("Both mean X but occupy different spaces"), and any phrasing you could swap into a different word's lesson without noticing. If it reads like it could be about any word, it fails.

**3. Structural variety** — Does this lesson have its own shape, or does it follow the same formula as the others? Compare against the surrounding 5–10 lessons. If you can describe a template they all share (e.g., "opens with kanji etymology, then usage, then comparison"), the batch fails. Lessons should vary in: what they lead with, paragraph count, paragraph length, which ingredients they use, and which they skip.

**4. Accuracy** — Are all conjugations correct? Are particle assignments right (including shifts for passive, causative, potential)? Are kanji etymologies grounded in real history, not invented? Are usage examples natural Japanese, not awkward constructions? Any factual error is an automatic fail.

## 3. App Behavior

### Batch Queue

- Words are presented in a **dynamic batch** (default size: 10, adjustable by the user)
- Batch order follows the CSV sequence (word 1 first, word 1000 last)
- The batch is a sliding window: when a word is completed or skipped, the next word from the queue fills the slot

### Word States

- **Current** — in the active batch, not yet acted on
- **Learned** — user marked as learned, removed from batch
- **Skipped** — user skipped for now, removed from batch
- All states are reversible — learned and skipped words can be restored to the queue

### Batch View

- Words can be skipped directly from the batch list (no need to open the lesson first)
- Tapping/clicking a word opens its full lesson
- The lesson view shows: word (kanji), reading (kana), meaning, and the lesson content

### Full Word List

- Accessible from the header as a separate view
- Shows every word with its current state (learned, skipped, or in queue)
- Allows toggling any word's state: mark as learned, skip, or restore to queue
- Acts as the master control panel for managing progress

### Progress Persistence

- All progress (current position in queue, learned/skipped states, batch size preference) stored in **localStorage**
- No accounts, no server, no sync

## 4. Tech Stack

- **Vanilla HTML, CSS, JavaScript** — no frameworks, no build tools, no dependencies
- **GitHub Pages** for hosting
- **No backend** — everything runs client-side
- Data files are static JSON served alongside the app

## 5. Data Format

### Index File

`data/index.json` contains lightweight metadata for every word — just enough to render the path, batch lists, and word list without loading full lesson content:

```json
[
  {"id": 1, "kanji": "行く", "kana": "いく", "meaning": "to go", "tags": ["godan verb", "自動詞", "irregular て-form"]},
  ...
]
```

This is the only file fetched on app init. Everything else is lazy-loaded.

### Chunked Lesson Files

Full lesson content (including HTML lesson text, conjugation charts, etc.) is stored in chunked JSON files by word range:

```
data/lessons-001-050.json
data/lessons-051-100.json
...
```

Each file contains an array of lesson objects:

```json
[
  {
    "id": 1,
    "kanji": "人",
    "kana": "ひと",
    "meaning": "person",
    "tags": ["noun"],
    "lesson": "<p>Lesson HTML content here...</p>"
  }
]
```

- `id` matches the word's position in the CSV (1-indexed)
- `lesson` contains rendered HTML (not markdown), ready to inject into the page
- Chunk size of 50 keeps individual files small enough for fast loading
- Chunks are lazy-loaded on demand: when a user opens a lesson, the app fetches the chunk containing that word (determined by `Math.ceil(id/50)`), caches all lessons from the chunk, and shows the requested lesson
- Once a chunk is cached, subsequent lessons from the same chunk load instantly

### Source Data

The Core 1000 vocab CSV lives in Google Drive (ID: `1yrQzC5Xh2mgcHRRcISsXhkmUgvqLWQZy`). Lesson generation reads from this CSV and produces the JSON data files.

## 6. File Structure

```
kotoba-renshyu/
├── index.html              # Main app page
├── css/
│   └── style.css           # All styles
├── js/
│   ├── app.js              # App initialization and routing
│   ├── queue.js             # Batch/queue logic
│   ├── storage.js           # localStorage interface
│   └── ui.js                # DOM manipulation and rendering
├── data/
│   ├── index.json           # Word metadata index (loaded on init)
│   ├── lessons-001-050.json # Full lesson content chunks (lazy-loaded)
│   ├── lessons-051-100.json
│   └── ...
├── scripts/
│   └── generate-lessons.js  # Lesson generation script (run locally)
├── PROJECT_OUTLINE.md
├── CLAUDE.md
└── README.md
```

## 7. Implementation Phases

### Phase 1: App Shell

Build the UI and queue logic with placeholder lesson content.

- HTML structure and CSS styling
- Batch display with adjustable size
- Sliding queue mechanics (learned/skip → next word fills in)
- localStorage persistence for progress
- Lesson detail view (initially with placeholder content)
- Skipped word pool and revisit flow

### Phase 2: Lesson Generation

Generate real lessons for all 1000 words. Done in batches across multiple sessions.

- Read vocab data from the CSV
- Write pass: generate lesson content for each word
- Revision loop: iteratively review and tighten each lesson until it can't be meaningfully improved
- Output chunked JSON data files
- Incremental: can generate a range at a time (e.g., words 1–50)

### Phase 3: Polish

- Mobile-responsive layout
- Dark mode
- Search/filter within learned words
- Progress stats (words learned, completion percentage)
- Improved skipped-word management
