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
      lessonKanji: document.getElementById('lesson-kanji'),
      lessonKana: document.getElementById('lesson-kana'),
      lessonMeaning: document.getElementById('lesson-meaning'),
      lessonContent: document.getElementById('lesson-content'),
      learnedBtn: document.getElementById('learned-btn'),
      skipBtn: document.getElementById('skip-btn'),
      backBtn: document.getElementById('back-btn'),
      listBtn: document.getElementById('list-btn'),
      listBackBtn: document.getElementById('list-back-btn'),
      fullList: document.getElementById('full-list'),
      skippedToggle: document.getElementById('skipped-toggle'),
      skippedList: document.getElementById('skipped-list'),
      skippedSection: document.getElementById('skipped-section')
    };
  },

  renderBatch(batch, progress) {
    const list = this.els.wordList;
    list.innerHTML = '';

    if (batch.length === 0) {
      list.innerHTML = '<div class="empty-state">No words in the current batch.</div>';
      return;
    }

    batch.forEach(word => {
      const card = document.createElement('div');
      card.className = 'word-card';
      card.innerHTML = `
        <div class="word-info" data-click="lesson">
          <span class="kanji">${word.kanji}</span>
          <span class="kana">${word.kana}</span>
        </div>
        <div class="word-right">
          <span class="meaning">${word.meaning}</span>
          <button class="card-skip-btn" title="Skip">&#x2715;</button>
        </div>
      `;
      card.querySelector('.word-info').addEventListener('click', () => App.showLesson(word.id));
      card.querySelector('.meaning').addEventListener('click', () => App.showLesson(word.id));
      card.querySelector('.card-skip-btn').addEventListener('click', (e) => {
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
    this.els.skippedToggle.textContent = `Skipped words (${skipped.length})`;

    skipped.forEach(word => {
      const card = document.createElement('div');
      card.className = 'skipped-card';
      card.innerHTML = `
        <div class="word-info">
          <span class="kanji">${word.kanji}</span>
          <span class="kana">${word.kana}</span>
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

    Queue.allLessons.forEach(word => {
      const isLearned = learnedSet.has(word.id);
      const isSkipped = skippedSet.has(word.id);
      const state = isLearned ? 'learned' : isSkipped ? 'skipped' : 'active';

      const row = document.createElement('div');
      row.className = `list-row list-row--${state}`;
      row.innerHTML = `
        <div class="word-info">
          <span class="kanji">${word.kanji}</span>
          <span class="kana">${word.kana}</span>
          <span class="meaning">${word.meaning}</span>
        </div>
        <div class="list-actions">
          <button class="list-action-btn ${isLearned ? 'active' : ''}" data-action="learned" title="Learned">&#x2713;</button>
          <button class="list-action-btn ${isSkipped ? 'active' : ''}" data-action="skipped" title="Skip">&#x2715;</button>
        </div>
      `;

      row.querySelector('[data-action="learned"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLearned) {
          App.unmarkLearned(word.id);
        } else {
          App.markLearnedFromList(word.id);
        }
      });

      row.querySelector('[data-action="skipped"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSkipped) {
          App.restoreWordFromList(word.id);
        } else {
          App.markSkippedFromList(word.id);
        }
      });

      list.appendChild(row);
    });
  },

  showLesson(word) {
    this.els.batchView.style.display = 'none';
    this.els.fullListView.style.display = 'none';
    this.els.lessonView.style.display = 'block';
    this.els.lessonView.classList.add('active');
    this.els.lessonKanji.textContent = word.kanji;
    this.els.lessonKana.textContent = word.kana;
    this.els.lessonMeaning.textContent = word.meaning;
    this.els.lessonContent.innerHTML = word.lesson;

    this.els.learnedBtn.onclick = () => App.markLearned(word.id);
    this.els.skipBtn.onclick = () => App.markSkipped(word.id);
  },

  showBatch() {
    this.els.lessonView.style.display = 'none';
    this.els.lessonView.classList.remove('active');
    this.els.fullListView.style.display = 'none';
    this.els.batchView.style.display = 'block';
  },

  showFullList() {
    this.els.batchView.style.display = 'none';
    this.els.lessonView.style.display = 'none';
    this.els.lessonView.classList.remove('active');
    this.els.fullListView.style.display = 'block';
  },

  updateProgress(progress) {
    const learned = Queue.getLearnedCount(progress);
    const total = Queue.getTotalCount();
    this.els.progressText.textContent = `${learned} / ${total} learned`;
  }
};
