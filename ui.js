/* ============================================================
   ui.js
   يحتوي على:
     1) Store — طبقة التخزين الموحّدة (localStorage)
     2) UI    — أدوات الواجهة (Theme, Toast, Modal, Helpers)

   ⚠️ هذا الملف يجب أن يُحمَّل أولًا بعد data.js
   ============================================================ */


/* ============================================================
   Store — كل تعامل مع localStorage يمر من هنا
   ============================================================ */

window.Store = (function () {

  const NS = 'taqaddom';

  const KEYS = {
    USERS:        NS + ':users',
    SESSION:      NS + ':session',
    PROGRESS:     NS + ':progress',
    ACTIVITY:     NS + ':activity',
    ACHIEVEMENTS: NS + ':achievements',
    STREAK:       NS + ':streak',
    GOALS:        NS + ':goals',
    FOCUS:        NS + ':focus',
    THEME:        NS + ':theme'
  };

  /* ---------- قراءة / كتابة / حذف ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : null);
    } catch (e) {
      console.warn('[Store.read]', key, e);
      return fallback !== undefined ? fallback : null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Store.write]', key, e);
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  function cryptoId() {
    return 'id-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  /* ---------- Progress ---------- */
  function getProgress() {
    return read(KEYS.PROGRESS, {});
  }

  function getLessonStatus(lessonId) {
    const p = getProgress();
    return (p[lessonId] && p[lessonId].status) || 'notstarted';
  }

  function setLessonStatus(lessonId, status) {
    const p = getProgress();
    if (status === 'notstarted') {
      delete p[lessonId];
    } else {
      p[lessonId] = { status: status, updatedAt: Date.now() };
    }
    write(KEYS.PROGRESS, p);
    return p;
  }

  function resetProgress() {
    write(KEYS.PROGRESS, {});
  }

  /* ---------- Activity ---------- */
  function getActivity() {
    return read(KEYS.ACTIVITY, []);
  }

  function logActivity(type, message, meta) {
    const list = getActivity();
    list.unshift({
      id: cryptoId(),
      type: type,
      message: message,
      meta: meta || {},
      at: Date.now()
    });
    write(KEYS.ACTIVITY, list.slice(0, 200));
  }

  /* ---------- Users / Session ---------- */
  function getUsers()   { return read(KEYS.USERS, {}); }
  function saveUsers(u) { return write(KEYS.USERS, u); }
  function getSession() { return read(KEYS.SESSION, null); }

  function setSession(s) {
    if (s) write(KEYS.SESSION, s);
    else remove(KEYS.SESSION);
  }

  /* ---------- Theme ---------- */
  function getTheme() { return read(KEYS.THEME, null); }
  function setTheme(t) { return write(KEYS.THEME, t); }

  /* ---------- Achievements / Goals / Focus ---------- */
  function getAchievements() { return read(KEYS.ACHIEVEMENTS, {}); }
  function setAchievements(a) { return write(KEYS.ACHIEVEMENTS, a); }

  function getGoals() { return read(KEYS.GOALS, []); }
  function setGoals(g) { return write(KEYS.GOALS, g); }

  function getFocusSessions() { return read(KEYS.FOCUS, []); }

  function addFocusSession(s) {
    const list = getFocusSessions();
    list.unshift(Object.assign({ id: cryptoId(), at: Date.now() }, s));
    write(KEYS.FOCUS, list.slice(0, 500));
  }

  return {
    KEYS: KEYS,
    read: read,
    write: write,
    remove: remove,
    cryptoId: cryptoId,

    getProgress: getProgress,
    getLessonStatus: getLessonStatus,
    setLessonStatus: setLessonStatus,
    resetProgress: resetProgress,

    getActivity: getActivity,
    logActivity: logActivity,

    getUsers: getUsers,
    saveUsers: saveUsers,
    getSession: getSession,
    setSession: setSession,

    getTheme: getTheme,
    setTheme: setTheme,

    getAchievements: getAchievements,
    setAchievements: setAchievements,
    getGoals: getGoals,
    setGoals: setGoals,
    getFocusSessions: getFocusSessions,
    addFocusSession: addFocusSession
  };
})();


/* ============================================================
   UI — أدوات الواجهة
   ============================================================ */

window.UI = (function () {

  /* ---------- Helpers ---------- */
  function el(sel, root)   { return (root || document).querySelector(sel); }
  function els(sel, root)  { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function fmtDate(ts) {
    try {
      return new Intl.DateTimeFormat('ar', {
        dateStyle: 'medium', timeStyle: 'short'
      }).format(new Date(ts));
    } catch (e) { return new Date(ts).toLocaleString(); }
  }

  function fmtRelative(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'الآن';
    if (m < 60) return 'قبل ' + m + ' دقيقة';
    const h = Math.floor(m / 60);
    if (h < 24) return 'قبل ' + h + ' ساعة';
    const d = Math.floor(h / 24);
    if (d < 7)  return 'قبل ' + d + ' يوم';
    return fmtDate(ts);
  }

  function pct(n) { return Math.round(n) + '%'; }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Store.setTheme(theme);

    // تحديث أيقونة الأزرار
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
    const saved = Store.getTheme();
    let initial = saved;
    if (!initial) {
      initial = window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: light)').matches
                ? 'light' : 'dark';
    }
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
    box._t = setTimeout(function () {
      box.classList.remove('show');
    }, ms);
  }

  /* ---------- Confirm Modal ---------- */
  function confirmDialog(opts) {
    opts = opts || {};
    const title      = opts.title      || 'تأكيد';
    const message    = opts.message    || '';
    const okText     = opts.okText     || 'تأكيد';
    const cancelText = opts.cancelText || 'إلغاء';
    const danger     = !!opts.danger;

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

      function onKey(e) {
        if (e.key === 'Escape') close(false);
      }

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

  return {
    el: el,
    els: els,
    escape: escape,
    fmtDate: fmtDate,
    fmtRelative: fmtRelative,
    pct: pct,

    applyTheme: applyTheme,
    currentTheme: currentTheme,
    toggleTheme: toggleTheme,
    initTheme: initTheme,

    toast: toast,
    confirm: confirmDialog
  };
})();
