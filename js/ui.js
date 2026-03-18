const UI = {
  els: {},
  currentFilter: 'all',

  init() {
    this.els = {
      batchView: document.getElementById('page-path'),
      listView: document.getElementById('page-list'),
      lessonOverlay: document.getElementById('lesson-overlay'),
      settingsOverlay: document.getElementById('settings-overlay'),
      pathContainer: document.getElementById('path-container'),
      wordTable: document.getElementById('word-table'),
      batchSizeInput: document.getElementById('batch-size'),
      statLearned: document.getElementById('stat-learned'),
      statRemaining: document.getElementById('stat-remaining'),
      lessonKanji: document.getElementById('lesson-kanji'),
      lessonKana: document.getElementById('lesson-kana'),
      lessonMeaning: document.getElementById('lesson-meaning'),
      lessonTags: document.getElementById('lesson-tags'),
      lessonContent: document.getElementById('lesson-content'),
      learnedBtn: document.getElementById('learned-btn'),
      skipBtn: document.getElementById('skip-btn'),
      lessonClose: document.getElementById('lesson-close'),
      settingsClose: document.getElementById('settings-close'),
      navSettings: document.getElementById('nav-settings'),
      resetBtn: document.getElementById('reset-btn'),
      progressFill: document.getElementById('progress-fill'),
      skippedSection: document.getElementById('skipped-section'),
      skippedToggle: document.getElementById('skipped-toggle'),
      skippedList: document.getElementById('skipped-list')
    };
  },

  // ── Page switching ──

  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.bnav-btn[data-page]').forEach(b => b.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    const btn = document.querySelector(`.bnav-btn[data-page="${name}"]`);
    if (page) page.classList.add('active');
    if (btn) btn.classList.add('active');
  },

  // ── Path rendering ──

  renderPath(progress) {
    const container = this.els.pathContainer;
    container.innerHTML = '';

    const learnedSet = new Set(progress.learnedIds);
    const skippedSet = new Set(progress.skippedIds);
    const excluded = new Set([...progress.learnedIds, ...progress.skippedIds]);
    const available = Queue.allLessons.filter(l => !excluded.has(l.id));
    const batchIds = new Set(available.slice(0, progress.batchSize).map(l => l.id));

    const offsets = ['offset-center', 'offset-right', 'offset-center', 'offset-left'];

    Queue.allLessons.forEach((word, i) => {
      const isLearned = learnedSet.has(word.id);
      const isSkipped = skippedSet.has(word.id);
      const isActive = batchIds.has(word.id);
      const isUpcoming = !isLearned && !isSkipped && !isActive;

      let state = 'upcoming';
      if (isLearned) state = 'learned';
      else if (isSkipped) state = 'skipped';
      else if (isActive) state = 'active';

      // Connector (except before first)
      if (i > 0) {
        const prevLearned = learnedSet.has(Queue.allLessons[i-1].id);
        const conn = document.createElement('div');
        let connClass = 'upcoming';
        if (prevLearned && isLearned) connClass = 'done';
        else if (prevLearned && isActive) connClass = 'active';
        else if (prevLearned && isSkipped) connClass = 'skipped';
        conn.className = `path-connector ${connClass}`;
        container.appendChild(conn);
      }

      // Step wrapper (for zigzag)
      const step = document.createElement('div');
      step.className = `path-step ${offsets[i % offsets.length]}`;

      // Node
      const node = document.createElement('div');
      node.className = `path-node state-${state}`;
      node.textContent = word.kanji;

      if (isLearned) {
        const check = document.createElement('div');
        check.className = 'node-check';
        check.innerHTML = '<svg viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        node.appendChild(check);
      }

      if (isActive || isLearned || isSkipped) {
        node.addEventListener('click', () => App.showLesson(word.id));
      }

      // Label
      const label = document.createElement('div');
      label.className = 'path-label';
      label.innerHTML = `
        <div class="path-label-kana">${word.kana}</div>
        <div class="path-label-meaning">${word.meaning}</div>
      `;

      step.appendChild(node);
      step.appendChild(label);
      container.appendChild(step);
    });

    this.updateStats(progress);
  },

  // ── Lesson overlay ──

  showLesson(word) {
    this.els.lessonKanji.textContent = word.kanji;
    this.els.lessonKana.textContent = word.kana;
    this.els.lessonMeaning.textContent = word.meaning;
    this.els.lessonContent.innerHTML = word.lesson;

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
    this.els.lessonOverlay.style.display = 'flex';
  },

  hideLesson() {
    this.els.lessonOverlay.style.display = 'none';
  },

  // ── Settings overlay ──

  showSettings(progress) {
    this.els.batchSizeInput.value = progress.batchSize;
    this.els.settingsOverlay.style.display = 'flex';
  },

  hideSettings() {
    this.els.settingsOverlay.style.display = 'none';
  },

  // ── List page ──

  renderList(progress, filter) {
    this.currentFilter = filter || 'all';
    const table = this.els.wordTable;
    table.innerHTML = '';
    const learnedSet = new Set(progress.learnedIds);
    const skippedSet = new Set(progress.skippedIds);

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === this.currentFilter);
    });

    Queue.allLessons.forEach(word => {
      const isLearned = learnedSet.has(word.id);
      const isSkipped = skippedSet.has(word.id);
      const state = isLearned ? 'learned' : isSkipped ? 'skipped' : 'active';

      if (this.currentFilter !== 'all' && this.currentFilter !== state) return;

      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <span class="table-num">${word.id}</span>
        <span class="table-kanji">${word.kanji}</span>
        <span class="table-kana">${word.kana}</span>
        <span class="table-meaning">${word.meaning}</span>
        <span class="table-status">
          ${isLearned ? '<span class="status-badge badge-learned">Learned</span>' :
            isSkipped ? '<span class="status-badge badge-skipped">Skipped</span>' :
            '<span class="status-badge badge-active">In Queue</span>'}
        </span>
        <div class="table-actions">
          <button class="tbl-btn ${isLearned ? 'on-learned' : ''}" data-action="learned" title="Toggle learned">&#x2713;</button>
          <button class="tbl-btn ${isSkipped ? 'on-skipped' : ''}" data-action="skipped" title="Toggle skipped">&#x2715;</button>
        </div>
      `;

      row.querySelector('[data-action="learned"]').addEventListener('click', () => {
        isLearned ? App.unmarkLearnedFromList(word.id) : App.markLearnedFromList(word.id);
      });
      row.querySelector('[data-action="skipped"]').addEventListener('click', () => {
        isSkipped ? App.restoreWordFromList(word.id) : App.markSkippedFromList(word.id);
      });

      table.appendChild(row);
    });
  },

  // ── Stats ──

  updateStats(progress) {
    const learned = Queue.getLearnedCount(progress);
    const total = Queue.getTotalCount();
    this.els.statLearned.textContent = learned;
    this.els.statRemaining.textContent = total - learned;
  }
};
