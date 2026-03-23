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
    this.auth.onAuthStateChanged(user => {
      if (user) {
        Storage.onSignIn(user);
      }
      UI.updateAuthUI(user);
    });
  },

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
      await this.auth.signOut();
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  },

  getUser() {
    return this.auth ? this.auth.currentUser : null;
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
