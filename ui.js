/* ============================================================
   ui.js
   1) Store — طبقة تخزين على Firestore
   2) UI    — Theme, Toast, Modal, FAB, Online, Helpers
   ⚠️ يعتمد على window.FB (من firebase.js)
   ============================================================ */


/* ============================================================
   Store
   ============================================================ */

window.Store = (function () {

  let currentUid = null;
  let cache = {};

  function setUid(uid) {
    currentUid = uid;
    cache = {};
  }

  function getUid() { return currentUid; }

  function userDocRef() {
    if (!currentUid) throw new Error('لا يوجد مستخدم مسجّل');
    return FB.doc(FB.db, 'users', currentUid);
  }

  async function loadAll() {
    if (!currentUid) return null;

    const snap = await FB.getDoc(userDocRef());
    if (!snap.exists()) {
      const initial = {
        profile: { name: '', email: '', createdAt: Date.now() },
        progress: {},
        achievements: {},
        streak: { days: [] },
        goals: [],
        focus: [],
        activity: [],
        tasks: [],
        exams: [],
        grades: { subjects: {}, target: 90 },
        notes: {}
      };
      await FB.setDoc(userDocRef(), initial);
      cache = initial;
      return initial;
    }
    cache = snap.data();
    return cache;
  }

  /* ---------- Profile ---------- */
  async function saveProfile(profile) {
    if (!currentUid) return;
    cache.profile = Object.assign({}, cache.profile, profile);
    await FB.updateDoc(userDocRef(), { profile: cache.profile });
  }
  function getProfile() { return cache.profile || {}; }

  /* ---------- Progress ---------- */
  function getProgress() { return cache.progress || {}; }
  function getLessonStatus(lessonId) {
    const p = getProgress();
    return (p[lessonId] && p[lessonId].status) || 'notstarted';
  }
  async function setLessonStatus(lessonId, status) {
    if (!currentUid) return;
    if (!cache.progress) cache.progress = {};
    if (status === 'notstarted') delete cache.progress[lessonId];
    else cache.progress[lessonId] = { status: status, updatedAt: Date.now() };
    await FB.updateDoc(userDocRef(), { progress: cache.progress });
  }
  async function resetProgress() {
    if (!currentUid) return;
    cache.progress = {};
    await FB.updateDoc(userDocRef(), { progress: {} });
  }

  /* ---------- Achievements ---------- */
  function getAchievements() { return cache.achievements || {}; }
  async function setAchievements(a) {
    if (!currentUid) return;
    cache.achievements = a;
    await FB.updateDoc(userDocRef(), { achievements: a });
  }

  /* ---------- Streak ---------- */
  function getStreak() { return cache.streak || { days: [] }; }
  async function setStreak(s) {
    if (!currentUid) return;
    cache.streak = s;
    await FB.updateDoc(userDocRef(), { streak: s });
  }

  /* ---------- Goals ---------- */
  function getGoals() { return cache.goals || []; }
  async function setGoals(g) {
    if (!currentUid) return;
    cache.goals = g;
    await FB.updateDoc(userDocRef(), { goals: g });
  }

  /* ---------- Focus ---------- */
  function getFocusSessions() { return cache.focus || []; }
  async function addFocusSession(session) {
    if (!currentUid) return;
    const list = getFocusSessions().slice();
    list.unshift(Object.assign({ id: cryptoId(), at: Date.now() }, session));
    cache.focus = list.slice(0, 500);
    await FB.updateDoc(userDocRef(), { focus: cache.focus });
  }

  /* ---------- Activity ---------- */
  function getActivity() { return cache.activity || []; }
  async function logActivity(type, message, meta) {
    if (!currentUid) return;
    const list = getActivity().slice();
    list.unshift({
      id: cryptoId(), type: type, message: message,
      meta: meta || {}, at: Date.now()
    });
    cache.activity = list.slice(0, 200);
    await FB.updateDoc(userDocRef(), { activity: cache.activity });
  }

  /* ---------- Tasks ---------- */
  function getTasks() { return cache.tasks || []; }
  async function setTasks(t) {
    if (!currentUid) return;
    cache.tasks = t;
    await FB.updateDoc(userDocRef(), { tasks: t });
  }
  async function addTask(task) {
    if (!currentUid) return;
    const list = getTasks().slice();
    list.unshift({
      id: cryptoId(),
      text: task.text || '',
      done: false,
      priority: task.priority || 'normal',
      createdAt: Date.now()
    });
    await setTasks(list);
    return list[0];
  }
  async function toggleTask(id) {
    const list = getTasks().map(function (t) {
      if (t.id === id) return Object.assign({}, t, { done: !t.done, doneAt: !t.done ? Date.now() : null });
      return t;
    });
    await setTasks(list);
  }
  async function deleteTask(id) {
    await setTasks(getTasks().filter(function (t) { return t.id !== id; }));
  }

  /* ---------- Exams ---------- */
  function getExams() { return cache.exams || []; }
  async function setExams(e) {
    if (!currentUid) return;
    cache.exams = e;
    await FB.updateDoc(userDocRef(), { exams: e });
  }
  async function addExam(exam) {
    if (!currentUid) return;
    const list = getExams().slice();
    const newExam = {
      id: cryptoId(),
      title: exam.title || '',
      subject: exam.subject || '',
      date: exam.date,
      notes: exam.notes || '',
      createdAt: Date.now()
    };
    list.push(newExam);
    list.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    await setExams(list);
    return newExam;
  }
  async function deleteExam(id) {
    await setExams(getExams().filter(function (e) { return e.id !== id; }));
  }

  /* ---------- Grades ---------- */
  function getGrades() { return cache.grades || { subjects: {}, target: 90 }; }
  async function setGrades(g) {
    if (!currentUid) return;
    cache.grades = g;
    await FB.updateDoc(userDocRef(), { grades: g });
  }

  /* ---------- Notes ---------- */
  function getNotes() { return cache.notes || {}; }
  function getLessonNote(lessonId) { return getNotes()[lessonId] || ''; }
  async function setLessonNote(lessonId, text) {
    if (!currentUid) return;
    if (!cache.notes) cache.notes = {};
    if (String(text).trim() === '') delete cache.notes[lessonId];
    else cache.notes[lessonId] = { text: text, updatedAt: Date.now() };
    await FB.updateDoc(userDocRef(), { notes: cache.notes });
  }

  function cryptoId() {
    return 'id-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  return {
    setUid, getUid, loadAll, cryptoId,
    getProfile, saveProfile,
    getProgress, getLessonStatus, setLessonStatus, resetProgress,
    getAchievements, setAchievements,
    getStreak, setStreak,
    getGoals, setGoals,
    getFocusSessions, addFocusSession,
    getActivity, logActivity,
    getTasks, setTasks, addTask, toggleTask, deleteTask,
    getExams, setExams, addExam, deleteExam,
    getGrades, setGrades,
    getNotes, getLessonNote, setLessonNote
  };
})();


