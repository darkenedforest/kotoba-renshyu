const App = {
  async init() {
    UI.init();

    // Load lesson data
    const lessons = await this.loadLessons();
    Queue.init(lessons);

    // Wire up controls
    UI.els.backBtn.addEventListener('click', () => this.showBatch());
    UI.els.batchSizeInput.addEventListener('change', (e) => {
      const size = Math.max(1, Math.min(50, parseInt(e.target.value) || 3));
      e.target.value = size;
      Storage.setBatchSize(size);
      this.renderAll();
    });
    UI.els.skippedToggle.addEventListener('click', () => {
      UI.els.skippedList.classList.toggle('open');
    });

    this.renderAll();
  },

  async loadLessons() {
    // For now, load the single chunk we have
    try {
      const resp = await fetch('data/lessons-001-050.json');
      return await resp.json();
    } catch (e) {
      console.error('Failed to load lessons:', e);
      return [];
    }
  },

  renderAll() {
    const progress = Storage.getProgress();
    const batch = Queue.getBatch(progress);
    const skipped = Queue.getSkipped(progress);
    UI.renderBatch(batch, progress);
    UI.renderSkipped(skipped);
  },

  showLesson(id) {
    const word = Queue.getLessonById(id);
    if (word) UI.showLesson(word);
  },

  showBatch() {
    UI.showBatch();
    this.renderAll();
  },

  markLearned(id) {
    Storage.markLearned(id);
    UI.showBatch();
    this.renderAll();
  },

  markSkipped(id) {
    Storage.markSkipped(id);
    UI.showBatch();
    this.renderAll();
  },

  restoreWord(id) {
    Storage.restoreSkipped(id);
    this.renderAll();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
