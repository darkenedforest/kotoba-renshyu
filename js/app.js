const App = {
  async init() {
    UI.init();

    // Wire up controls FIRST, before any async work
    UI.els.backBtn.addEventListener('click', () => this.showBatch());
    UI.els.listBackBtn.addEventListener('click', () => this.showBatch());
    UI.els.listBtn.addEventListener('click', () => this.showFullList());
    UI.els.batchSizeInput.addEventListener('change', (e) => {
      const size = Math.max(1, Math.min(50, parseInt(e.target.value) || 3));
      e.target.value = size;
      Storage.setBatchSize(size);
      this.renderBatch();
    });
    UI.els.skippedToggle.addEventListener('click', () => {
      UI.els.skippedList.classList.toggle('open');
    });

    // Then load data
    const lessons = await this.loadLessons();
    Queue.init(lessons);
    this.renderBatch();
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

  renderBatch() {
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
    this.renderBatch();
  },

  showFullList() {
    const progress = Storage.getProgress();
    UI.showFullList();
    UI.renderFullList(progress);
    UI.updateProgress(progress);
  },

  markLearned(id) {
    Storage.markLearned(id);
    UI.showBatch();
    this.renderBatch();
  },

  markSkipped(id) {
    Storage.markSkipped(id);
    this.renderBatch();
  },

  restoreWord(id) {
    Storage.restoreWord(id);
    this.renderBatch();
  },

  unmarkLearned(id) {
    Storage.unmarkLearned(id);
    this.showFullList();
  },

  markLearnedFromList(id) {
    Storage.markLearned(id);
    this.showFullList();
  },

  markSkippedFromList(id) {
    Storage.markSkipped(id);
    this.showFullList();
  },

  restoreWordFromList(id) {
    Storage.restoreWord(id);
    this.showFullList();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
