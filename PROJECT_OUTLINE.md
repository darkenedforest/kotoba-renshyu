# Kotoba Renshyu — Project Outline

## 1. Project Overview

Kotoba Renshyu is a companion web app for the Anki Core 1000 Japanese vocabulary deck. Every word in the deck gets a pregenerated lesson — not a dictionary entry, but a genuinely insightful, memorable piece designed to make the word stick. The app presents words in adjustable batches with a sliding queue, letting you work through the Core 1000 at your own pace.

Built for one person (Tyler), deployed on GitHub Pages, no backend.

## 2. Lesson Spec

### What Makes a Good Lesson

A good lesson creates a **brain-anchor** — something that makes the word click so it sticks on the next Anki review. The goal is insight, not information. A dictionary already has the information; the lesson's job is to connect the word to something memorable.

### What a Lesson Might Include

Not every word needs every element. The lesson picks what's genuinely useful for *that specific word*:

- **Kanji breakdown** — when the components tell a story or reveal meaning (not just listing radicals)
- **Etymology / word formation** — how the pieces combine, especially when it's surprising or clarifying
- **Mnemonics** — vivid, specific memory hooks (not forced acronyms)
- **Cultural context** — when knowing how/where the word is actually used changes understanding
- **Sound connections** — when the reading connects to other known words or has a memorable quality
- **Common confusion** — distinguishing from similar words the learner likely already knows
- **Register and nuance** — formal vs casual, written vs spoken, connotation
- **Example in context** — a natural sentence that reveals how the word actually behaves

### Target Level

Low intermediate: knows hiragana and katakana, basic grammar, roughly 200–400 words. Lessons can reference basic vocabulary and grammar without explanation but should not assume knowledge of advanced structures.

### Anti-Patterns

- **No AI slop.** No bullet-point lists of disconnected facts. No "Let's explore this fascinating word!" No template fill-ins where you could swap any word in and get the same structure.
- **No padding.** If the word is straightforward, the lesson is short. Not every word needs a cultural deep-dive.
- **No dictionary regurgitation.** The learner can look up the definition themselves. The lesson adds what a dictionary can't.
- **No forced structure.** Each lesson follows the shape the word demands, not a fixed template.

### Generation Process

Each lesson is written then iteratively revised until it's as good as it can be:
1. **Writing pass** — generate the lesson content
2. **Revision loop** — review for slop, padding, accuracy, and tone; tighten and improve; repeat until the lesson can't be meaningfully improved

## 3. App Behavior

### Batch Queue

- Words are presented in a **dynamic batch** (default size: 10, adjustable by the user)
- Batch order follows the CSV sequence (word 1 first, word 1000 last)
- The batch is a sliding window: when a word is completed or skipped, the next word from the queue fills the slot

### Word States

- **Current** — in the active batch, not yet acted on
- **Learned** — user marked as learned, removed from batch
- **Skipped** — user skipped for now, removed from batch

### Lesson Detail View

- Tapping/clicking a word in the batch opens its full lesson
- The lesson view shows: word (kanji), reading (kana), meaning, and the lesson content

### Progress Persistence

- All progress (current position in queue, learned/skipped states, batch size preference) stored in **localStorage**
- No accounts, no server, no sync

### Skipped Words

- Skipped words go into a separate pool that can be revisited later
- The user can pull skipped words back into their active queue

## 4. Tech Stack

- **Vanilla HTML, CSS, JavaScript** — no frameworks, no build tools, no dependencies
- **GitHub Pages** for hosting
- **No backend** — everything runs client-side
- Data files are static JSON served alongside the app

## 5. Data Format

### Lesson Storage

Lessons are stored as JSON files chunked by word range:

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
    "lesson": "<p>Lesson HTML content here...</p>"
  }
]
```

- `id` matches the word's position in the CSV (1-indexed)
- `lesson` contains rendered HTML (not markdown), ready to inject into the page
- Chunk size of 50 keeps individual files small enough for fast loading

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
│   ├── lessons-001-050.json # Lesson data chunks
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
