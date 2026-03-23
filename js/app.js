const App = {
  currentBatchIndex: null,

  async init() {
    // Landing page logic
    const landing = document.getElementById('landing');
    const seenIntro = localStorage.getItem('kotoba-seen-intro');
    if (!seenIntro) {
      landing.style.display = '';
      document.getElementById('app').style.display = 'none';
      document.getElementById('landing-start').addEventListener('click', () => {
        localStorage.setItem('kotoba-seen-intro', '1');
        landing.style.display = 'none';
        document.getElementById('app').style.display = '';
      });
    }

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

    // Load index only — full lessons are lazy-loaded on demand
    const index = await this.loadIndex();
    Queue.init(index);
    this.renderPath();
  },

  async loadIndex() {
    try {
      const res = await fetch('data/index.json');
      return await res.json();
    } catch (e) {
      console.error('Failed to load index:', e);
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

  async showLesson(id) {
    const word = await Queue.loadLesson(id);
    if (word) UI.showLesson(word);
  },

  async markLearned(id) {
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
          const nextWord = await Queue.loadLesson(next.id);
          if (nextWord) {
            UI.showLesson(nextWord);
            this.renderPath();
            return;
          }
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
