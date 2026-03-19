const Queue = {
  allLessons: [],

  init(lessons) {
    this.allLessons = lessons;
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
    return this.allLessons.find(l => l.id === id) || null;
  },

  getLearnedCount(progress) {
    return progress.learnedIds.length;
  },

  getTotalCount() {
    return this.allLessons.length;
  }
};
