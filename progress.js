/* ============================================================
   progress.js
   حالات الدروس + الحسابات + Streak + الأهداف + الإنجازات

   يعتمد على: Store (ui.js) + Curriculum (curriculum.js)
   ============================================================ */

window.Progress = (function () {

  /* ============================================================
     حالات الدرس
     ============================================================ */

  const STATUS = {
    NOT_STARTED: 'notstarted',
    IN_PROGRESS: 'inprogress',
    DONE:        'done'
  };

  const STATUS_LABEL = {
    notstarted: 'لم يبدأ',
    inprogress: 'منتصف الدرس',
    done:       'مكتمل'
  };

  const STATUS_COLOR = {
    notstarted: 'muted',
    inprogress: 'warning',
    done:       'success'
  };

  /* ============================================================
     قراءة / تعديل حالة درس
     ============================================================ */

  function getStatus(lessonId) {
    return Store.getLessonStatus(lessonId);
  }

  function setStatus(lessonId, status, opts) {
    opts = opts || {};
    const lesson = Curriculum.getLesson(lessonId);
    if (!lesson) return false;

    const prev = Store.getLessonStatus(lessonId);
    if (prev === status) return true;

    Store.setLessonStatus(lessonId, status);

    if (!opts.silent) {
      if (status === STATUS.DONE) {
        Store.logActivity('lesson', 'أكملت درس: ' + lesson.lesson_name, {
          lesson_id: lessonId,
          subject_id: lesson.subject_id
        });
        touchStreak();
      } else if (status === STATUS.IN_PROGRESS) {
        Store.logActivity('lesson', 'بدأت: ' + lesson.lesson_name, {
          lesson_id: lessonId,
          subject_id: lesson.subject_id
        });
        touchStreak();
      } else if (status === STATUS.NOT_STARTED && prev === STATUS.DONE) {
        Store.logActivity('lesson', 'ألغيت إكمال: ' + lesson.lesson_name, {
          lesson_id: lessonId,
          subject_id: lesson.subject_id
        });
      }
    }

    checkAchievements();
    return true;
  }

  function markDone(id)       { return setStatus(id, STATUS.DONE); }
  function markInProgress(id) { return setStatus(id, STATUS.IN_PROGRESS); }
  function resetLesson(id)    { return setStatus(id, STATUS.NOT_STARTED); }

  /* ============================================================
     الحسابات
     ============================================================ */

  function countStatuses(lessons) {
    const p = Store.getProgress();
    let done = 0, inprogress = 0, notstarted = 0;

    lessons.forEach(function (l) {
      const entry = p[l.lesson_id];
      const s = (entry && entry.status) || STATUS.NOT_STARTED;
      if (s === STATUS.DONE) done++;
      else if (s === STATUS.IN_PROGRESS) inprogress++;
      else notstarted++;
    });

    const total = done + inprogress + notstarted;
    return {
      done: done,
      inprogress: inprogress,
      notstarted: notstarted,
      total: total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100)
    };
  }

  function lessonCounts() {
    return countStatuses(Curriculum.getAll());
  }

  function overall() {
    return lessonCounts();
  }

  function subjectCounts(subjectId) {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return null;

    const lessons = [];
    sub.units.forEach(function (u) {
      u.lessons.forEach(function (l) { lessons.push(l); });
    });

    const c = countStatuses(lessons);
    c.subjectId = sub.id;
    c.name = sub.name;
    return c;
  }

  function unitCounts(subjectId, unitNumber) {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return null;

    const unit = sub.units.find(function (u) {
      return u.unit_number === Number(unitNumber);
    });
    if (!unit) return null;

    const c = countStatuses(unit.lessons);
    c.unitNumber = unit.unit_number;
    c.name = unit.name;
    return c;
  }

  function allSubjectsCounts() {
    return Curriculum.getSubjects()
      .map(function (s) { return subjectCounts(s.id); })
      .filter(Boolean);
  }

  function topSubjects(n) {
    n = n || 3;
    return allSubjectsCounts()
      .filter(function (s) { return s.total > 0; })
      .sort(function (a, b) { return b.percent - a.percent; })
      .slice(0, n);
  }

  function weakSubjects(n) {
    n = n || 3;
    return allSubjectsCounts()
      .filter(function (s) { return s.total > 0; })
      .sort(function (a, b) { return a.percent - b.percent; })
      .slice(0, n);
  }

  /* ============================================================
     Streak — أيام النشاط المتتالية
     ============================================================ */

  function dayKey(ts) {
    const d = new Date(ts || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  function readStreak() {
    return Store.read(Store.KEYS.STREAK, { days: [] });
  }

  function touchStreak() {
    const s = readStreak();
    const today = dayKey();
    if (s.days.indexOf(today) === -1) {
      s.days.push(today);
      s.days = s.days.slice(-180);
      Store.write(Store.KEYS.STREAK, s);
    }
  }

  function currentStreak() {
    const s = readStreak();
    if (!s.days.length) return 0;

    const set = {};
    s.days.forEach(function (d) { set[d] = true; });

    let streak = 0;
    const cursor = new Date();

    if (!set[dayKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (set[dayKey(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function totalActiveDays() {
    return readStreak().days.length;
  }

  /* ============================================================
     الأهداف
     ============================================================ */

  const DEFAULT_GOALS = [
    { id: 'g-lessons-1', type: 'lessons_today', target: 1, label: 'أنجز درسًا واحدًا اليوم' },
    { id: 'g-lessons-3', type: 'lessons_today', target: 3, label: 'أنجز 3 دروس اليوم' },
    { id: 'g-focus-1',   type: 'focus_today',   target: 1, label: 'نفّذ جلسة تركيز واحدة' },
    { id: 'g-streak-3',  type: 'streak',        target: 3, label: 'حافظ على سلسلة 3 أيام' }
  ];

  function getGoals() {
    const saved = Store.getGoals();
    return (saved && saved.length) ? saved : DEFAULT_GOALS;
  }

  function lessonsDoneToday() {
    const today = dayKey();
    const p = Store.getProgress();
    let count = 0;
    Object.keys(p).forEach(function (k) {
      const entry = p[k];
      if (entry && entry.status === STATUS.DONE && dayKey(entry.updatedAt) === today) {
        count++;
      }
    });
    return count;
  }

  function focusSessionsToday() {
    const today = dayKey();
    return Store.getFocusSessions().filter(function (s) {
      return dayKey(s.at) === today;
    }).length;
  }

  function goalProgress(goal) {
    switch (goal.type) {
      case 'lessons_today': return Math.min(lessonsDoneToday(), goal.target);
      case 'focus_today':   return Math.min(focusSessionsToday(), goal.target);
      case 'streak':        return Math.min(currentStreak(), goal.target);
      default:              return 0;
    }
  }

  function goalsWithProgress() {
    return getGoals().map(function (g) {
      const value = goalProgress(g);
      return {
        id: g.id,
        type: g.type,
        label: g.label,
        target: g.target,
        value: value,
        achieved: value >= g.target
      };
    });
  }

  /* ============================================================
     الإنجازات
     ============================================================ */

  const ACHIEVEMENTS_DEF = [
    { id: 'first_lesson',    icon: '🎯', title: 'البداية',         desc: 'أكملت أول درس' },
    { id: 'first_unit',      icon: '📦', title: 'أول وحدة',        desc: 'أكملت أول وحدة كاملة' },
    { id: 'first_subject',   icon: '📚', title: 'أول مادة',        desc: 'أكملت مادة كاملة' },
    { id: 'first_focus',     icon: '🧠', title: 'أول تركيز',       desc: 'أنجزت أول جلسة تركيز' },
    { id: 'streak_3',        icon: '🔥', title: '3 أيام',          desc: 'حافظت على سلسلة 3 أيام' },
    { id: 'streak_7',        icon: '💪', title: 'أسبوع كامل',      desc: 'حافظت على سلسلة 7 أيام' },
    { id: 'lessons_10',      icon: '⭐', title: '10 دروس',         desc: 'أكملت 10 دروس' },
    { id: 'lessons_25',      icon: '🌟', title: '25 درسًا',        desc: 'أكملت 25 درسًا' },
    { id: 'lessons_50',      icon: '💫', title: 'نصف الطريق',     desc: 'أكملت 50 درسًا' },
    { id: 'percent_25',      icon: '🚀', title: '25% من المنهج',  desc: 'ربع المنهج مكتمل' },
    { id: 'percent_50',      icon: '🏅', title: '50% من المنهج',  desc: 'نصف المنهج مكتمل' },
    { id: 'percent_75',      icon: '🥇', title: '75% من المنهج',  desc: 'ثلاثة أرباع المنهج مكتمل' },
    { id: 'curriculum_done', icon: '🎉', title: 'أكملت المنهج',   desc: 'أنجزت كل الدروس' }
  ];

  function readAchievements() {
    return Store.read(Store.KEYS.ACHIEVEMENTS, {});
  }

  function checkAchievements() {
    const owned = readAchievements();
    const c = lessonCounts();
    const added = [];

    function unlock(id) {
      if (!owned[id]) {
        owned[id] = Date.now();
        added.push(id);
        const def = ACHIEVEMENTS_DEF.find(function (a) { return a.id === id; });
        if (def) {
          Store.logActivity('achievement', 'إنجاز: ' + def.title, { achievement_id: id });
        }
      }
    }

    if (c.done >= 1)     unlock('first_lesson');
    if (c.done >= 10)    unlock('lessons_10');
    if (c.done >= 25)    unlock('lessons_25');
    if (c.done >= 50)    unlock('lessons_50');
    if (c.percent >= 25) unlock('percent_25');
    if (c.percent >= 50) unlock('percent_50');
    if (c.percent >= 75) unlock('percent_75');
    if (c.total > 0 && c.done === c.total) unlock('curriculum_done');

    /* وحدة كاملة */
    const hasUnit = Curriculum.getSubjects().some(function (sub) {
      return sub.units.some(function (u) {
        const uc = unitCounts(sub.id, u.unit_number);
        return uc && uc.total > 0 && uc.done === uc.total;
      });
    });
    if (hasUnit) unlock('first_unit');

    /* مادة كاملة */
    const hasSubject = allSubjectsCounts().some(function (s) {
      return s.total > 0 && s.done === s.total;
    });
    if (hasSubject) unlock('first_subject');

    /* تركيز */
    if (Store.getFocusSessions().length >= 1) unlock('first_focus');

    /* Streak */
    const st = currentStreak();
    if (st >= 3) unlock('streak_3');
    if (st >= 7) unlock('streak_7');

    if (added.length) Store.write(Store.KEYS.ACHIEVEMENTS, owned);
    return added;
  }

  /* ============================================================
     النشاط
     ============================================================ */

  function recentActivity(limit) {
    return Store.getActivity().slice(0, limit || 8);
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    STATUS: STATUS,
    STATUS_LABEL: STATUS_LABEL,
    STATUS_COLOR: STATUS_COLOR,
    ACHIEVEMENTS_DEF: ACHIEVEMENTS_DEF,

    getStatus: getStatus,
    setStatus: setStatus,
    markDone: markDone,
    markInProgress: markInProgress,
    resetLesson: resetLesson,

    lessonCounts: lessonCounts,
    subjectCounts: subjectCounts,
    unitCounts: unitCounts,
    overall: overall,
    allSubjectsCounts: allSubjectsCounts,
    topSubjects: topSubjects,
    weakSubjects: weakSubjects,

    currentStreak: currentStreak,
    totalActiveDays: totalActiveDays,
    lessonsDoneToday: lessonsDoneToday,
    focusSessionsToday: focusSessionsToday,
    dayKey: dayKey,

    getGoals: getGoals,
    goalsWithProgress: goalsWithProgress,
    checkAchievements: checkAchievements,
    recentActivity: recentActivity
  };
})();
