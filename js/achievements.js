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
