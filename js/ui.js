const UI = {
  els: {},
  currentFilter: 'all',

  init() {
    this.els = {
      pathNodes: document.getElementById('path-nodes'),
      pathSvg: document.getElementById('path-svg'),
      wordTable: document.getElementById('word-table'),
      batchSheet: document.getElementById('batch-sheet'),
      batchClose: document.getElementById('batch-close'),
      batchTitle: document.getElementById('batch-sheet-title'),
      batchSub: document.getElementById('batch-sheet-sub'),
      batchWordList: document.getElementById('batch-word-list'),
      lessonSheet: document.getElementById('lesson-sheet'),
      lessonClose: document.getElementById('lesson-close'),
      lessonKanji: document.getElementById('lesson-kanji'),
      lessonKana: document.getElementById('lesson-kana'),
      lessonMeaning: document.getElementById('lesson-meaning'),
      lessonTags: document.getElementById('lesson-tags'),
      lessonContent: document.getElementById('lesson-content'),
      learnedBtn: document.getElementById('learned-btn'),
      skipBtn: document.getElementById('skip-btn'),
      settingsSheet: document.getElementById('settings-sheet'),
      settingsClose: document.getElementById('settings-close'),
      batchSizeInput: document.getElementById('batch-size'),
      resetBtn: document.getElementById('reset-btn'),
      statLearned: document.getElementById('stat-learned'),
      statRemaining: document.getElementById('stat-remaining')
    };
  },

  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab[data-page]').forEach(b => b.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    const btn = document.querySelector(`.tab[data-page="${name}"]`);
    if (page) page.classList.add('active');
    if (btn) btn.classList.add('active');

    // Only show particles on the Lessons path page
    const particleLayer = document.querySelector('.jp-particle-layer');
    if (particleLayer) {
      particleLayer.style.display = name === 'path' ? '' : 'none';
    }
  },

  /* ═══════════════════════════════════
     PATH — batches as nodes
     ═══════════════════════════════════ */

  renderPath(progress) {
    const nodes = this.els.pathNodes;
    const svg = this.els.pathSvg;
    nodes.innerHTML = '';

    const batches = Queue.getBatches(progress.batchSize, progress);
    const learnedSet = new Set(progress.learnedIds);

    // Determine status of each batch (skipped words already excluded)
    let foundActive = false;
    const batchData = batches.map(batch => {
      const allLearned = batch.words.every(w => learnedSet.has(w.id));
      const learnedCount = batch.words.filter(w => learnedSet.has(w.id)).length;

      let status;
      if (allLearned) {
        status = 'complete';
      } else if (!foundActive) {
        status = 'active';
        foundActive = true;
      } else {
        status = 'locked';
      }
      return { ...batch, status, learnedCount };
    });

    // Layout: S-curve positions
    const containerWidth = Math.min(window.innerWidth, 400);
    const centerX = containerWidth / 2;
    const amplitude = containerWidth * 0.22;
    const nodeSpacing = 130;
    const totalHeight = batchData.length * nodeSpacing + 80;

    // Set SVG size
    svg.setAttribute('width', containerWidth);
    svg.setAttribute('height', totalHeight);
    svg.style.height = totalHeight + 'px';
    nodes.style.height = totalHeight + 'px';

    // Compute positions
    const positions = batchData.map((b, i) => {
      const y = 50 + i * nodeSpacing;
      const x = centerX + Math.sin(i * 0.8) * amplitude;
      return { x, y };
    });

    // Draw curved path
    if (positions.length > 1) {
      const activeIdx = batchData.findIndex(b => b.status === 'active');
      // Grey path: draw up to one node past active (a teaser), not all the way
      const greyEnd = activeIdx >= 0
        ? Math.min(activeIdx + 1, positions.length - 1)
        : positions.length - 1; // all complete — show full path

      let pathD = `M ${positions[0].x} ${positions[0].y}`;
      for (let i = 1; i <= greyEnd; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        const cpY = (prev.y + curr.y) / 2;
        pathD += ` C ${prev.x} ${cpY}, ${curr.x} ${cpY}, ${curr.x} ${curr.y}`;
      }

      const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bgPath.setAttribute('d', pathD);
      bgPath.setAttribute('stroke', '#e0e0e0');
      bgPath.setAttribute('stroke-width', '6');
      bgPath.setAttribute('fill', 'none');
      bgPath.setAttribute('stroke-linecap', 'round');
      svg.appendChild(bgPath);

      // Glow filter for progress path
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'path-glow');
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');
      const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      blur.setAttribute('stdDeviation', '6');
      blur.setAttribute('result', 'glow');
      const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m1.setAttribute('in', 'glow');
      const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m2.setAttribute('in', 'SourceGraphic');
      merge.appendChild(m1);
      merge.appendChild(m2);
      filter.appendChild(blur);
      filter.appendChild(merge);
      defs.appendChild(filter);
      svg.appendChild(defs);

      // Green progress path — up to active batch
      const progressEnd = activeIdx >= 0 ? activeIdx : positions.length - 1;
      if (progressEnd > 0) {
        let progD = `M ${positions[0].x} ${positions[0].y}`;
        for (let i = 1; i <= progressEnd; i++) {
          const prev = positions[i - 1];
          const curr = positions[i];
          const cpY = (prev.y + curr.y) / 2;
          progD += ` C ${prev.x} ${cpY}, ${curr.x} ${cpY}, ${curr.x} ${curr.y}`;
        }
        // Glow layer (wider, filtered)
        const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPath.setAttribute('d', progD);
        glowPath.setAttribute('stroke', '#34d399');
        glowPath.setAttribute('stroke-width', '10');
        glowPath.setAttribute('fill', 'none');
        glowPath.setAttribute('stroke-linecap', 'round');
        glowPath.setAttribute('filter', 'url(#path-glow)');
        glowPath.setAttribute('opacity', '0.4');
        svg.appendChild(glowPath);

        // Solid progress line on top
        const progPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        progPath.setAttribute('d', progD);
        progPath.setAttribute('stroke', '#34d399');
        progPath.setAttribute('stroke-width', '6');
        progPath.setAttribute('fill', 'none');
        progPath.setAttribute('stroke-linecap', 'round');
        svg.appendChild(progPath);
      }
    }

    // Render nodes
    batchData.forEach((batch, i) => {
      const pos = positions[i];
      const node = document.createElement('div');
      node.className = `pnode pnode-${batch.status}`;

      const num = batch.index + 1;
      const wordCount = batch.words.length;
      const preview = batch.words.map(w => w.kanji).join('');

      if (batch.status === 'complete' || batch.status === 'done-mixed') {
        node.innerHTML = `<span class="pnode-check">\u2713</span>`;
      } else if (batch.status === 'active') {
        node.innerHTML = `<span class="pnode-num">${num}</span>`;
      } else {
        node.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
      }

      // Label underneath
      const label = document.createElement('div');
      label.className = 'pnode-label';
      if (batch.status === 'locked') {
        label.innerHTML = `<span class="pnode-title">Batch ${num}</span>`;
      } else {
        label.innerHTML = `<span class="pnode-title">Batch ${num}</span><span class="pnode-preview">${preview}</span>`;
      }

      if (batch.status !== 'locked') {
        node.addEventListener('click', () => App.openBatch(batch.index));
      }

      const wrap = document.createElement('div');
      wrap.className = 'pnode-wrap';
      wrap.style.left = (pos.x - 45) + 'px';
      wrap.style.top = (pos.y - 32) + 'px';
      wrap.appendChild(node);
      wrap.appendChild(label);
      nodes.appendChild(wrap);
    });

    // Kanji watermarks — each learned word gets a fixed position based on its ID
    const page = document.getElementById('page-path');
    page.querySelectorAll('.kanji-watermark').forEach(el => el.remove());

    // Deterministic pseudo-random from word ID (so positions are stable)
    const seeded = (id, salt) => {
      let h = id * 2654435761 + salt * 40503;
      h = ((h >>> 16) ^ h) * 45679;
      return ((h >>> 16) ^ h) / 4294967296 + 0.5; // 0-1
    };

    const learnedWords = Queue.allLessons.filter(w => learnedSet.has(w.id));
    const batchSize = progress.batchSize;

    for (const word of learnedWords) {
      // Position vertically near where this word's batch sits on the path
      const wordIndex = Queue.allLessons.filter(w => !new Set(progress.skippedIds).has(w.id)).findIndex(w => w.id === word.id);
      const batchIndex = wordIndex >= 0 ? Math.floor(wordIndex / batchSize) : 0;
      const batchY = 50 + batchIndex * nodeSpacing;

      const wm = document.createElement('div');
      wm.className = 'kanji-watermark';
      wm.textContent = word.kanji;
      wm.style.fontSize = (3 + seeded(word.id, 1) * 4) + 'rem';
      wm.style.top = (batchY - 30 + seeded(word.id, 2) * 100) + 'px';
      wm.style.left = (5 + seeded(word.id, 3) * 75) + '%';
      wm.style.transform = `rotate(${-15 + seeded(word.id, 4) * 30}deg)`;
      page.appendChild(wm);
    }

    this.updateStats(progress);
  },

  /* ═══════════════════════════════════
     BATCH SHEET — words in a batch
     ═══════════════════════════════════ */

  showBatchSheet(batch, progress) {
    const learnedSet = new Set(progress.learnedIds);

    this.els.batchTitle.textContent = `Batch ${batch.index + 1}`;
    const done = batch.words.filter(w => learnedSet.has(w.id)).length;
    this.els.batchSub.textContent = `${done} of ${batch.words.length} learned`;

    const list = this.els.batchWordList;
    list.innerHTML = '';

    batch.words.forEach(word => {
      const isLearned = learnedSet.has(word.id);

      const row = document.createElement('div');
      row.className = `bw-row ${isLearned ? 'bw-learned' : ''}`;
      row.innerHTML = `
        <div class="bw-left">
          <span class="bw-kanji">${word.kanji}</span>
          <span class="bw-kana">${word.kana}</span>
        </div>
        <div class="bw-right">
          <span class="bw-meaning">${word.meaning}</span>
          ${isLearned ? '<span class="bw-badge bw-badge-green">\u2713</span>' :
            '<span class="bw-arrow">\u2192</span>'}
        </div>
      `;

      row.addEventListener('click', () => App.showLesson(word.id));

      list.appendChild(row);
    });

    this.els.batchSheet.style.display = 'flex';
  },

  hideBatchSheet() {
    this.els.batchSheet.style.display = 'none';
  },

  /* ═══════════════════════════════════
     LESSON SHEET
     ═══════════════════════════════════ */

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

    // Check if word is already learned
    const progress = Storage.getProgress();
    const isLearned = progress.learnedIds.includes(word.id);

    if (isLearned) {
      this.els.skipBtn.textContent = 'Unlearn';
      this.els.skipBtn.className = 'btn btn-ghost';
      this.els.skipBtn.onclick = () => {
        App.restoreWord(word.id);
        UI.hideLesson();
      };
      this.els.learnedBtn.textContent = 'Continue';
      this.els.learnedBtn.className = 'btn btn-green';
      this.els.learnedBtn.onclick = () => UI.hideLesson();
    } else {
      this.els.skipBtn.textContent = 'Skip';
      this.els.skipBtn.className = 'btn btn-ghost';
      this.els.skipBtn.onclick = () => App.markSkipped(word.id);
      this.els.learnedBtn.textContent = 'Got it!';
      this.els.learnedBtn.className = 'btn btn-green';
      this.els.learnedBtn.onclick = () => App.markLearned(word.id);
    }
    this.els.lessonSheet.style.display = 'flex';
    this.els.lessonSheet.querySelector('.sheet-inner').scrollTop = 0;
  },

  hideLesson() {
    this.els.lessonSheet.style.display = 'none';
  },

  /* ═══════════════════════════════════
     SETTINGS
     ═══════════════════════════════════ */

  showSettings(progress) {
    this.els.batchSizeInput.value = progress.batchSize;
    this.els.settingsSheet.style.display = 'flex';
  },

  hideSettings() {
    this.els.settingsSheet.style.display = 'none';
  },

  /* ═══════════════════════════════════
     AUTH UI
     ═══════════════════════════════════ */

  updateAuthUI(user, customName) {
    const signedOut = document.getElementById('auth-signed-out');
    const signedIn = document.getElementById('auth-signed-in');
    const userName = document.getElementById('auth-user-name');
    const userAvatar = document.getElementById('auth-user-avatar');
    const topbarSignin = document.getElementById('topbar-signin');
    const topbarUser = document.getElementById('topbar-user');
    const nameInput = document.getElementById('display-name-input');

    const emailPrefix = user && user.email ? user.email.split('@')[0] : '';
    const displayName = customName || emailPrefix || (user ? user.displayName : '') || 'User';

    if (user) {
      signedOut.style.display = 'none';
      signedIn.style.display = 'block';
      userName.textContent = displayName;
      nameInput.value = customName || emailPrefix;
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.style.display = 'block';
      } else {
        userAvatar.style.display = 'none';
      }
      topbarSignin.style.display = 'none';
      topbarUser.style.display = '';
      topbarUser.textContent = displayName;
    } else {
      signedOut.style.display = 'block';
      signedIn.style.display = 'none';
      topbarSignin.style.display = '';
      topbarUser.style.display = 'none';
    }
  },

  /* ═══════════════════════════════════
     FEEDBACK UI
     ═══════════════════════════════════ */

  resetFeedbackUI() {
    const upBtn = document.getElementById('vote-up-btn');
    const downBtn = document.getElementById('vote-down-btn');
    upBtn.classList.remove('vote-active');
    downBtn.classList.remove('vote-active');
    upBtn.classList.remove('vote-dim');
    downBtn.classList.remove('vote-dim');

    document.getElementById('report-form').style.display = 'none';
    document.getElementById('report-text').value = '';
    document.getElementById('comments-list').innerHTML = '';
    document.getElementById('comment-input').value = '';
  },

  updateVoteButtons(direction) {
    const upBtn = document.getElementById('vote-up-btn');
    const downBtn = document.getElementById('vote-down-btn');

    upBtn.classList.toggle('vote-active', direction === 'up');
    downBtn.classList.toggle('vote-active', direction === 'down');
    upBtn.classList.toggle('vote-dim', direction === 'down');
    downBtn.classList.toggle('vote-dim', direction === 'up');
  },

  renderComments(comments) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '';

    if (comments.length === 0) {
      list.innerHTML = '<div class="comments-empty">No comments yet</div>';
      return;
    }

    comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment-item';

      const ts = c.timestamp ? new Date(c.timestamp.seconds * 1000) : new Date();
      const timeStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      div.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${this._escapeHtml(c.displayName || 'Anonymous')}</span>
          <span class="comment-time">${timeStr}</span>
        </div>
        <div class="comment-text">${this._escapeHtml(c.text)}</div>
      `;
      list.appendChild(div);
    });
  },

  updateCommentAuth(user) {
    const authPrompt = document.getElementById('comment-auth-prompt');
    const commentForm = document.getElementById('comment-form');
    if (user) {
      authPrompt.style.display = 'none';
      commentForm.style.display = 'flex';
    } else {
      authPrompt.style.display = 'block';
      commentForm.style.display = 'none';
    }
  },

  /* ═══════════════════════════════════
     QUOTE PROMPT
     ═══════════════════════════════════ */

  showQuotePrompt() {
    const sheet = document.getElementById('quote-sheet');
    const authArea = document.getElementById('quote-auth-area');
    const authPrompt = document.getElementById('quote-auth-prompt');
    const input = document.getElementById('quote-input');
    const charCount = document.getElementById('quote-char-count');

    // Reset
    input.value = '';
    charCount.textContent = '0';
    const existingErr = sheet.querySelector('.quote-error');
    if (existingErr) existingErr.remove();

    const user = Firebase.getUser();
    if (user) {
      authArea.style.display = 'block';
      authPrompt.style.display = 'none';
    } else {
      authArea.style.display = 'none';
      authPrompt.style.display = 'block';
    }

    sheet.style.display = 'flex';
  },

  hideQuotePrompt() {
    document.getElementById('quote-sheet').style.display = 'none';
  },

  /* ═══════════════════════════════════
     QUOTE STICKERS (path page)
     ═══════════════════════════════════ */

  _quoteStickerCache: null,

  renderQuoteStickers(quotes) {
    const container = document.getElementById('quote-stickers');
    if (!container) return;
    container.innerHTML = '';

    if (!quotes || quotes.length === 0) return;

    const isMobile = window.innerWidth < 500;
    const maxQuotes = isMobile ? 2 : 3;
    const displayQuotes = quotes.slice(0, maxQuotes);

    const palette = ['#e11d48', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#be185d', '#4f46e5', '#0d9488'];

    // Seeded random from quote text (stable per quote, varies between quotes)
    const seed = (str, salt) => {
      let h = salt;
      for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
      return ((h >>> 0) % 1000) / 1000; // 0-1
    };

    const viewW = window.innerWidth;
    const pathH = container.parentElement ? container.parentElement.scrollHeight : 800;

    // Divide page into vertical zones to prevent overlap
    const zoneHeight = Math.max(200, pathH / (maxQuotes + 1));

    displayQuotes.forEach((quote, i) => {
      const sticker = document.createElement('div');
      sticker.className = 'quote-sticker';

      const color = palette[Math.floor(seed(quote.text, 7) * palette.length)];
      const tilt = -8 + seed(quote.text, 13) * 16; // -8 to +8 degrees

      // Position: random within a vertical zone, random left/right
      const zoneTop = 80 + i * zoneHeight;
      const top = zoneTop + seed(quote.text, 31) * (zoneHeight - 100);
      const leftPct = 3 + seed(quote.text, 47) * 60; // 3% to 63% from left

      sticker.style.transform = `rotate(${tilt}deg)`;
      sticker.style.top = top + 'px';
      sticker.style.left = leftPct + '%';

      const textEl = document.createElement('div');
      textEl.className = 'quote-sticker-text';
      textEl.style.color = color;
      textEl.textContent = quote.text;

      const authorEl = document.createElement('div');
      authorEl.className = 'quote-sticker-author';
      authorEl.style.color = color;
      authorEl.textContent = '\u2014 ' + (quote.displayName || 'Anonymous');

      const reportBtn = document.createElement('button');
      reportBtn.className = 'quote-sticker-report';
      reportBtn.textContent = 'report';
      reportBtn.addEventListener('click', () => {
        if (confirm('Report this quote as inappropriate?')) {
          Firebase.reportQuote(quote.id);
          sticker.remove();
        }
      });

      const bottomRow = document.createElement('div');
      bottomRow.className = 'quote-sticker-bottom';
      bottomRow.appendChild(reportBtn);
      bottomRow.appendChild(authorEl);

      sticker.appendChild(textEl);
      sticker.appendChild(bottomRow);
      container.appendChild(sticker);
    });
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /* ═══════════════════════════════════
     LIST
     ═══════════════════════════════════ */

  renderList(progress, filter) {
    this.currentFilter = filter || 'all';
    const table = this.els.wordTable;
    table.innerHTML = '';
    const learnedSet = new Set(progress.learnedIds);
    const skippedSet = new Set(progress.skippedIds);

    document.querySelectorAll('.fpill').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === this.currentFilter)
    );

    Queue.allLessons.forEach(word => {
      const isLearned = learnedSet.has(word.id);
      const isSkipped = skippedSet.has(word.id);
      const state = isLearned ? 'learned' : isSkipped ? 'skipped' : 'active';
      if (this.currentFilter !== 'all' && this.currentFilter !== state) return;

      const row = document.createElement('div');
      row.className = 'trow';

      const info = document.createElement('div');
      info.className = 'trow-info';
      info.innerHTML = `
        <span class="trow-num">${word.id}</span>
        <span class="trow-kanji">${word.kanji}</span>
        <span class="trow-kana">${word.kana}</span>
        <span class="trow-meaning">${word.meaning}</span>
      `;
      info.addEventListener('click', () => App.showLesson(word.id));

      const actions = document.createElement('div');
      actions.className = 'trow-actions';

      if (isLearned) {
        actions.innerHTML = `<button class="trow-btn trow-btn-undo" title="Undo learned">\u21A9</button>`;
        actions.querySelector('.trow-btn-undo').addEventListener('click', () => App.restoreWord(word.id));
      } else if (isSkipped) {
        actions.innerHTML = `<button class="trow-btn trow-btn-undo" title="Restore">\u21A9</button>`;
        actions.querySelector('.trow-btn-undo').addEventListener('click', () => App.restoreWord(word.id));
      } else {
        actions.innerHTML = `<button class="trow-btn trow-btn-skip" title="Skip">\u2715</button>`;
        actions.querySelector('.trow-btn-skip').addEventListener('click', () => App.skipFromList(word.id));
      }

      const badge = document.createElement('span');
      badge.className = `trow-badge badge-${state}`;
      badge.textContent = state === 'learned' ? '\u2713' : state === 'skipped' ? '\u2014' : '\u2022';

      row.appendChild(info);
      row.appendChild(badge);
      row.appendChild(actions);
      table.appendChild(row);
    });
  },

  /* ═══════════════════════════════════
     STATS
     ═══════════════════════════════════ */

  updateStats(progress) {
    const learned = Queue.getLearnedCount(progress);
    const total = Queue.getTotalCount();
    this.els.statLearned.textContent = learned;
    this.els.statRemaining.textContent = total - learned;
  }
};
