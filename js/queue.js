const Queue = {
  allLessons: [],

  init(lessons) {
    this.allLessons = lessons;
  },

  getBatch(progress) {
    const { learnedIds, skippedIds, batchSize } = progress;
    const excluded = new Set([...learnedIds, ...skippedIds]);
    const available = this.allLessons.filter(l => !excluded.has(l.id));
    return available.slice(0, batchSize);
  },

  getSkipped(progress) {
    const skippedSet = new Set(progress.skippedIds);
    return this.allLessons.filter(l => skippedSet.has(l.id));
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
