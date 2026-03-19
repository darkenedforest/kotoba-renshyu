const App = {
  currentBatchIndex: null,

  async init() {
    UI.init();

    // Tab nav
    document.querySelectorAll('.tab[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.showPage(btn.dataset.page);
        if (btn.dataset.page === 'path') this.renderPath();
        if (btn.dataset.page === 'list') this.renderList();
      });
    });

    // Settings
    document.getElementById('tab-settings').addEventListener('click', () =>
      UI.showSettings(Storage.getProgress())
    );
    UI.els.settingsClose.addEventListener('click', () => UI.hideSettings());
    UI.els.settingsSheet.addEventListener('click', (e) => {
      if (e.target === UI.els.settingsSheet) UI.hideSettings();
    });
    UI.els.batchSizeInput.addEventListener('change', (e) => {
      const size = Math.max(1, Math.min(50, parseInt(e.target.value) || 3));
      e.target.value = size;
      Storage.setBatchSize(size);
      this.renderPath();
    });
    UI.els.resetBtn.addEventListener('click', () => {
      if (confirm('Reset all progress?')) {
        localStorage.removeItem('kotoba-renshyu');
        UI.hideSettings();
        this.renderPath();
      }
    });

    // Batch sheet
    UI.els.batchClose.addEventListener('click', () => UI.hideBatchSheet());
    UI.els.batchSheet.addEventListener('click', (e) => {
      if (e.target === UI.els.batchSheet) UI.hideBatchSheet();
    });

    // Lesson sheet
    UI.els.lessonClose.addEventListener('click', () => UI.hideLesson());
    UI.els.lessonSheet.addEventListener('click', (e) => {
      if (e.target === UI.els.lessonSheet) UI.hideLesson();
    });

    // List filters
    document.querySelectorAll('.fpill').forEach(btn => {
      btn.addEventListener('click', () => this.renderList(btn.dataset.filter));
    });

    // Load
    const lessons = await this.loadLessons();
    Queue.init(lessons);
    this.renderPath();
  },

  async loadLessons() {
    const files = [
      'data/lessons-001-050.json',
      'data/lessons-021-070.json',
      'data/lessons-071-120.json',
      'data/lessons-121-170.json'
    ];
    try {
      const results = await Promise.all(files.map(f => fetch(f).then(r => r.json())));
      // Merge and deduplicate by id (later files don't override earlier ones)
      const seen = new Set();
      const all = [];
      for (const arr of results) {
        for (const lesson of arr) {
          if (!seen.has(lesson.id)) {
            seen.add(lesson.id);
            all.push(lesson);
          }
        }
      }
      return all.sort((a, b) => a.id - b.id);
    } catch (e) {
      console.error('Failed to load lessons:', e);
      return [];
    }
  },

  renderPath() {
    UI.renderPath(Storage.getProgress());
  },

  renderList(filter) {
    UI.renderList(Storage.getProgress(), filter || UI.currentFilter);
  },

  openBatch(index) {
    this.currentBatchIndex = index;
    const progress = Storage.getProgress();
    const batches = Queue.getBatches(progress.batchSize, progress);
    if (batches[index]) {
      UI.showBatchSheet(batches[index], progress);
    }
  },

  showLesson(id) {
    const word = Queue.getLessonById(id);
    if (word) UI.showLesson(word);
  },

  markLearned(id) {
    Storage.markLearned(id);
    const progress = Storage.getProgress();

    // Find next unlearned word in the current batch
    if (this.currentBatchIndex !== null) {
      const batches = Queue.getBatches(progress.batchSize, progress);
      const batch = batches[this.currentBatchIndex];
      if (batch) {
        const learnedSet = new Set(progress.learnedIds);
        const next = batch.words.find(w => !learnedSet.has(w.id));
        if (next) {
          UI.showLesson(Queue.getLessonById(next.id));
          this.renderPath();
          return;
        }
      }
    }

    // No more words in batch — close and go back
    UI.hideLesson();
    UI.hideBatchSheet();
    this.currentBatchIndex = null;
    this.renderPath();
  },

  markSkipped(id) {
    Storage.markSkipped(id);
    UI.hideLesson();
    UI.hideBatchSheet();
    this.currentBatchIndex = null;
    this.renderPath();
  },

  restoreWord(id) {
    Storage.restoreWord(id);
    this.renderPath();
    this.renderList();
  },

  skipFromList(id) {
    Storage.markSkipped(id);
    this.renderPath();
    this.renderList();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
