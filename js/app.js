const APP_VERSION = '20260326f';

const App = {
  currentBatchIndex: null,
  _lessonOpenTime: null,
  _currentLessonId: null,
  _cachedQuotes: null,
  _profanityList: [
    'fuck','shit','ass','bitch','damn','dick','cunt','bastard','piss','cock',
    'whore','slut','fag','nigger','nigga','retard','stfu','gtfo','kys',
    'くそ','クソ','糞','死ね','しね','ばか','バカ','馬鹿','アホ','きもい','キモい'
  ],

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

    // Particles toggle
    const particlesToggle = document.getElementById('particles-toggle');
    particlesToggle.checked = Particles.isEnabled();
    particlesToggle.addEventListener('change', (e) => {
      Particles.setEnabled(e.target.checked);
    });

    // Auth buttons — settings, topbar, and landing page
    document.getElementById('google-sign-in-btn').addEventListener('click', () => {
      Firebase.signInWithGoogle();
    });
    document.getElementById('topbar-signin').addEventListener('click', () => {
      Firebase.signInWithGoogle();
    });
    document.getElementById('landing-google-signin').addEventListener('click', () => {
      Firebase.signInWithGoogle();
    });
    document.getElementById('sign-out-btn').addEventListener('click', () => {
      Firebase.signOut();
    });

    // Display name save
    document.getElementById('save-name-btn').addEventListener('click', async () => {
      const input = document.getElementById('display-name-input');
      const status = document.getElementById('name-status');
      status.textContent = 'Saving...';
      status.className = 'name-status';
      const result = await Firebase.saveDisplayName(input.value);
      if (result.ok) {
        status.textContent = 'Saved!';
        status.className = 'name-status name-status-ok';
      } else {
        status.textContent = result.error;
        status.className = 'name-status name-status-err';
      }
      setTimeout(() => { status.textContent = ''; }, 3000);
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

    // Quote prompt
    document.getElementById('quote-close').addEventListener('click', () => this._closeQuotePrompt());
    document.getElementById('quote-sheet').addEventListener('click', (e) => {
      if (e.target === document.getElementById('quote-sheet')) this._closeQuotePrompt();
    });
    document.getElementById('quote-skip-btn').addEventListener('click', () => this._closeQuotePrompt());
    document.getElementById('quote-share-btn').addEventListener('click', () => this._submitQuote());
    document.getElementById('quote-input').addEventListener('input', (e) => {
      document.getElementById('quote-char-count').textContent = e.target.value.length;
    });

    // Quote detail popup
    document.getElementById('quote-detail-close').addEventListener('click', () => UI.closeQuoteDetail());
    document.getElementById('quote-detail-sheet').addEventListener('click', (e) => {
      if (e.target === document.getElementById('quote-detail-sheet')) UI.closeQuoteDetail();
    });
    document.getElementById('quote-heart-btn').addEventListener('click', () => this._handleQuoteHeart());
    document.getElementById('quote-report-btn').addEventListener('click', () => this._handleQuoteReport());

    // Inspiration sheet
    document.getElementById('inspiration-close').addEventListener('click', () => UI.hideInspirationSheet());
    document.getElementById('inspiration-sheet').addEventListener('click', (e) => {
      if (e.target === document.getElementById('inspiration-sheet')) UI.hideInspirationSheet();
    });

    // Topbar user pill — open inspiration sheet
    document.getElementById('topbar-user').addEventListener('click', () => this._openInspiration());

    // Load index only — full lessons are lazy-loaded on demand
    const index = await this.loadIndex();
    Queue.init(index);
    this.renderPath();

    // Load motivational quote stickers
    this._loadQuoteStickers();

    // Check for new hearts (once on init, only if signed in)
    this._checkNewHearts();

    // Start floating particles
    Particles.init();

    // Editor close/save/discard handlers (only wired up, editor itself is lazy-loaded)
    document.getElementById('editor-close').addEventListener('click', () => this._closeEditor());
    document.getElementById('editor-save').addEventListener('click', () => this._saveEditor());
    document.getElementById('editor-discard').addEventListener('click', () => this._discardEditor());
    document.getElementById('editor-preview-toggle').addEventListener('click', () => this._toggleEditorPreview());
  },

  async loadIndex() {
    try {
      const res = await fetch('data/index.json?v=' + APP_VERSION);
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

  _getCurrentBatch() {
    if (this.currentBatchIndex === null) return null;
    const progress = Storage.getProgress();
    const batches = Queue.getBatches(progress.batchSize, progress);
    return batches[this.currentBatchIndex] || null;
  },

  async showLesson(id) {
    // Log time for previous lesson if still open
    this._logLessonTime();

    const word = await Queue.loadLesson(id);
    if (word) {
      this._lessonOpenTime = Date.now();
      this._currentLessonId = id;
      Firebase.logEvent('lesson_open', { lesson_id: id, word: word.kanji });
      UI.showLesson(word, this._getCurrentBatch());
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
      console.log('markLearned: batchIndex=', this.currentBatchIndex, 'batch=', batch ? batch.words.length + ' words' : 'NULL');
      if (batch) {
        // Refresh the batch sheet behind the lesson
        UI.showBatchSheet(batch, progress);

        const learnedSet = new Set(progress.learnedIds);
        const next = batch.words.find(w => !learnedSet.has(w.id));
        if (next) {
          const nextWord = await Queue.loadLesson(next.id);
          if (nextWord) {
            this._lessonOpenTime = Date.now();
            this._currentLessonId = next.id;
            Firebase.logEvent('lesson_open', { lesson_id: next.id, word: nextWord.kanji });
            UI.showLesson(nextWord, batch);
            this._loadLessonFeedback(next.id);
            this.renderPath();
            return;
          }
        }
      }
    }

    // No more words in batch — show quote prompt before closing
    console.log('Batch complete! currentBatchIndex:', this.currentBatchIndex, 'Showing quote prompt');
    UI.hideLesson();
    UI.showQuotePrompt();
    this._pendingBatchClose = true;
    this.renderPath();
  },

  async continueFromLesson(id) {
    // "Continue" from a reviewed (already learned) lesson — advance to next unlearned in batch
    if (this.currentBatchIndex !== null) {
      const progress = Storage.getProgress();
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
            UI.showLesson(nextWord, batch);
            this._loadLessonFeedback(next.id);
            return;
          }
        }
      }
    }
    // No unlearned words left in batch — just close
    UI.hideLesson();
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
  },

  // ── Motivational Quotes ──

  _closeQuotePrompt() {
    UI.hideQuotePrompt();
    if (this._pendingBatchClose) {
      UI.hideBatchSheet();
      this.currentBatchIndex = null;
      this._pendingBatchClose = false;
    }
  },

  _containsProfanity(text) {
    const lower = text.toLowerCase();
    return this._profanityList.some(word => lower.includes(word));
  },

  async _submitQuote() {
    const input = document.getElementById('quote-input');
    const text = input.value.trim();
    if (!text) return;

    // Remove previous error if any
    const sheet = document.getElementById('quote-sheet');
    const existingErr = sheet.querySelector('.quote-error');
    if (existingErr) existingErr.remove();

    if (this._containsProfanity(text)) {
      const err = document.createElement('div');
      err.className = 'quote-error';
      err.textContent = 'Please keep it positive!';
      document.getElementById('quote-share-btn').insertAdjacentElement('afterend', err);
      return;
    }

    const batchIndex = this.currentBatchIndex !== null ? this.currentBatchIndex : 0;
    const result = await Firebase.submitQuote(text, batchIndex);
    if (result) {
      // Clear cache so new quotes load on next visit
      this._cachedQuotes = null;
      this._closeQuotePrompt();
      this._loadQuoteStickers();
    }
  },

  async _loadQuoteStickers() {
    // Use cached quotes for the session
    if (this._cachedQuotes) {
      UI.renderQuoteStickers(this._cachedQuotes);
      return;
    }

    const allQuotes = await Firebase.fetchRecentQuotes();
    if (allQuotes.length === 0) {
      this._cachedQuotes = [];
      return;
    }

    // Shuffle and cache — renderQuoteStickers decides how many to show based on progress
    const shuffled = allQuotes.sort(() => Math.random() - 0.5);
    this._cachedQuotes = shuffled;
    UI.renderQuoteStickers(this._cachedQuotes);
  },

  // ── Quote detail interactions ──

  async _handleQuoteHeart() {
    const sheet = document.getElementById('quote-detail-sheet');
    const quote = sheet._quoteData;
    if (!quote) return;

    const heartBtn = document.getElementById('quote-heart-btn');
    const heartIcon = document.getElementById('quote-heart-icon');
    const heartCount = document.getElementById('quote-heart-count');

    // Already hearted?
    if (heartBtn.classList.contains('hearted')) return;

    const result = await Firebase.heartQuote(quote.id);
    if (result) {
      heartBtn.classList.add('hearted', 'heart-bounce');
      heartIcon.innerHTML = '&#10084;';
      const current = parseInt(heartCount.textContent) || 0;
      heartCount.textContent = current + 1;
      // Also update the cached quote
      quote.hearts = (quote.hearts || 0) + 1;

      // Remove bounce class after animation
      setTimeout(() => heartBtn.classList.remove('heart-bounce'), 300);
    }
  },

  async _handleQuoteReport() {
    const sheet = document.getElementById('quote-detail-sheet');
    const quote = sheet._quoteData;
    if (!quote) return;

    const confirmed = await UI.showConfirm(
      '🚩',
      'Report this quote as inappropriate? It will be hidden and reviewed.',
      'Report',
      'btn btn-red-sm'
    );

    if (confirmed) {
      Firebase.reportQuote(quote.id);
      UI.closeQuoteDetail();
      if (this._cachedQuotes) {
        this._cachedQuotes = this._cachedQuotes.filter(q => q.id !== quote.id);
        UI.renderQuoteStickers(this._cachedQuotes);
      }
    }
  },

  // ── Heart notification badge ──

  async _checkNewHearts() {
    const user = Firebase.getUser();
    if (!user) return;

    const count = await Firebase.getNewHeartCount();
    UI.updateHeartBadge(count);
  },

  // ── Inspiration sheet ──

  // ── Lesson Editor (admin) ──

  _editorLoaded: false,
  _editorOriginalHtml: '',
  _editorLessonId: null,
  _editorPreviewMode: false,

  _tinymceContentStyle: [
    '.jp { font-family: "Noto Sans JP", sans-serif; color: #27272a; font-weight: 700; }',
    '.jp-example { font-family: "Noto Sans JP", sans-serif; color: #0ea5e9; font-weight: 700; }',
    '.gloss { color: #a1a1aa; font-size: 0.88em; }',
    '.highlight { background: #e0f2fe; padding: 0.1rem 0.35rem; border-radius: 5px; color: #0284c7; font-weight: 700; }',
    '.note-label { display: inline-block; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; background: #fff7ed; color: #ea580c; padding: 0.12rem 0.45rem; border-radius: 5px; border: 1px solid #fed7aa; }',
    '.wrong { text-decoration: line-through; color: #a1a1aa; }',
    '.reading { color: #2563eb; font-weight: 700; font-style: italic; }',
    '.stem { color: #27272a; }',
    '.ending { color: #0ea5e9; }',
    '.particle { color: #a1a1aa; font-size: 0.75rem; }',
    '.verb-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.5rem; }',
    '.group-badge, .trans-badge { font-size: 0.62rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 100px; }',
    '.group-badge { background: #e0f2fe; color: #0284c7; }',
    '.trans-badge { background: #fef3c7; color: #b45309; }',
    '.conj-chart { width: 100%; border-collapse: collapse; font-size: 0.82rem; }',
    '.conj-chart td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #f4f4f5; }',
    '.particle-note { font-size: 0.88rem; }',
    'ruby rt { font-size: 0.6em; }',
    'body { font-family: "Nunito", "Noto Sans JP", sans-serif; font-size: 0.9rem; line-height: 1.85; color: #52525b; }'
  ].join('\n'),

  async openEditor(lessonId) {
    if (!Firebase.isAdmin()) return;
    const word = await Queue.loadLesson(lessonId);
    if (!word) return;
    this._editorLessonId = lessonId;
    this._editorOriginalHtml = word.lesson || '';
    this._editorPreviewMode = false;
    document.getElementById("editor-kanji").textContent = word.kanji;
    document.getElementById("editor-kana").textContent = word.kana;
    document.getElementById("editor-meaning").textContent = word.meaning;
    // Editable header fields
    document.getElementById("editor-field-kanji").value = word.kanji || '';
    document.getElementById("editor-field-kana").value = word.kana || '';
    document.getElementById("editor-field-meaning").value = word.meaning || '';
    document.getElementById("editor-field-tags").value = (word.tags || []).join(', ');
    document.getElementById("editor-preview").style.display = "none";
    document.getElementById("editor-preview-toggle").textContent = "Preview";
    document.getElementById("editor-sheet").style.display = "flex";

    if (!this._editorLoaded) {
      await this._loadTinyMCE();
      this._editorLoaded = true;
    }

    // Always init fresh (we destroy on close)
    try {
      await this._initTinyMCE();
    } catch(e) {
      console.error('TinyMCE init failed:', e);
      alert('Editor failed to load: ' + e.message);
      return;
    }
  },

  _loadTinyMCE() {
    return new Promise(function(resolve, reject) {
      if (window.tinymce) { resolve(); return; }
      var script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/dbuhlydx8p91bon3day87zmi28hbrxd5gyhwzpytrd0o02a9/tinymce/6/tinymce.min.js';
      script.referrerPolicy = 'origin';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  _initTinyMCE() {
    var self = this;
    return tinymce.init({
      selector: '#editor-content',
      promotion: false,
      branding: false,
      skin: 'oxide',
      height: '100%',
      min_height: 400,
      resize: false,
      menubar: false,
      statusbar: false,
      valid_elements: '*[*]',
      extended_valid_elements: 'ruby[*],rt[*],rp[*],span[*],div[*],table[*],tr[*],td[*],th[*],thead[*],tbody[*]',
      valid_children: '+body[style|ruby|rt|rp]',
      verify_html: false,
      entity_encoding: 'raw',
      plugins: 'code table lists',
      toolbar: 'undo redo | bold italic underline strikethrough | forecolor backcolor | fontsize fontfamily | table | code | removeformat | rubyBtn cssClassBtn',
      content_style: self._tinymceContentStyle,
      content_css: false,
      font_family_formats: 'Nunito=Nunito,sans-serif; Noto Sans JP=Noto Sans JP,sans-serif; Serif=Georgia,serif; Monospace=Consolas,Monaco,monospace',
      setup: function(editor) {
        // Ruby button
        editor.ui.registry.addButton('rubyBtn', {
          text: 'Ruby',
          tooltip: 'Insert Ruby (furigana)',
          onAction: function() {
            self._insertRuby();
          }
        });

        // CSS Class dropdown
        editor.ui.registry.addMenuButton('cssClassBtn', {
          text: 'Class',
          tooltip: 'Apply CSS class',
          fetch: function(callback) {
            var classes = ['jp', 'jp-example', 'gloss', 'note-label', 'highlight', 'wrong', 'reading', 'stem', 'ending', 'particle'];
            var items = classes.map(function(cls) {
              return {
                type: 'menuitem',
                text: cls,
                onAction: function() {
                  self._applyCssClass(cls);
                }
              };
            });
            callback(items);
          }
        });

        editor.on('init', function() {
          editor.setContent(self._editorOriginalHtml);
        });
      }
    });
  },

  _insertRuby() {
    var editor = tinymce.get('editor-content');
    if (!editor) return;
    var selectedText = editor.selection.getContent({ format: 'text' });
    if (!selectedText) {
      selectedText = window.prompt('Enter the kanji text:');
      if (!selectedText) return;
    }
    var reading = window.prompt('Enter the reading (furigana):');
    if (!reading) return;
    editor.selection.setContent('<ruby>' + selectedText + '<rt>' + reading + '</rt></ruby>');
  },

  _applyCssClass(cls) {
    var editor = tinymce.get('editor-content');
    if (!editor) return;
    var selectedText = editor.selection.getContent({ format: 'html' });
    if (!selectedText) return;
    editor.selection.setContent('<span class="' + cls + '">' + selectedText + '</span>');
  },

  _toggleEditorPreview() {
    var previewEl = document.getElementById("editor-preview");
    var tinymceWrap = document.getElementById("editor-tinymce-wrap");
    var toggleBtn = document.getElementById("editor-preview-toggle");
    if (this._editorPreviewMode) {
      previewEl.style.display = "none";
      tinymceWrap.style.display = "";
      toggleBtn.textContent = "Preview";
      this._editorPreviewMode = false;
    } else {
      var html = this._getEditorHtml();
      previewEl.innerHTML = html;
      previewEl.style.display = "block";
      tinymceWrap.style.display = "none";
      toggleBtn.textContent = "Edit";
      this._editorPreviewMode = true;
    }
  },

  _getEditorHtml() {
    var editor = tinymce.get('editor-content');
    if (editor) return editor.getContent();
    return this._editorOriginalHtml;
  },

  async _saveEditor() {
    var html = this._getEditorHtml();
    var lessonId = this._editorLessonId;
    if (!lessonId) return;
    var saveBtn = document.getElementById("editor-save");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    // Get header field values
    var newKanji = document.getElementById("editor-field-kanji").value.trim();
    var newKana = document.getElementById("editor-field-kana").value.trim();
    var newMeaning = document.getElementById("editor-field-meaning").value.trim();
    var newTags = document.getElementById("editor-field-tags").value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);

    // 1. Update the live lesson cache immediately
    if (Queue.lessonCache[lessonId]) {
      Queue.lessonCache[lessonId].lesson = html;
      Queue.lessonCache[lessonId].kanji = newKanji;
      Queue.lessonCache[lessonId].kana = newKana;
      Queue.lessonCache[lessonId].meaning = newMeaning;
      Queue.lessonCache[lessonId].tags = newTags;
    }

    // 2. Update the currently displayed lesson content and header
    var lessonContent = document.getElementById('lesson-content');
    if (lessonContent) {
      lessonContent.innerHTML = html;
    }
    var lessonKanji = document.getElementById('lesson-kanji');
    var lessonKana = document.getElementById('lesson-kana');
    var lessonMeaning = document.getElementById('lesson-meaning');
    if (lessonKanji) lessonKanji.textContent = newKanji;
    if (lessonKana) lessonKana.textContent = newKana;
    if (lessonMeaning) lessonMeaning.textContent = newMeaning;

    // 3. Save to Firestore for back-sync
    var result = await Firebase.saveLessonEdit(lessonId, html, {
      kanji: newKanji,
      kana: newKana,
      meaning: newMeaning,
      tags: newTags
    });
    saveBtn.textContent = "Save";
    saveBtn.disabled = false;
    if (result) {
      this._closeEditor();
      UI.showEditorToast('Saved');
    } else {
      // Still applied locally even if Firestore failed
      this._closeEditor();
      UI.showEditorToast('Applied locally — Firestore save failed (check rules)');
      console.error('Firestore save failed. Edit applied locally but not synced.');
    }
  },

  _discardEditor() {
    this._closeEditor();
  },

  _closeEditor() {
    // Destroy TinyMCE instance so toolbar doesn't stick on screen
    var editor = window.tinymce && tinymce.get('editor-content');
    if (editor) {
      editor.destroy();
    }
    document.getElementById("editor-sheet").style.display = "none";
    this._editorLessonId = null;
    this._editorPreviewMode = false;
  },

  async _openInspiration() {
    const user = Firebase.getUser();
    if (!user) return;

    // Mark hearts as seen and clear badge
    await Firebase.markHeartsSeen();
    UI.updateHeartBadge(0);

    // Fetch user's quotes
    const quotes = await Firebase.fetchMyQuotes();
    UI.showInspirationSheet(quotes);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
