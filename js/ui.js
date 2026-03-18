const UI = {
  els: {},

  init() {
    this.els = {
      batchView: document.getElementById('batch-view'),
      lessonView: document.getElementById('lesson-view'),
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
        <div class="word-info">
          <span class="kanji">${word.kanji}</span>
          <span class="kana">${word.kana}</span>
        </div>
        <span class="meaning">${word.meaning}</span>
      `;
      card.addEventListener('click', () => App.showLesson(word.id));
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

  showLesson(word) {
    this.els.batchView.style.display = 'none';
    this.els.lessonView.classList.add('active');
    this.els.lessonKanji.textContent = word.kanji;
    this.els.lessonKana.textContent = word.kana;
    this.els.lessonMeaning.textContent = word.meaning;
    this.els.lessonContent.innerHTML = word.lesson;

    this.els.learnedBtn.onclick = () => App.markLearned(word.id);
    this.els.skipBtn.onclick = () => App.markSkipped(word.id);
  },

  showBatch() {
    this.els.lessonView.classList.remove('active');
    this.els.batchView.style.display = 'block';
  },

  updateProgress(progress) {
    const learned = Queue.getLearnedCount(progress);
    const total = Queue.getTotalCount();
    this.els.progressText.textContent = `${learned} / ${total} learned`;
  }
};
