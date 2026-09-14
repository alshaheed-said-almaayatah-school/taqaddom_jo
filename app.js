/* ============================================================
   app.js
   Bootstrap عام — يُحمَّل آخر ملف

   يعتمد على: كل الملفات السابقة
   ============================================================ */

window.App = (function () {

  /* ============================================================
     التهيئة
     ============================================================ */

  function init() {

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

    /* ---------- تمييز الرابط النشط في Bottom Nav ---------- */
    const here = location.pathname.split('/').pop() || 'index.html';
    UI.els('.bottom-nav a').forEach(function (a) {
      const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      if (href === here) a.classList.add('active');
    });

    /* ---------- اسم المستخدم ---------- */
    const u = Auth.currentUser();
    UI.els('[data-user-name]').forEach(function (n) {
      n.textContent = u ? u.name : 'زائر';
    });

    /* ---------- عناصر تتطلب تسجيل دخول ---------- */
    UI.els('[data-require-auth]').forEach(function (el) {
      el.style.display = u ? '' : 'none';
    });

    /* ---------- عناصر تتطلب عدم تسجيل دخول ---------- */
    UI.els('[data-require-guest]').forEach(function (el) {
      el.style.display = u ? 'none' : '';
    });

    /* ---------- أزرار تسجيل الخروج العامة ---------- */
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
        Auth.logout();
        location.replace('login.html');
      });
    });

    /* ---------- سنة الفوتر ---------- */
    UI.els('#year').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ============================================================
     التشغيل التلقائي
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
