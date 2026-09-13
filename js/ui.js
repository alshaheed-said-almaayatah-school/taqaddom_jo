/* ============================================================
   UI — أدوات واجهة مشتركة
   ============================================================ */

const UI = (() => {

  /* ---------- Theme ---------- */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    Store.setTheme(theme);
  };
  const currentTheme = () =>
    document.documentElement.getAttribute('data-theme') || 'dark';
  const toggleTheme = () =>
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');

  const initTheme = () => {
    const saved = Store.getTheme();
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved || (prefersLight ? 'light' : 'dark'));
  };

  /* ---------- Toast ---------- */
  const toast = (msg, type = 'info', ms = 2600) => {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.className = `toast show ${type}`;
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
  };

  /* ---------- Confirm Modal ---------- */
  const confirmDialog = ({
    title = 'تأكيد',
    message = '',
    okText = 'تأكيد',
    cancelText = 'إلغاء',
    danger = false
  } = {}) => new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${escape(title)}</h3>
        <p>${escape(message)}</p>
        <div class="modal-actions">
          <button class="btn ghost" data-act="cancel">${escape(cancelText)}</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-act="ok">${escape(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('show'));

    const close = (val) => {
      back.classList.remove('show');
      setTimeout(() => back.remove(), 180);
      resolve(val);
    };

    back.addEventListener('click', (e) => {
      if (e.target === back) return close(false);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') close(true);
      if (act === 'cancel') close(false);
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); }
    });
  });

  /* ---------- Helpers ---------- */
  const el  = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escape = (s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const fmtDate = (ts) => new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(ts));

  const fmtRelative = (ts) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'الآن';
    if (m < 60) return `قبل ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `قبل ${h} ساعة`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `قبل ${d} يوم`;
    return fmtDate(ts);
  };

  const pct = (n) => `${Math.round(n)}%`;

  return {
    applyTheme, currentTheme, toggleTheme, initTheme,
    toast, confirm: confirmDialog,
    el, els, escape, fmtDate, fmtRelative, pct
  };
})();
