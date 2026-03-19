const Queue = {
  allLessons: [],
  lessonCache: {},

  init(indexData) {
    this.allLessons = indexData;
  },

  // Group non-skipped words into batches of given size
  getBatches(batchSize, progress) {
    const skippedSet = new Set(progress ? progress.skippedIds : []);
    const words = this.allLessons.filter(w => !skippedSet.has(w.id));
    const batches = [];
    for (let i = 0; i < words.length; i += batchSize) {
      batches.push({
        index: batches.length,
        words: words.slice(i, i + batchSize)
      });
    }
    return batches;
  },

  getLessonById(id) {
    return this.lessonCache[id] || null;
  },

  async loadLesson(id) {
    // Return from cache if already loaded
    if (this.lessonCache[id]) return this.lessonCache[id];

    // Determine which chunk file contains this word
    const chunkStart = Math.floor((id - 1) / 50) * 50 + 1;
    const chunkEnd = chunkStart + 49;
    const pad = n => String(n).padStart(3, '0');
    const file = `data/lessons-${pad(chunkStart)}-${pad(chunkEnd)}.json`;

    try {
      const res = await fetch(file);
      const lessons = await res.json();
      // Cache all lessons from the chunk
      for (const lesson of lessons) {
        this.lessonCache[lesson.id] = lesson;
      }
      return this.lessonCache[id] || null;
    } catch (e) {
      console.error(`Failed to load lesson chunk ${file}:`, e);
      return null;
    }
  },

  getLearnedCount(progress) {
    return progress.learnedIds.length;
  },

  getTotalCount() {
    return this.allLessons.length;
  }
};
