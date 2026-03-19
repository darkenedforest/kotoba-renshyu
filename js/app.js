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
    try {
      const resp = await fetch('data/lessons-001-050.json');
      return await resp.json();
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
    const batches = Queue.getBatches(progress.batchSize);
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
    UI.hideLesson();
    // Refresh batch sheet if open
    if (this.currentBatchIndex !== null) {
      const progress = Storage.getProgress();
      const batches = Queue.getBatches(progress.batchSize);
      if (batches[this.currentBatchIndex]) {
        UI.showBatchSheet(batches[this.currentBatchIndex], progress);
      }
    }
    this.renderPath();
  },

  markSkipped(id) {
    Storage.markSkipped(id);
    UI.hideLesson();
    if (this.currentBatchIndex !== null) {
      const progress = Storage.getProgress();
      const batches = Queue.getBatches(progress.batchSize);
      if (batches[this.currentBatchIndex]) {
        UI.showBatchSheet(batches[this.currentBatchIndex], progress);
      }
    }
    this.renderPath();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
