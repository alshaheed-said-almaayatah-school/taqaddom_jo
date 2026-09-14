/* ============================================================
   achievements.js
   عرض الإنجازات — المنطق في progress.js

   يعتمد على: Store (ui.js) + Progress (progress.js)
   ============================================================ */

window.Achievements = (function () {

  /* ============================================================
     قائمة الإنجازات
     ============================================================ */

  function list() {
    const owned = Store.read(Store.KEYS.ACHIEVEMENTS, {});
    return Progress.ACHIEVEMENTS_DEF.map(function (a) {
      return {
        id: a.id,
        icon: a.icon,
        title: a.title,
        desc: a.desc,
        unlocked: !!owned[a.id],
        unlockedAt: owned[a.id] || null
      };
    });
  }

  function unlocked() {
    return list().filter(function (a) { return a.unlocked; });
  }

  function locked() {
    return list().filter(function (a) { return !a.unlocked; });
  }

  function count() {
    const u = unlocked().length;
    const total = Progress.ACHIEVEMENTS_DEF.length;
    return {
      unlocked: u,
      total: total,
      percent: total === 0 ? 0 : Math.round((u / total) * 100)
    };
  }

  /* ============================================================
     عرض مصغّر — للـ Dashboard
     ============================================================ */

  function renderCompact(containerSelector, max) {
    max = max || 6;
    const root = UI.el(containerSelector);
    if (!root) return;

    const u = unlocked();
    const l = locked();

    if (!u.length) {
      root.innerHTML = '<p class="muted">لم تفتح أي إنجاز بعد — أول درس مكتمل يفتح أول إنجاز 🎯</p>';
      return;
    }

    const show = u.slice(-max);

    root.innerHTML =
      '<div class="ach-grid">' +
        show.map(function (a) {
          return '<div class="ach-item unlocked" title="' + UI.escape(a.desc) + '">' +
                   '<span class="ach-ico">' + a.icon + '</span>' +
                   '<span class="ach-title">' + UI.escape(a.title) + '</span>' +
                 '</div>';
        }).join('') +
        (l.length
          ? '<div class="ach-item locked">' +
              '<span class="ach-ico">🔒</span>' +
              '<span class="ach-title">' + l.length + ' متبقية</span>' +
            '</div>'
          : '') +
      '</div>';
  }

  /* ============================================================
     عرض كامل — لصفحة الإحصائيات
     ============================================================ */

  function renderFull(containerSelector) {
    const root = UI.el(containerSelector);
    if (!root) return;

    const all = list();
    const c = count();

    root.innerHTML =
      '<div class="row-between mb-2">' +
        '<h2 class="mb-0">🏆 الإنجازات</h2>' +
        '<span class="badge info">' + c.unlocked + ' / ' + c.total + '</span>' +
      '</div>' +
      '<div class="progress mb-3"><span style="width:' + c.percent + '%"></span></div>' +
      '<div class="ach-grid">' +
        all.map(function (a) {
          return '<div class="ach-item ' + (a.unlocked ? 'unlocked' : 'locked') + '" title="' + UI.escape(a.desc) + '">' +
                   '<span class="ach-ico">' + (a.unlocked ? a.icon : '🔒') + '</span>' +
                   '<span class="ach-title">' + UI.escape(a.title) + '</span>' +
                   '<span class="tiny">' + (a.unlocked ? UI.fmtRelative(a.unlockedAt) : 'مقفل') + '</span>' +
                 '</div>';
        }).join('') +
      '</div>';
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    list: list,
    unlocked: unlocked,
    locked: locked,
    count: count,
    renderCompact: renderCompact,
    renderFull: renderFull
  };
})();
