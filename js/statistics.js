/* ============================================================
   Statistics — منطق صفحة الإحصائيات
   لا يحفظ شيئًا، فقط يقرأ ويعرض.
   ============================================================ */

const Statistics = (() => {

  /* ---------- حزمة كاملة لكل الأرقام ---------- */
  const snapshot = () => {
    const overall = Progress.overall();
    const subjects = Progress.allSubjectsCounts();
    const top = Progress.topSubjects(3);
    const weak = Progress.weakSubjects(3);

    return {
      overall,
      subjects,
      top,
      weak,
      streak:       Progress.currentStreak(),
      activeDays:   Progress.totalActiveDays(),
      lessonsToday: Progress.lessonsDoneToday(),
      focusToday:   Progress.focusSessionsToday(),
      focusTotal:   Store.getFocusSessions().length,
      goals:        Progress.goalsWithProgress(),
      achievements: Progress.listAchievements(),
      activity:     Store.getActivity(),
      curriculum:   Curriculum.getStats()
    };
  };

  /* ---------- نسبة كل وحدة (لعرض تفصيلي) ---------- */
  const unitsOfSubject = (subjectId) => {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return [];
    return sub.units.map(u => {
      const c = Progress.unitCounts(sub.id, u.unit_number);
      return { ...u, ...c };
    });
  };

  /* ---------- أكثر نشاط يوم (اختياري) ---------- */
  const activityByDay = () => {
    const map = {};
    Store.getActivity().forEach(a => {
      const k = Progress.dayKey(a.at);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);
  };

  /* ---------- التصدير ---------- */
  return {
    snapshot,
    unitsOfSubject,
    activityByDay
  };
})();
