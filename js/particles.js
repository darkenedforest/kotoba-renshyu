/* ═══════════════════════════════════════════
   Japanese Particle Effects
   Floating grammar particles with wind interaction
   ═══════════════════════════════════════════ */

const Particles = {
  _particles: [],
  _mouse: { x: -9999, y: -9999 },
  _container: null,
  _raf: null,
  _lastSpawn: 0,
  _nextDelay: 2000,
  _enabled: true,

  CHARS: [
    // Hiragana
    'あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ',
    'た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ',
    'ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を','ん',
    // Katakana
    'ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ',
    'タ','チ','ツ','テ','ト','ナ','ニ','ヌ','ネ','ノ','ハ','ヒ','フ','ヘ','ホ',
    'マ','ミ','ム','メ','モ','ヤ','ユ','ヨ','ラ','リ','ル','レ','ロ','ワ','ヲ','ン'
  ],
  WIND_RADIUS: 120,
  WIND_STRENGTH: 0.8,
  SWIRL_FACTOR: 0.6,
  MAX_PARTICLES: 15,
  FADE_IN_DIST: 60,  // px from bottom before full opacity

  init() {
    this._container = document.createElement('div');
    this._container.className = 'jp-particle-layer';
    document.getElementById('app').appendChild(this._container);

    // Load saved preference
    this._enabled = localStorage.getItem('kotoba-particles') !== 'off';

    // Track mouse/touch
    document.addEventListener('mousemove', (e) => {
      this._mouse.x = e.clientX;
      this._mouse.y = e.clientY;
    });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this._mouse.x = e.touches[0].clientX;
        this._mouse.y = e.touches[0].clientY;
      }
    }, { passive: true });
    document.addEventListener('touchend', () => {
      this._mouse.x = -9999;
      this._mouse.y = -9999;
    });

    this._lastSpawn = performance.now();
    this._nextDelay = this._randomDelay();
    this._tick();
  },

  setEnabled(on) {
    this._enabled = on;
    localStorage.setItem('kotoba-particles', on ? 'on' : 'off');
    if (!on) {
      // Clear existing particles
      this._particles.forEach(p => p.el.remove());
      this._particles = [];
    }
  },

  isEnabled() {
    return this._enabled;
  },

  _randomDelay() {
    return 2000 + Math.random() * 2000; // 2-4 seconds
  },

  _pickChar() {
    // Get learned words from progress
    const progress = typeof Storage !== 'undefined' ? Storage.getProgress() : { learnedIds: [] };
    const learnedIds = progress.learnedIds || [];
    const learnedWords = typeof Queue !== 'undefined'
      ? Queue.allLessons.filter(w => learnedIds.includes(w.id))
      : [];
    const total = typeof Queue !== 'undefined' ? Queue.getTotalCount() : 1;

    // Chance of using a learned word: at least 20%, scales with progress
    const learnedChance = Math.max(0.2, learnedWords.length / total);

    if (learnedWords.length > 0 && Math.random() < learnedChance) {
      const word = learnedWords[Math.floor(Math.random() * learnedWords.length)];
      return { text: word.kanji, isLearned: true };
    }
    return { text: this.CHARS[Math.floor(Math.random() * this.CHARS.length)], isLearned: false };
  },

  _spawn() {
    if (this._particles.length >= this.MAX_PARTICLES) return;

    const pick = this._pickChar();
    const el = document.createElement('span');
    el.className = 'jp-particle';
    el.textContent = pick.text;

    // Learned words get a slightly different color
    if (pick.isLearned) {
      el.style.color = '#34d399';
    }

    // Random size — learned words slightly larger
    const size = pick.isLearned
      ? (1.0 + Math.random() * 0.6)
      : (0.8 + Math.random() * 0.5);
    el.style.fontSize = size + 'rem';

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Start from bottom, random x
    const startX = 30 + Math.random() * (viewW - 60);
    const startY = viewH + 20;

    // Movement: slow upward with slight angle
    const pathType = Math.random(); // 0-1
    const angle = (-75 - Math.random() * 30) * Math.PI / 180; // mostly upward, slight variance
    const speed = 0.3 + Math.random() * 0.3; // px per frame

    // For arched paths, add a sine wave on x
    const useCurve = pathType > 0.5;
    const curveAmp = useCurve ? (15 + Math.random() * 25) : 0;
    const curveFreq = 0.008 + Math.random() * 0.006;
    const curvePhase = Math.random() * Math.PI * 2;

    // Rotation
    const rotSpeed = (Math.random() - 0.5) * 0.4; // deg per frame
    const startRot = Math.random() * 360;

    this._container.appendChild(el);

    this._particles.push({
      el,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: startRot,
      rotSpeed,
      curveAmp,
      curveFreq,
      curvePhase,
      baseX: startX,
      age: 0,
      opacity: 0,
      size
    });
  },

  _tick() {
    const now = performance.now();

    // Spawn check (only if enabled)
    if (this._enabled && now - this._lastSpawn > this._nextDelay) {
      this._spawn();
      this._lastSpawn = now;
      this._nextDelay = this._randomDelay();
    }

    const viewH = window.innerHeight;
    const toRemove = [];

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.age++;

      // Base movement
      p.x += p.vx;
      p.y += p.vy;

      // Curved path offset
      if (p.curveAmp > 0) {
        p.x = p.baseX + Math.sin(p.age * p.curveFreq + p.curvePhase) * p.curveAmp;
        p.baseX += p.vx;
      }

      // Rotation
      p.rot += p.rotSpeed;

      // Wind interaction with mouse/touch
      const dx = p.x - this._mouse.x;
      const dy = p.y - this._mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.WIND_RADIUS && dist > 0) {
        const force = (1 - dist / this.WIND_RADIUS) * this.WIND_STRENGTH;
        const nx = dx / dist;
        const ny = dy / dist;

        // Push away + swirl (tangential force)
        p.x += nx * force * 2;
        p.y += ny * force * 2;
        p.x += -ny * force * this.SWIRL_FACTOR * 2;
        p.y += nx * force * this.SWIRL_FACTOR * 2;

        // Extra rotation from wind
        p.rot += force * 3;

        // Update baseX for curved paths
        if (p.curveAmp > 0) {
          p.baseX += nx * force * 2;
        }
      }

      // Fade in from bottom, steady in middle, fade out at top
      const distFromBottom = viewH - p.y;
      if (distFromBottom < this.FADE_IN_DIST) {
        p.opacity = Math.min(0.18, (distFromBottom / this.FADE_IN_DIST) * 0.18);
      } else if (p.y < 60) {
        p.opacity = Math.max(0, (p.y / 60) * 0.18);
      } else {
        p.opacity = 0.18;
      }

      // Apply transform
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
      p.el.style.opacity = p.opacity;

      // Remove if off screen
      if (p.y < -40 || p.x < -40 || p.x > window.innerWidth + 40) {
        toRemove.push(i);
      }
    }

    // Clean up
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this._particles[idx].el.remove();
      this._particles.splice(idx, 1);
    }

    this._raf = requestAnimationFrame(() => this._tick());
  }
};
