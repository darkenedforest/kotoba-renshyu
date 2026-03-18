const Storage = {
  KEY: 'kotoba-renshyu',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || {};
    } catch {
      return {};
    }
  },

  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  getProgress() {
    const data = this._load();
    return {
      learnedIds: data.learnedIds || [],
      skippedIds: data.skippedIds || [],
      batchSize: data.batchSize || 3,
      queueStart: data.queueStart || 0
    };
  },

  saveProgress(progress) {
    this._save(progress);
  },

  markLearned(id) {
    const p = this.getProgress();
    if (!p.learnedIds.includes(id)) {
      p.learnedIds.push(id);
    }
    p.skippedIds = p.skippedIds.filter(sid => sid !== id);
    this.saveProgress(p);
    return p;
  },

  unmarkLearned(id) {
    const p = this.getProgress();
    p.learnedIds = p.learnedIds.filter(lid => lid !== id);
    this.saveProgress(p);
    return p;
  },

  markSkipped(id) {
    const p = this.getProgress();
    if (!p.skippedIds.includes(id)) {
      p.skippedIds.push(id);
    }
    this.saveProgress(p);
    return p;
  },

  restoreSkipped(id) {
    const p = this.getProgress();
    p.skippedIds = p.skippedIds.filter(sid => sid !== id);
    this.saveProgress(p);
    return p;
  },

  // Restore any word (learned or skipped) back to queue
  restoreWord(id) {
    const p = this.getProgress();
    p.learnedIds = p.learnedIds.filter(lid => lid !== id);
    p.skippedIds = p.skippedIds.filter(sid => sid !== id);
    this.saveProgress(p);
    return p;
  },

  setBatchSize(size) {
    const p = this.getProgress();
    p.batchSize = size;
    this.saveProgress(p);
    return p;
  }
};
