/* ============================================================
   statistics.js
   منطق صفحة الإحصائيات — قراءة فقط، لا يحفظ شيئًا

   يعتمد على: Store + Curriculum + Progress
   ============================================================ */

window.Statistics = (function () {

  /* ============================================================
     لقطة شاملة
     ============================================================ */

  function snapshot() {
    const overall   = Progress.overall();
    const subjects  = Progress.allSubjectsCounts();
    const top       = Progress.topSubjects(3);
    const weak      = Progress.weakSubjects(3);
    const goals     = Progress.goalsWithProgress();
    const focusList = Store.getFocusSessions();

    return {
      overall:     overall,
      subjects:    subjects,
      top:         top,
      weak:        weak,
      streak:      Progress.currentStreak(),
      activeDays:  Progress.totalActiveDays(),
      lessonsToday: Progress.lessonsDoneToday(),
      focusToday:  Progress.focusSessionsToday(),
      focusTotal:  focusList.length,
      focusMinutes: focusList.reduce(function (s, x) {
        return s + (Number(x.duration) || 0);
      }, 0),
      goals:       goals,
      goalsDone:   goals.filter(function (g) { return g.achieved; }).length,
      achievements: Achievements.count(),
      activity:    Store.getActivity(),
      curriculum:  Curriculum.getStats()
    };
  }

  /* ============================================================
     تفصيل وحدات مادة
     ============================================================ */

  function unitsOfSubject(subjectId) {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return [];

    return sub.units.map(function (u) {
      const c = Progress.unitCounts(sub.id, u.unit_number);
      return {
        unit_number: u.unit_number,
        name: u.name,
        lessonsCount: u.lessonsCount,
        done: c ? c.done : 0,
        inprogress: c ? c.inprogress : 0,
        notstarted: c ? c.notstarted : 0,
        total: c ? c.total : 0,
        percent: c ? c.percent : 0
      };
    });
  }

  /* ============================================================
     النشاط حسب اليوم
     ============================================================ */

  function activityByDay() {
    const map = {};
    Store.getActivity().forEach(function (a) {
      const k = Progress.dayKey(a.at);
      map[k] = (map[k] || 0) + 1;
    });

    return Object.keys(map)
      .map(function (day) { return { day: day, count: map[day] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /* ============================================================
     ملخص المواد (مرتب)
     ============================================================ */

  function subjectsSorted(by) {
    const list = Progress.allSubjectsCounts().slice();

    if (by === 'weak') {
      list.sort(function (a, b) { return a.percent - b.percent; });
    } else {
      list.sort(function (a, b) { return b.percent - a.percent; });
    }
    return list;
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    snapshot: snapshot,
    unitsOfSubject: unitsOfSubject,
    activityByDay: activityByDay,
    subjectsSorted: subjectsSorted
  };
})();
