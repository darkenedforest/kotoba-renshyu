/* ═══════════════════════════════════════════
   Firebase — Auth, Firestore, Analytics
   ═══════════════════════════════════════════ */

const Firebase = {
  db: null,
  auth: null,
  analytics: null,
  _ready: false,

  init() {
    const firebaseConfig = {
      apiKey: "AIzaSyAsDjHxJgjqIkiiAWv5BRM4Jvs5AaWGy3U",
      authDomain: "kotoba-renshyu.firebaseapp.com",
      projectId: "kotoba-renshyu",
      storageBucket: "kotoba-renshyu.firebasestorage.app",
      messagingSenderId: "701577774611",
      appId: "1:701577774611:web:94d8b2a6a9e2fb1a1e21e6",
      measurementId: "G-PMDLR9RD58"
    };

    firebase.initializeApp(firebaseConfig);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.analytics = firebase.analytics();
    this._ready = true;

    // Listen for auth state changes
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        Storage.onSignIn(user);
        const customName = await this.loadDisplayName();
        UI.updateAuthUI(user, customName);
        // If landing page is showing, dismiss it
        const landing = document.getElementById('landing');
        if (landing && landing.style.display !== 'none') {
          localStorage.setItem('kotoba-seen-intro', '1');
          landing.style.display = 'none';
          document.getElementById('app').style.display = '';
        }
        // Check for new hearts on sign-in
        if (typeof App !== 'undefined') {
          App._checkNewHearts();
        }
      } else {
        UI.updateAuthUI(null);
        UI.updateHeartBadge(0);
      }
    });
  },

  _customName: null,

  // ── Auth ──

  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await this.auth.signInWithPopup(provider);
    } catch (e) {
      console.error('Sign-in failed:', e);
    }
  },

  async signOut() {
    try {
      this._customName = null;
      await this.auth.signOut();
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  },

  getUser() {
    return this.auth ? this.auth.currentUser : null;
  },

  getDisplayName() {
    return this._customName;
  },

  // ── Display name ──

  async loadDisplayName() {
    const user = this.getUser();
    if (!user || !this.db) return null;
    try {
      const doc = await this.db.collection('displayNames').doc(user.uid).get();
      if (doc.exists) {
        this._customName = doc.data().name;
        return this._customName;
      }
    } catch (e) {
      console.error('Load display name failed:', e);
    }
    return null;
  },

  async isNameTaken(name) {
    if (!this.db) return false;
    const normalized = name.trim().toLowerCase();
    try {
      const snap = await this.db.collection('displayNames')
        .where('nameLower', '==', normalized)
        .limit(1)
        .get();
      if (snap.empty) return false;
      // If the only match is the current user, it's fine
      const user = this.getUser();
      return snap.docs[0].id !== (user ? user.uid : '');
    } catch (e) {
      console.error('Name check failed:', e);
      return false;
    }
  },

  async saveDisplayName(name) {
    const user = this.getUser();
    if (!user || !this.db) return { ok: false, error: 'Not signed in' };
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 20) return { ok: false, error: 'Name must be 1-20 characters' };

    const taken = await this.isNameTaken(trimmed);
    if (taken) return { ok: false, error: 'That name is already taken' };

    try {
      await this.db.collection('displayNames').doc(user.uid).set({
        name: trimmed,
        nameLower: trimmed.toLowerCase(),
        uid: user.uid
      });
      this._customName = trimmed;
      UI.updateAuthUI(user, trimmed);
      return { ok: true };
    } catch (e) {
      console.error('Save name failed:', e);
      return { ok: false, error: 'Save failed' };
    }
  },

  // ── Firestore: user progress ──

  async syncProgressToFirestore(progress) {
    const user = this.getUser();
    if (!user || !this.db) return;
    try {
      await this.db.collection('users').doc(user.uid).set({
        learnedIds: progress.learnedIds,
        skippedIds: progress.skippedIds,
        batchSize: progress.batchSize,
        lastSync: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('Firestore sync failed:', e);
    }
  },

  async pullProgressFromFirestore() {
    const user = this.getUser();
    if (!user || !this.db) return null;
    try {
      const doc = await this.db.collection('users').doc(user.uid).get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.error('Firestore pull failed:', e);
      return null;
    }
  },

  // ── Analytics ──

  logEvent(name, params) {
    if (this.analytics) {
      this.analytics.logEvent(name, params);
    }
  },

  // ── Visitor ID for anonymous voting ──

  getVisitorId() {
    let id = localStorage.getItem('kotoba-visitor-id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
      localStorage.setItem('kotoba-visitor-id', id);
    }
    return id;
  },

  getUserOrVisitorId() {
    const user = this.getUser();
    return user ? user.uid : this.getVisitorId();
  },

  // ── Lesson votes ──

  async submitVote(lessonId, direction) {
    if (!this.db) return;
    const odId = this.getUserOrVisitorId();
    const voteDocId = `${lessonId}_${odId}`;

    try {
      // Check existing vote
      const voteRef = this.db.collection('lessonVotes').doc(voteDocId);
      const existing = await voteRef.get();
      const oldDirection = existing.exists ? existing.data().direction : null;

      if (oldDirection === direction) return oldDirection; // Already voted same way

      // Save/update vote
      await voteRef.set({
        lessonId: lessonId,
        odId: odId,
        direction: direction,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update aggregate counts
      const fbRef = this.db.collection('lessonFeedback').doc(String(lessonId));
      const inc = firebase.firestore.FieldValue.increment;

      if (oldDirection) {
        // Changing vote: decrement old, increment new
        const updates = {};
        updates[oldDirection === 'up' ? 'upvotes' : 'downvotes'] = inc(-1);
        updates[direction === 'up' ? 'upvotes' : 'downvotes'] = inc(1);
        await fbRef.set(updates, { merge: true });
      } else {
        // New vote
        const updates = {};
        updates[direction === 'up' ? 'upvotes' : 'downvotes'] = inc(1);
        await fbRef.set(updates, { merge: true });
      }

      this.logEvent('lesson_vote', { lesson_id: lessonId, direction: direction });
      return direction;
    } catch (e) {
      console.error('Vote failed:', e);
      return null;
    }
  },

  async getExistingVote(lessonId) {
    if (!this.db) return null;
    const odId = this.getUserOrVisitorId();
    const voteDocId = `${lessonId}_${odId}`;
    try {
      const doc = await this.db.collection('lessonVotes').doc(voteDocId).get();
      return doc.exists ? doc.data().direction : null;
    } catch (e) {
      return null;
    }
  },

  // ── Lesson reports ──

  async submitReport(lessonId, text) {
    if (!this.db) return;
    try {
      await this.db.collection('lessonReports').add({
        lessonId: lessonId,
        userId: this.getUserOrVisitorId(),
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.logEvent('lesson_report', { lesson_id: lessonId });
    } catch (e) {
      console.error('Report failed:', e);
    }
  },

  // ── Lesson comments ──

  async loadComments(lessonId) {
    if (!this.db) return [];
    try {
      const snap = await this.db.collection('lessonComments')
        .where('lessonId', '==', lessonId)
        .orderBy('timestamp', 'asc')
        .limit(50)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Load comments failed:', e);
      return [];
    }
  },

  // ── Motivational quotes ──

  async submitQuote(text, batchIndex) {
    const user = this.getUser();
    if (!user || !this.db) return null;
    const displayName = this._customName || (user.email ? user.email.split('@')[0] : user.displayName || 'Anonymous');
    try {
      const ref = await this.db.collection('motivationalQuotes').add({
        text: text,
        uid: user.uid,
        displayName: displayName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        lessonBatchIndex: batchIndex,
        reported: false,
        hearts: 0
      });
      this.logEvent('quote_submitted', { batch_index: batchIndex });
      return ref.id;
    } catch (e) {
      console.error('Submit quote failed:', e);
      return null;
    }
  },

  async fetchRecentQuotes() {
    if (!this.db) return [];

    // Fetch all non-reported quotes (no limit — we want the full pool)
    let allQuotes = [];
    try {
      const snap = await this.db.collection('motivationalQuotes')
        .where('reported', '==', false)
        .get();
      allQuotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback — fetch without filter, filter client-side
      console.warn('Filtered query failed, using fallback:', e.message);
      try {
        const snap = await this.db.collection('motivationalQuotes').get();
        allQuotes = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(q => !q.reported);
      } catch (e2) {
        console.error('All quote fetches failed:', e2);
        return [];
      }
    }

    // Prioritize unhearted quotes: sort unhearted first, then shuffle within groups
    const unhearted = allQuotes.filter(q => !q.hearts || q.hearts === 0);
    const hearted = allQuotes.filter(q => q.hearts && q.hearts > 0);

    // Shuffle each group
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);
    return [...shuffle(unhearted), ...shuffle(hearted)];
  },

  async reportQuote(quoteId) {
    if (!this.db) return false;
    try {
      await this.db.collection('motivationalQuotes').doc(quoteId).update({
        reported: true
      });
      this.logEvent('quote_reported', { quote_id: quoteId });
      return true;
    } catch (e) {
      console.error('Report quote failed:', e);
      return false;
    }
  },

  // ── Quote hearts ──

  async heartQuote(quoteId) {
    if (!this.db) return null;
    const odId = this.getUserOrVisitorId();
    const heartDocId = `${quoteId}_${odId}`;

    try {
      const heartRef = this.db.collection('quoteHearts').doc(heartDocId);
      const existing = await heartRef.get();
      if (existing.exists) return null; // Already hearted

      await heartRef.set({
        quoteId: quoteId,
        odId: odId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Increment heart count on the quote doc
      await this.db.collection('motivationalQuotes').doc(quoteId).update({
        hearts: firebase.firestore.FieldValue.increment(1)
      });

      this.logEvent('quote_hearted', { quote_id: quoteId });
      return true;
    } catch (e) {
      console.error('Heart quote failed:', e);
      return null;
    }
  },

  async hasHeartedQuote(quoteId) {
    if (!this.db) return false;
    const odId = this.getUserOrVisitorId();
    const heartDocId = `${quoteId}_${odId}`;
    try {
      const doc = await this.db.collection('quoteHearts').doc(heartDocId).get();
      return doc.exists;
    } catch (e) {
      return false;
    }
  },

  async getQuoteHeartCount(quoteId) {
    if (!this.db) return 0;
    try {
      const doc = await this.db.collection('motivationalQuotes').doc(quoteId).get();
      return doc.exists ? (doc.data().hearts || 0) : 0;
    } catch (e) {
      return 0;
    }
  },

  async fetchMyQuotes() {
    const user = this.getUser();
    if (!user || !this.db) return [];
    try {
      const snap = await this.db.collection('motivationalQuotes')
        .where('uid', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback without ordering if index missing
      console.warn('fetchMyQuotes ordered query failed, trying fallback:', e.message);
      try {
        const snap = await this.db.collection('motivationalQuotes')
          .where('uid', '==', user.uid)
          .limit(50)
          .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e2) {
        console.error('fetchMyQuotes failed:', e2);
        return [];
      }
    }
  },

  async getNewHeartCount() {
    const user = this.getUser();
    if (!user || !this.db) return 0;

    try {
      // Get lastSeenHeartsAt from user doc
      const userDoc = await this.db.collection('users').doc(user.uid).get();
      const lastSeen = userDoc.exists && userDoc.data().lastSeenHeartsAt
        ? userDoc.data().lastSeenHeartsAt.toDate()
        : new Date(0);

      // Get all quotes by this user
      const myQuotes = await this.fetchMyQuotes();
      if (myQuotes.length === 0) return 0;

      // Count hearts on those quotes that happened after lastSeen
      let newHearts = 0;
      for (const quote of myQuotes) {
        try {
          const heartSnap = await this.db.collection('quoteHearts')
            .where('quoteId', '==', quote.id)
            .where('timestamp', '>', lastSeen)
            .get();
          newHearts += heartSnap.size;
        } catch (e) {
          // If index missing, skip this quote's hearts
          console.warn('Heart count query failed for quote', quote.id, e.message);
        }
      }
      return newHearts;
    } catch (e) {
      console.error('getNewHeartCount failed:', e);
      return 0;
    }
  },

  async markHeartsSeen() {
    const user = this.getUser();
    if (!user || !this.db) return;
    try {
      await this.db.collection('users').doc(user.uid).set({
        lastSeenHeartsAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('markHeartsSeen failed:', e);
    }
  },

  async postComment(lessonId, text) {
    const user = this.getUser();
    if (!user || !this.db) return null;
    try {
      const ref = await this.db.collection('lessonComments').add({
        lessonId: lessonId,
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.logEvent('lesson_comment', { lesson_id: lessonId });
      return ref.id;
    } catch (e) {
      console.error('Post comment failed:', e);
      return null;
    }
  }
};
