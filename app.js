/* ============================================================
   app.js
   Bootstrap عام — يُحمَّل آخر ملف من ملفات JS

   ⚠️ يعتمد على: UI, Auth, Store
   ============================================================ */

window.App = (function () {

  /* ============================================================
     تهيئة الصفحة
     ============================================================ */
  async function init() {

    /* ---------- Theme ---------- */
    UI.initTheme();

    /* ---------- زر تبديل الوضع ---------- */
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        UI.toggleTheme();
      }
    });

    /* ---------- Online Check ---------- */
    UI.initOnline();

    /* ---------- Floating Menu (FAB) ---------- */
    UI.initFAB();

    /* ---------- انتظار Firebase ---------- */
    await Auth.ready;

    const user = Auth.currentUser();

    /* ---------- إخفاء شاشة التحميل ---------- */
    UI.hideLoading();

    /* ---------- اسم المستخدم في الواجهة ---------- */
    if (user) {
      UI.els('[data-user-name]').forEach(function (n) {
        n.textContent = user.name || 'طالب';
      });
      UI.els('[data-user-email]').forEach(function (n) {
        n.textContent = user.email || '';
      });
    }

    /* ---------- عناصر تتطلب تسجيل دخول ---------- */
    UI.els('[data-require-auth]').forEach(function (el) {
      el.classList.toggle('hidden', !user);
    });

    /* ---------- عناصر تتطلب عدم تسجيل دخول ---------- */
    UI.els('[data-require-guest]').forEach(function (el) {
      el.classList.toggle('hidden', !!user);
    });

    /* ---------- أزرار تسجيل الخروج ---------- */
    UI.els('[data-logout]').forEach(function (el) {
      el.addEventListener('click', async function (e) {
        e.preventDefault();

        const ok = await UI.confirm({
          title: 'تسجيل الخروج',
          message: 'هل تريد إنهاء الجلسة؟',
          okText: 'خروج',
          cancelText: 'إلغاء',
          danger: true
        });
        if (!ok) return;

        await Auth.logout();
        location.replace('login.html');
      });
    });

    /* ---------- حماية الصفحات ---------- */
    const page = document.body.dataset.page || '';
    const protectedPages = [
      'dashboard', 'subjects', 'lesson',
      'statistics', 'focus', 'tools',
      'community', 'profile', 'exams',
      'tasks', 'grades'
    ];

    if (protectedPages.indexOf(page) !== -1 && !user) {
      location.replace('login.html');
      return;
    }

    /* ---------- السنة في الفوتر ---------- */
    UI.els('#year').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    /* ---------- إشعار تغيير المستخدم ---------- */
    document.addEventListener('auth:changed', function (e) {
      if (!e.detail) {
        // خرج المستخدم
        if (protectedPages.indexOf(page) !== -1) {
          location.replace('login.html');
        }
      }
    });
  }

  /* ============================================================
     التشغيل
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ============================================================
     التصدير
     ============================================================ */
  return {
    init: init
  };
})();
