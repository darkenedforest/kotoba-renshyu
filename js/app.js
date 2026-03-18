const App = {
  async init() {
    UI.init();

    // Nav
    document.querySelectorAll('.bnav-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        UI.showPage(page);
        if (page === 'path') this.renderPath();
        if (page === 'list') this.renderList();
      });
    });

    // Settings
    UI.els.navSettings.addEventListener('click', () => {
      UI.showSettings(Storage.getProgress());
    });
    UI.els.settingsClose.addEventListener('click', () => UI.hideSettings());
    UI.els.batchSizeInput.addEventListener('change', (e) => {
      const size = Math.max(1, Math.min(50, parseInt(e.target.value) || 3));
      e.target.value = size;
      Storage.setBatchSize(size);
      this.renderPath();
    });
    UI.els.resetBtn.addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        localStorage.removeItem('kotoba-renshyu');
        UI.hideSettings();
        this.renderPath();
      }
    });

    // Lesson overlay
    UI.els.lessonClose.addEventListener('click', () => UI.hideLesson());
    UI.els.lessonOverlay.addEventListener('click', (e) => {
      if (e.target === UI.els.lessonOverlay) UI.hideLesson();
    });

    // List filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.renderList(btn.dataset.filter);
      });
    });

    // Load data
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

  showLesson(id) {
    const word = Queue.getLessonById(id);
    if (word) UI.showLesson(word);
  },

  markLearned(id) {
    Storage.markLearned(id);
    UI.hideLesson();
    this.renderPath();
  },

  markSkipped(id) {
    Storage.markSkipped(id);
    UI.hideLesson();
    this.renderPath();
  },

  unmarkLearnedFromList(id) {
    Storage.unmarkLearned(id);
    this.renderList();
  },

  markLearnedFromList(id) {
    Storage.markLearned(id);
    this.renderList();
  },

  markSkippedFromList(id) {
    Storage.markSkipped(id);
    this.renderList();
  },

  restoreWordFromList(id) {
    Storage.restoreWord(id);
    this.renderList();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
