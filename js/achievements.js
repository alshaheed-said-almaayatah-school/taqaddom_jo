/* ============================================================
   Achievements — عرض الإنجازات
   المنطق في progress.js — هذا الملف مسؤول عن الـ UI.
   ============================================================ */

const Achievements = (() => {

  /* ---------- بيانات كاملة ---------- */
  const list = () => {
    const owned = Store.read(Store.KEYS.ACHIEVEMENTS, {});
    return Progress.ACHIEVEMENTS_DEF.map(a => ({
      ...a,
      unlocked:   !!owned[a.id],
      unlockedAt: owned[a.id] || null
    }));
  };

  const unlocked = () => list().filter(a => a.unlocked);
  const locked   = () => list().filter(a => !a.unlocked);

  const count = () => ({
    unlocked: unlocked().length,
    total:    Progress.ACHIEVEMENTS_DEF.length,
    percent:  Math.round((unlocked().length / Progress.ACHIEVEMENTS_DEF.length) * 100)
  });

  /* ---------- Grid مختصر (للـ Dashboard) ---------- */
  const renderCompact = (containerSelector, max = 6) => {
    const root = UI.el(containerSelector);
    if (!root) return;

    const u = unlocked();
    const l = locked();

    if (!u.length) {
      root.innerHTML = `<p class="muted">لم تفتح أي إنجاز بعد — أول درس مكتمل يفتح أول إنجاز 🎯</p>`;
      return;
    }

    const show = u.slice(-max);

    root.innerHTML = `
      <div class="ach-grid">
        ${show.map(a => `
          <div class="ach-item unlocked" title="${UI.escape(a.desc)}">
            <span class="ach-ico">${a.icon}</span>
            <span class="ach-title">${UI.escape(a.title)}</span>
          </div>
        `).join('')}
        ${l.length ? `
          <div class="ach-item locked">
            <span class="ach-ico">🔒</span>
            <span class="ach-title">${l.length} متبقية</span>
          </div>` : ''}
      </div>
    `;
  };

  /* ---------- Grid كامل (لصفحة الإحصائيات/الملف) ---------- */
  const renderFull = (containerSelector) => {
    const root = UI.el(containerSelector);
    if (!root) return;

    const all = list();
    const c = count();

    root.innerHTML = `
      <div class="row-between mb-2">
        <h2 class="mb-0">🏆 الإنجازات</h2>
        <span class="badge info">${c.unlocked} / ${c.total}</span>
      </div>
      <div class="progress mb-3"><span style="width:${c.percent}%"></span></div>
      <div class="ach-grid">
        ${all.map(a => `
          <div class="ach-item ${a.unlocked ? 'unlocked' : 'locked'}" title="${UI.escape(a.desc)}">
            <span class="ach-ico">${a.unlocked ? a.icon : '🔒'}</span>
            <span class="ach-title">${UI.escape(a.title)}</span>
            <span class="tiny">${a.unlocked ? UI.fmtRelative(a.unlockedAt) : 'مقفل'}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  return { list, unlocked, locked, count, renderCompact, renderFull };
})();
