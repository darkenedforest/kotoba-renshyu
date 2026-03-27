#!/usr/bin/env python3
"""
Pull pending lesson edits from Firestore and apply them to local JSON files.
Run this from the repo root: python scripts/pull_edits.py
"""

import json
import os
import sys

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

# Config
KEY_PATH = os.path.expanduser('~/.firebase-admin-key.json')
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

def init_firebase():
    cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def get_pending_edits(db):
    edits_ref = db.collection('lessonEdits').where('status', '==', 'pending')
    docs = edits_ref.stream()
    edits = []
    for doc in docs:
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        edits.append(data)
    return edits

def find_lesson_file(lesson_id):
    """Find which chunk file contains this lesson ID."""
    chunk_start = ((lesson_id - 1) // 50) * 50 + 1
    chunk_end = chunk_start + 49
    filename = f'lessons-{chunk_start:03d}-{chunk_end:03d}.json'
    filepath = os.path.join(DATA_DIR, filename)
    return filepath if os.path.exists(filepath) else None

def apply_edit(edit):
    """Apply a single edit to the local JSON file."""
    lesson_id = edit['lessonId']
    filepath = find_lesson_file(lesson_id)

    if not filepath:
        print(f'  WARNING: No file found for lesson {lesson_id}')
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        lessons = json.load(f)

    found = False
    for lesson in lessons:
        if lesson['id'] == lesson_id:
            # Update the lesson HTML
            lesson['lesson'] = edit['html']

            # Update metadata fields if present
            if 'kanji' in edit and edit['kanji']:
                lesson['kanji'] = edit['kanji']
            if 'kana' in edit and edit['kana']:
                lesson['kana'] = edit['kana']
            if 'meaning' in edit and edit['meaning']:
                lesson['meaning'] = edit['meaning']
            if 'tags' in edit and edit['tags']:
                lesson['tags'] = edit['tags']

            found = True
            break

    if not found:
        print(f'  WARNING: Lesson {lesson_id} not found in {os.path.basename(filepath)}')
        return False

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(lessons, f, ensure_ascii=False, indent=2)

    print(f'  Updated lesson {lesson_id} in {os.path.basename(filepath)}')
    return True

def mark_applied(db, doc_id):
    """Mark an edit as applied in Firestore."""
    db.collection('lessonEdits').document(doc_id).update({
        'status': 'applied'
    })

def update_index(edits):
    """Update index.json with any changed metadata."""
    index_path = os.path.join(DATA_DIR, 'index.json')
    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)

    index_map = {w['id']: w for w in index}
    changed = False

    for edit in edits:
        lid = edit['lessonId']
        if lid in index_map:
            if 'kanji' in edit and edit['kanji']:
                index_map[lid]['kanji'] = edit['kanji']
                changed = True
            if 'kana' in edit and edit['kana']:
                index_map[lid]['kana'] = edit['kana']
                changed = True
            if 'meaning' in edit and edit['meaning']:
                index_map[lid]['meaning'] = edit['meaning']
                changed = True
            if 'tags' in edit and edit['tags']:
                index_map[lid]['tags'] = edit['tags']
                changed = True

    if changed:
        index = sorted(index_map.values(), key=lambda x: x['id'])
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        print(f'  Updated index.json')

def main():
    print('Connecting to Firestore...')
    db = init_firebase()

    print('Fetching pending edits...')
    edits = get_pending_edits(db)

    if not edits:
        print('No pending edits.')
        return

    print(f'Found {len(edits)} pending edit(s):')
    for edit in edits:
        lid = edit['lessonId']
        print(f'\n  Lesson {lid}:')

        if apply_edit(edit):
            mark_applied(db, edit['_doc_id'])
            print(f'  Marked as applied in Firestore')

    # Update index if metadata changed
    update_index(edits)

    print(f'\nDone. {len(edits)} edit(s) applied.')
    print('Run "git diff" to review changes, then commit and push.')

if __name__ == '__main__':
    main()
