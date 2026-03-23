const App = {
  currentBatchIndex: null,
  _lessonOpenTime: null,
  _currentLessonId: null,

  async init() {
    // Initialize Firebase
    Firebase.init();

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

    // Auth buttons in settings
    document.getElementById('google-sign-in-btn').addEventListener('click', () => {
      Firebase.signInWithGoogle();
    });
    document.getElementById('sign-out-btn').addEventListener('click', () => {
      Firebase.signOut();
    });

    // Batch sheet
    UI.els.batchClose.addEventListener('click', () => UI.hideBatchSheet());
    UI.els.batchSheet.addEventListener('click', (e) => {
      if (e.target === UI.els.batchSheet) UI.hideBatchSheet();
    });

    // Lesson sheet
    UI.els.lessonClose.addEventListener('click', () => {
      this._logLessonTime();
      UI.hideLesson();
    });
    UI.els.lessonSheet.addEventListener('click', (e) => {
      if (e.target === UI.els.lessonSheet) {
        this._logLessonTime();
        UI.hideLesson();
      }
    });

    // List filters
    document.querySelectorAll('.fpill').forEach(btn => {
      btn.addEventListener('click', () => this.renderList(btn.dataset.filter));
    });

    // Feedback: vote buttons
    document.getElementById('vote-up-btn').addEventListener('click', () => this._handleVote('up'));
    document.getElementById('vote-down-btn').addEventListener('click', () => this._handleVote('down'));

    // Feedback: report error
    document.getElementById('report-error-link').addEventListener('click', () => {
      const form = document.getElementById('report-form');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('report-submit-btn').addEventListener('click', () => this._submitReport());

    // Comments: post
    document.getElementById('comment-post-btn').addEventListener('click', () => this._postComment());

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
    // Log time for previous lesson if still open
    this._logLessonTime();

    const word = await Queue.loadLesson(id);
    if (word) {
      this._lessonOpenTime = Date.now();
      this._currentLessonId = id;
      Firebase.logEvent('lesson_open', { lesson_id: id, word: word.kanji });
      UI.showLesson(word);
      // Load feedback UI
      this._loadLessonFeedback(id);
    }
  },

  async markLearned(id) {
    this._logLessonTime();
    const word = Queue.getLessonById(id);
    Firebase.logEvent('lesson_learned', { lesson_id: id, word: word ? word.kanji : '' });

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
            this._lessonOpenTime = Date.now();
            this._currentLessonId = next.id;
            Firebase.logEvent('lesson_open', { lesson_id: next.id, word: nextWord.kanji });
            UI.showLesson(nextWord);
            this._loadLessonFeedback(next.id);
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
    this._logLessonTime();
    const word = Queue.getLessonById(id);
    Firebase.logEvent('lesson_skipped', { lesson_id: id, word: word ? word.kanji : '' });

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
  },

  // ── Lesson time tracking ──

  _logLessonTime() {
    if (this._lessonOpenTime && this._currentLessonId) {
      const duration = Math.round((Date.now() - this._lessonOpenTime) / 1000);
      if (duration > 0 && duration < 3600) {
        Firebase.logEvent('lesson_time', {
          lesson_id: this._currentLessonId,
          duration_seconds: duration
        });
      }
    }
    this._lessonOpenTime = null;
    this._currentLessonId = null;
  },

  // ── Feedback ──

  async _handleVote(direction) {
    const lessonId = this._currentLessonId;
    if (!lessonId) return;

    const result = await Firebase.submitVote(lessonId, direction);
    if (result) {
      UI.updateVoteButtons(result);
    }
  },

  async _loadLessonFeedback(lessonId) {
    // Reset feedback UI
    UI.resetFeedbackUI();

    // Load existing vote
    const existingVote = await Firebase.getExistingVote(lessonId);
    if (existingVote) {
      UI.updateVoteButtons(existingVote);
    }

    // Load comments
    const comments = await Firebase.loadComments(lessonId);
    UI.renderComments(comments);
    UI.updateCommentAuth(Firebase.getUser());
  },

  async _submitReport() {
    const lessonId = this._currentLessonId;
    const textarea = document.getElementById('report-text');
    const text = textarea.value.trim();
    if (!lessonId || !text) return;

    await Firebase.submitReport(lessonId, text);
    textarea.value = '';
    document.getElementById('report-form').style.display = 'none';
    // Brief confirmation
    const link = document.getElementById('report-error-link');
    const orig = link.textContent;
    link.textContent = 'Report sent!';
    setTimeout(() => { link.textContent = orig; }, 2000);
  },

  async _postComment() {
    const lessonId = this._currentLessonId;
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!lessonId || !text) return;

    const result = await Firebase.postComment(lessonId, text);
    if (result) {
      input.value = '';
      // Reload comments
      const comments = await Firebase.loadComments(lessonId);
      UI.renderComments(comments);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
