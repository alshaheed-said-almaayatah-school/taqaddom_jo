/* ============================================================
   App — تهيئة مشتركة لكل الصفحات
   ============================================================ */

const App = (() => {

  const init = () => {
    /* ---------- Theme ---------- */
    UI.initTheme();

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-toggle]')) {
        UI.toggleTheme();
      }
    });

    /* ---------- تمييز الرابط النشط ---------- */
    const here = location.pathname.split('/').pop() || 'index.html';
    UI.els('[data-nav]').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop().split('#')[0];
      if (href === here) a.classList.add('active');
    });

    /* ---------- اسم المستخدم ---------- */
    const u = Auth.currentUser();
    UI.els('[data-user-name]').forEach(n => {
      n.textContent = u ? u.name : 'زائر';
    });

    /* ---------- عرض/إخفاء عناصر حسب الجلسة ---------- */
    UI.els('[data-require-auth]').forEach(el => {
      el.style.display = u ? '' : 'none';
    });
    UI.els('[data-require-guest]').forEach(el => {
      el.style.display = u ? 'none' : '';
    });

    /* ---------- تسجيل الخروج السريع ---------- */
    UI.els('[data-logout]').forEach(el => {
      el.addEventListener('click', async (e) => {
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
        const back = location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
        location.replace(back);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
