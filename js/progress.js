/* ============================================================
   Progress — حالات الدروس + الحسابات + Streak + الأهداف + الإنجازات
   ============================================================ */

const Progress = (() => {

  /* ============================================================
     الحالات
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
     عمليات على درس
     ============================================================ */
  const getStatus = (lessonId) => Store.getLessonStatus(lessonId);

  const setStatus = (lessonId, status, { silent = false } = {}) => {
    const lesson = Curriculum.getLesson(lessonId);
    if (!lesson) return false;

    const prev = Store.getLessonStatus(lessonId);
    if (prev === status) return true;

    Store.setLessonStatus(lessonId, status);

    if (!silent) {
      if (status === STATUS.DONE) {
        Store.logActivity('lesson', `أكملت درس: ${lesson.lesson_name}`, {
          lesson_id: lessonId, subject_id: lesson.subject_id
        });
        touchStreak();
      } else if (status === STATUS.IN_PROGRESS) {
        Store.logActivity('lesson', `بدأت: ${lesson.lesson_name}`, {
          lesson_id: lessonId, subject_id: lesson.subject_id
        });
        touchStreak();
      } else if (status === STATUS.NOT_STARTED && prev === STATUS.DONE) {
        Store.logActivity('lesson', `ألغيت إكمال: ${lesson.lesson_name}`, {
          lesson_id: lessonId, subject_id: lesson.subject_id
        });
      }
    }

    checkAchievements();
    return true;
  };

  const markDone       = (id) => setStatus(id, STATUS.DONE);
  const markInProgress = (id) => setStatus(id, STATUS.IN_PROGRESS);
  const resetLesson    = (id) => setStatus(id, STATUS.NOT_STARTED);

  /* ============================================================
     الحسابات
     ============================================================ */
  const countStatuses = (lessons) => {
    const p = Store.getProgress();
    let done = 0, inprogress = 0, notstarted = 0;
    lessons.forEach(l => {
      const s = p[l.lesson_id]?.status || STATUS.NOT_STARTED;
      if (s === STATUS.DONE) done++;
      else if (s === STATUS.IN_PROGRESS) inprogress++;
      else notstarted++;
    });
    const total = done + inprogress + notstarted;
    return {
      done, inprogress, notstarted, total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100)
    };
  };

  const lessonCounts  = () => countStatuses(Curriculum.getAll());

  const subjectCounts = (subjectId) => {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return null;
    const lessons = [];
    sub.units.forEach(u => u.lessons.forEach(l => lessons.push(l)));
    return { subjectId: sub.id, name: sub.name, ...countStatuses(lessons) };
  };

  const unitCounts = (subjectId, unitNumber) => {
    const sub = Curriculum.getSubject(subjectId);
    if (!sub) return null;
    const unit = sub.units.find(u => u.unit_number === Number(unitNumber));
    if (!unit) return null;
    return {
      unitNumber: unit.unit_number, name: unit.name,
      ...countStatuses(unit.lessons)
    };
  };

  const overall = () => lessonCounts();

  const allSubjectsCounts = () =>
    Curriculum.getSubjects().map(s => subjectCounts(s.id)).filter(Boolean);

  const topSubjects = (n = 3) =>
    allSubjectsCounts()
      .filter(s => s.total > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, n);

  const weakSubjects = (n = 3) =>
    allSubjectsCounts()
      .filter(s => s.total > 0)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, n);

  /* ============================================================
     Streak
     ============================================================ */
  const dayKey = (ts = Date.now()) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const readStreak = () => Store.read(Store.KEYS.STREAK, { days: [] });

  const touchStreak = () => {
    const s = readStreak();
    const today = dayKey();
    if (!s.days.includes(today)) {
      s.days.push(today);
      s.days = s.days.slice(-180);
      Store.write(Store.KEYS.STREAK, s);
    }
  };

  const currentStreak = () => {
    const s = readStreak();
    if (!s.days.length) return 0;

    const set = new Set(s.days);
    let streak = 0;
    const cursor = new Date();

    if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

    while (set.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const totalActiveDays = () => readStreak().days.length;

  /* ============================================================
     الأهداف
     ============================================================ */
  const DEFAULT_GOALS = [
    { id: 'g-lessons-1',  type: 'lessons_today', target: 1, label: 'أنجز درسًا واحدًا اليوم' },
    { id: 'g-lessons-3',  type: 'lessons_today', target: 3, label: 'أنجز 3 دروس اليوم' },
    { id: 'g-focus-1',    type: 'focus_today',   target: 1, label: 'نفّذ جلسة تركيز واحدة' },
    { id: 'g-streak-3',   type: 'streak',        target: 3, label: 'حافظ على سلسلة 3 أيام' }
  ];

  const getGoals = () => {
    const saved = Store.getGoals();
    return saved.length ? saved : DEFAULT_GOALS;
  };

  const lessonsDoneToday = () => {
    const today = dayKey();
    const p = Store.getProgress();
    return Object.values(p).filter(x =>
      x.status === STATUS.DONE && dayKey(x.updatedAt) === today
    ).length;
  };

  const focusSessionsToday = () => {
    const today = dayKey();
    return Store.getFocusSessions().filter(s => dayKey(s.at) === today).length;
  };

  const goalProgress = (goal) => {
    switch (goal.type) {
      case 'lessons_today': return Math.min(lessonsDoneToday(), goal.target);
      case 'focus_today':   return Math.min(focusSessionsToday(), goal.target);
      case 'streak':        return Math.min(currentStreak(), goal.target);
      default:              return 0;
    }
  };

  const goalsWithProgress = () =>
    getGoals().map(g => ({
      ...g,
      value: goalProgress(g),
      achieved: goalProgress(g) >= g.target
    }));

  /* ============================================================
     الإنجازات (المنطق هنا، العرض في achievements.js)
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

  const readAchievements = () => Store.read(Store.KEYS.ACHIEVEMENTS, {});

  const checkAchievements = () => {
    const owned = readAchievements();
    const c = lessonCounts();
    const added = [];

    const unlock = (id) => {
      if (!owned[id]) {
        owned[id] = Date.now();
        added.push(id);
        const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
        if (def) Store.logActivity('achievement', `إنجاز: ${def.title}`, { achievement_id: id });
      }
    };

    if (c.done >= 1)  unlock('first_lesson');
    if (c.done >= 10) unlock('lessons_10');
    if (c.done >= 25) unlock('lessons_25');
    if (c.done >= 50) unlock('lessons_50');
    if (c.percent >= 25) unlock('percent_25');
    if (c.percent >= 50) unlock('percent_50');
    if (c.percent >= 75) unlock('percent_75');
    if (c.done === c.total && c.total > 0) unlock('curriculum_done');

    const hasUnit = Curriculum.getSubjects().some(sub =>
      sub.units.some(u => {
        const uc = unitCounts(sub.id, u.unit_number);
        return uc && uc.total > 0 && uc.done === uc.total;
      })
    );
    if (hasUnit) unlock('first_unit');

    const hasSubject = allSubjectsCounts().some(s => s.total > 0 && s.done === s.total);
    if (hasSubject) unlock('first_subject');

    if (Store.getFocusSessions().length >= 1) unlock('first_focus');

    const st = currentStreak();
    if (st >= 3) unlock('streak_3');
    if (st >= 7) unlock('streak_7');

    if (added.length) Store.write(Store.KEYS.ACHIEVEMENTS, owned);
    return added;
  };

  /* ============================================================
     النشاط
     ============================================================ */
  const recentActivity = (limit = 8) => Store.getActivity().slice(0, limit);

  /* ============================================================
     التصدير
     ============================================================ */
  return {
    STATUS, STATUS_LABEL, STATUS_COLOR,
    ACHIEVEMENTS_DEF,

    getStatus, setStatus, markDone, markInProgress, resetLesson,

    lessonCounts, subjectCounts, unitCounts, overall,
    allSubjectsCounts, topSubjects, weakSubjects,

    currentStreak, totalActiveDays,
    lessonsDoneToday, focusSessionsToday, dayKey,

    getGoals, goalsWithProgress,
    checkAchievements,
    recentActivity
  };
})();
