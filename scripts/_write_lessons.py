import json

lessons = json.loads(open("data/_temp_lessons.json", encoding="utf-8").read())
with open("data/lessons-971-1000.json", "w", encoding="utf-8") as f:
    json.dump(lessons, f, ensure_ascii=False, indent=2)
print(f"Wrote {len(lessons)} lessons")
import os
os.remove("data/_temp_lessons.json")