/* ============================================================
   UI
   ============================================================ */

window.UI = (function () {

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function fmtDate(ts) {
    try {
      return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
    } catch (e) { return new Date(ts).toLocaleString(); }
  }

  function fmtRelative(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return 'قبل ' + m + ' دقيقة';
    const h = Math.floor(m / 60);
    if (h < 24) return 'قبل ' + h + ' ساعة';
    const d = Math.floor(h / 24);
    if (d < 7) return 'قبل ' + d + ' يوم';
    return fmtDate(ts);
  }

  function pct(n) { return Math.round(n) + '%'; }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('taqaddom:theme', theme); } catch (e) {}
    els('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
  function toggleTheme() {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('taqaddom:theme'); } catch (e) {}
    let initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(initial);
  }

  /* ---------- Toast ---------- */
  function toast(msg, type, ms) {
    type = type || 'info';
    ms = ms || 2600;
    let box = document.getElementById('toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast';
      document.body.appendChild(box);
    }
    box.className = 'toast show ' + type;
    box.textContent = msg;
    if (box._t) clearTimeout(box._t);
    box._t = setTimeout(function () { box.classList.remove('show'); }, ms);
  }

  /* ---------- Confirm ---------- */
  function confirmDialog(opts) {
    opts = opts || {};
    const title = opts.title || 'تأكيد';
    const message = opts.message || '';
    const okText = opts.okText || 'تأكيد';
    const cancelText = opts.cancelText || 'إلغاء';
    const danger = !!opts.danger;

    return new Promise(function (resolve) {
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<h3>' + escape(title) + '</h3>' +
          '<p>' + escape(message) + '</p>' +
          '<div class="modal-actions">' +
            '<button class="btn ghost" data-act="cancel" type="button">' + escape(cancelText) + '</button>' +
            '<button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="ok" type="button">' + escape(okText) + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(back);
      requestAnimationFrame(function () { back.classList.add('show'); });

      function close(val) {
        back.classList.remove('show');
        setTimeout(function () { back.remove(); }, 200);
        document.removeEventListener('keydown', onKey);
        resolve(val);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }

      back.addEventListener('click', function (e) {
        if (e.target === back) return close(false);
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'ok') close(true);
        if (act.dataset.act === 'cancel') close(false);
      });
      document.addEventListener('keydown', onKey);
    });
  }

  /* ---------- FAB ---------- */
  function initFAB() {
    const fab = document.getElementById('fabBtn');
    const menu = document.getElementById('floatingMenu');
    const backdrop = document.getElementById('menuBackdrop');
    if (!fab || !menu) return;

    function toggle(force) {
      const open = typeof force === 'boolean' ? force : !menu.classList.contains('show');
      menu.classList.toggle('show', open);
      if (backdrop) backdrop.classList.toggle('show', open);
      fab.classList.toggle('open', open);
      fab.textContent = open ? '✕' : '☰';
    }

    fab.addEventListener('click', function () { toggle(); });
    if (backdrop) backdrop.addEventListener('click', function () { toggle(false); });

    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toggle(false);
    });

    const here = location.pathname.split('/').pop() || 'dashboard.html';
    menu.querySelectorAll('a').forEach(function (a) {
      const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      if (href === here) a.classList.add('active');
    });
  }

  /* ---------- Online ---------- */
  function checkOnline() {
    const offline = document.getElementById('offline');
    if (!offline) return;
    if (!navigator.onLine) offline.classList.remove('hidden');
    else offline.classList.add('hidden');
  }
  function initOnline() {
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    checkOnline();
  }

  /* ---------- Loading ---------- */
  function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }

  return {
    el, els, escape, fmtDate, fmtRelative, pct,
    applyTheme, currentTheme, toggleTheme, initTheme,
    toast, confirm: confirmDialog,
    initFAB, checkOnline, initOnline, hideLoading
  };
})();
