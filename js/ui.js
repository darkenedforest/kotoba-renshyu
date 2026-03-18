const UI = {
  els: {},

  init() {
    this.els = {
      batchView: document.getElementById('batch-view'),
      lessonView: document.getElementById('lesson-view'),
      fullListView: document.getElementById('full-list-view'),
      wordList: document.getElementById('word-list'),
      batchSizeInput: document.getElementById('batch-size'),
      progressText: document.getElementById('progress-text'),
      progressFill: document.getElementById('progress-fill'),
      lessonKanji: document.getElementById('lesson-kanji'),
      lessonKana: document.getElementById('lesson-kana'),
      lessonMeaning: document.getElementById('lesson-meaning'),
      lessonTags: document.getElementById('lesson-tags'),
      lessonContent: document.getElementById('lesson-content'),
      learnedBtn: document.getElementById('learned-btn'),
      skipBtn: document.getElementById('skip-btn'),
      backBtn: document.getElementById('back-btn'),
      navBatch: document.getElementById('nav-batch'),
      navList: document.getElementById('nav-list'),
      fullList: document.getElementById('full-list'),
      listCount: document.getElementById('list-count'),
      skippedToggle: document.getElementById('skipped-toggle'),
      skippedList: document.getElementById('skipped-list'),
      skippedSection: document.getElementById('skipped-section')
    };
  },

  hideAll() {
    this.els.batchView.style.display = 'none';
    this.els.lessonView.style.display = 'none';
    this.els.fullListView.style.display = 'none';
    this.els.navBatch.classList.remove('active');
    this.els.navList.classList.remove('active');
  },

  renderBatch(batch, progress) {
    const list = this.els.wordList;
    list.innerHTML = '';

    if (batch.length === 0) {
      const remaining = Queue.getTotalCount() - Queue.getLearnedCount(progress);
      if (remaining <= 0) {
        list.innerHTML = '<div class="batch-complete"><div class="complete-icon">&#x2728;</div><h3>All done!</h3><p>You\'ve worked through every word.</p></div>';
      } else {
        list.innerHTML = '<div class="batch-complete"><div class="complete-icon">&#x2714;</div><h3>Batch complete</h3><p>Nice work. Adjust your batch size or restore skipped words to keep going.</p></div>';
      }
      this.els.batchSizeInput.value = progress.batchSize;
      this.updateProgress(progress);
      return;
    }

    batch.forEach((word, i) => {
      const card = document.createElement('div');
      card.className = 'word-card';
      card.setAttribute('data-index', i + 1);
      card.innerHTML = `
        <div class="card-main">
          <span class="card-kanji">${word.kanji}</span>
          <span class="card-kana">${word.kana}</span>
          <span class="card-meaning">${word.meaning}</span>
        </div>
        <button class="card-skip" title="Skip" aria-label="Skip word">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      `;
      // Whole card is tappable
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-skip')) {
          App.showLesson(word.id);
        }
      });
      card.querySelector('.card-skip').addEventListener('click', (e) => {
        e.stopPropagation();
        App.markSkipped(word.id);
      });
      list.appendChild(card);
    });

    this.els.batchSizeInput.value = progress.batchSize;
    this.updateProgress(progress);
  },

  renderSkipped(skipped) {
    const list = this.els.skippedList;
    list.innerHTML = '';

    if (skipped.length === 0) {
      this.els.skippedSection.style.display = 'none';
      return;
    }

    this.els.skippedSection.style.display = 'block';
    this.els.skippedToggle.textContent = `${skipped.length} skipped`;

    skipped.forEach(word => {
      const card = document.createElement('div');
      card.className = 'skipped-card';
      card.innerHTML = `
        <div class="skipped-info">
          <span class="card-kanji">${word.kanji}</span>
          <span class="card-kana">${word.kana}</span>
        </div>
        <button class="restore-btn">Restore</button>
      `;
      card.querySelector('.restore-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        App.restoreWord(word.id);
      });
      list.appendChild(card);
    });
  },

  renderFullList(progress) {
    const list = this.els.fullList;
    list.innerHTML = '';
    const learnedSet = new Set(progress.learnedIds);
    const skippedSet = new Set(progress.skippedIds);

    this.els.listCount.textContent = `${progress.learnedIds.length} of ${Queue.getTotalCount()} learned`;

    Queue.allLessons.forEach(word => {
      const isLearned = learnedSet.has(word.id);
      const isSkipped = skippedSet.has(word.id);
      const state = isLearned ? 'learned' : isSkipped ? 'skipped' : 'active';

      const row = document.createElement('div');
      row.className = `list-row state-${state}`;
      row.innerHTML = `
        <div class="row-info">
          <span class="row-num">${word.id}</span>
          <span class="row-kanji">${word.kanji}</span>
          <span class="row-kana">${word.kana}</span>
          <span class="row-meaning">${word.meaning}</span>
        </div>
        <div class="row-actions">
          <button class="row-btn btn-learned ${isLearned ? 'on' : ''}" data-action="learned" title="Mark learned" aria-label="Toggle learned">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="row-btn btn-skip ${isSkipped ? 'on' : ''}" data-action="skipped" title="Skip" aria-label="Toggle skip">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      `;

      row.querySelector('[data-action="learned"]').addEventListener('click', (e) => {
        e.stopPropagation();
        isLearned ? App.unmarkLearned(word.id) : App.markLearnedFromList(word.id);
      });

      row.querySelector('[data-action="skipped"]').addEventListener('click', (e) => {
        e.stopPropagation();
        isSkipped ? App.restoreWordFromList(word.id) : App.markSkippedFromList(word.id);
      });

      list.appendChild(row);
    });
  },

  showLesson(word) {
    this.hideAll();
    this.els.lessonView.style.display = 'block';
    this.els.lessonKanji.textContent = word.kanji;
    this.els.lessonKana.textContent = word.kana;
    this.els.lessonMeaning.textContent = word.meaning;
    this.els.lessonContent.innerHTML = word.lesson;

    // Render tags
    this.els.lessonTags.innerHTML = '';
    if (word.tags) {
      word.tags.forEach(tag => {
        const el = document.createElement('span');
        el.className = 'tag';
        el.textContent = tag;
        this.els.lessonTags.appendChild(el);
      });
    }

    this.els.learnedBtn.onclick = () => App.markLearned(word.id);
    this.els.skipBtn.onclick = () => App.markSkipped(word.id);
  },

  showBatch() {
    this.hideAll();
    this.els.batchView.style.display = 'block';
    this.els.navBatch.classList.add('active');
  },

  showFullList() {
    this.hideAll();
    this.els.fullListView.style.display = 'block';
    this.els.navList.classList.add('active');
  },

  updateProgress(progress) {
    const learned = Queue.getLearnedCount(progress);
    const total = Queue.getTotalCount();
    this.els.progressText.textContent = `${learned} of ${total} learned`;
    const pct = total > 0 ? (learned / total) * 100 : 0;
    this.els.progressFill.style.width = pct + '%';
  }
};
