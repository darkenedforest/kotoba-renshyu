const Queue = {
  allLessons: [],

  init(lessons) {
    this.allLessons = lessons;
  },

  // Group words into batches of given size
  getBatches(batchSize) {
    const batches = [];
    for (let i = 0; i < this.allLessons.length; i += batchSize) {
      batches.push({
        index: batches.length,
        words: this.allLessons.slice(i, i + batchSize)
      });
    }
    return batches;
  },

  // Get batch status: 'complete', 'active', 'locked'
  getBatchStatus(batch, progress) {
    const learnedSet = new Set(progress.learnedIds);
    const skippedSet = new Set(progress.skippedIds);
    const allDone = batch.words.every(w => learnedSet.has(w.id) || skippedSet.has(w.id));
    const allLearned = batch.words.every(w => learnedSet.has(w.id));

    if (allLearned) return 'complete';
    if (allDone) return 'complete'; // all handled (learned or skipped)

    // Active if it's the first non-complete batch
    return null; // caller decides
  },

  getLessonById(id) {
    return this.allLessons.find(l => l.id === id) || null;
  },

  getLearnedCount(progress) {
    return progress.learnedIds.length;
  },

  getTotalCount() {
    return this.allLessons.length;
  }
};
