/* ============================================================
   statistics.js
   تحليل مستوى الطالب — قراءة فقط
   ⚠️ يعتمد على Store + Curriculum + Progress + Achievements
   ============================================================ */

window.Statistics = (function () {

  function snapshot() {
    const overall = Progress.overall();
    const subjects = Progress.allSubjectsCounts();
    const top = Progress.topSubjects(3);
    const weak = Progress.weakSubjects(3);
    const goals = Progress.goalsWithProgress();
    const focusList = Store.getFocusSessions();

    return {
      overall: overall,
      subjects: subjects,
      top: top,
      weak: weak,
      streak: Progress.currentStreak(),
      activeDays: Progress.totalActiveDays(),
      lessonsToday: Progress.lessonsDoneToday(),
      focusToday: Progress.focusSessionsToday(),
      focusTotal: focusList.length,
      focusMinutes: focusList.reduce(function (s, x) { return s + (Number(x.duration) || 0); }, 0),
      goals: goals,
      goalsDone: goals.filter(function (g) { return g.achieved; }).length,
      achievements: Achievements.count(),
      activity: Store.getActivity(),
      curriculum: Curriculum.getStats()
    };
  }

  /* ============================================================
     مستوى الطالب
     ============================================================ */
  function studentLevel() {
    const c = Progress.overall();
    const s = Progress.currentStreak();
    const focus = Store.getFocusSessions().length;

    let level = 'مبتدئ';
    let icon = '🌱';
    let msg = 'ابدأ بأول درس — كل رحلة تبدأ بخطوة.';
    let color = 'warning';

    if (c.percent >= 90) {
      level = 'مكتمل تقريبًا'; icon = '🎉';
      msg = 'أنت على وشك إنهاء المنهج — واصل!';
      color = 'success';
    } else if (c.percent >= 70) {
      level = 'متميّز'; icon = '🥇';
      msg = 'مستوى عالٍ — حافظ على الإيقاع.';
      color = 'success';
    } else if (c.percent >= 40) {
      level = 'متقدّم'; icon = '🚀';
      msg = 'تقدمك جيد — ركّز على الدروس المتبقية.';
      color = 'success';
    } else if (c.percent >= 15) {
      level = 'نشيط'; icon = '📈';
      msg = 'بدأت بشكل جيد — زد درسًا كل يوم.';
      color = 'info';
    } else if (c.done > 0) {
      level = 'مبتدئ'; icon = '🌱';
      msg = 'خطوة أولى جيدة — استمر يوميًا.';
      color = 'info';
    }

    return {
      level, icon, message: msg, color,
      percent: c.percent, streak: s, focus
    };
  }

  /* ============================================================
     نشاط الأسبوع
     ============================================================ */
  function weekActivity() {
    const days = [];
    const activity = Store.getActivity();
    const names = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = Progress.dayKey(d);
      const count = activity.filter(function (a) { return Progress.dayKey(a.at) === key; }).length;

      days.push({
        key: key,
        date: d,
        weekday: names[d.getDay()],
        count: count
      });
    }
    return days;
  }

  /* ============================================================
     توزيع حالات الدروس
     ============================================================ */
  function distribution() {
    const c = Progress.overall();
    const t = c.total || 1;
    return {
      done:       { count: c.done,       percent: Math.round((c.done       / t) * 100) },
      inprogress: { count: c.inprogress, percent: Math.round((c.inprogress / t) * 100) },
      notstarted: { count: c.notstarted, percent: Math.round((c.notstarted / t) * 100) }
    };
  }

  /* ============================================================
     توصيات ذكية
     ============================================================ */
  function recommendations() {
    const recs = [];
    const c = Progress.overall();
    const s = Progress.currentStreak();
    const subjects = Progress.allSubjectsCounts();
    const focus = Store.getFocusSessions().length;

    if (c.done === 0)
      recs.push({ icon: '🚀', text: 'ابدأ بأول درس الآن — حتى درس واحد يكسر الحاجز.' });

    if (s === 0 && c.done > 0)
      recs.push({ icon: '🔥', text: 'لم تدرس اليوم — خصص 25 دقيقة لاستعادة السلسلة.' });

    if (c.inprogress >= 3)
      recs.push({ icon: '◐', text: 'لديك ' + c.inprogress + ' دروس في المنتصف — أكمل أحدها لتقدم فوري.' });

    const zeroSubjects = subjects.filter(function (x) { return x.done === 0 && x.total > 0; });
    if (zeroSubjects.length > 0)
      recs.push({
        icon: '📚',
        text: 'لم تبدأ بعد في: ' + zeroSubjects.slice(0, 3).map(function (x) { return x.name; }).join('، ') + '.'
      });

    if (focus === 0)
      recs.push({ icon: '🧠', text: 'جرّب جلسة Pomodoro واحدة — 25 دقيقة قد تغير يومك.' });

    if (c.percent >= 50 && c.percent < 100)
      recs.push({ icon: '🎯', text: 'تجاوزت المنتصف — ركّز على المواد الأقل تقدمًا.' });

    if (c.percent === 100)
      recs.push({ icon: '🎉', text: 'أكملت المنهج بالكامل — إنجاز رائع!' });

    if (recs.length === 0)
      recs.push({ icon: '✨', text: 'استمر على هذا الإيقاع — أنت تسير بشكل ممتاز.' });

    return recs;
  }

  /* ============================================================
     ترتيب المواد
     ============================================================ */
  function subjectsSorted(by) {
    const list = Progress.allSubjectsCounts().slice();
    if (by === 'weak') list.sort(function (a, b) { return a.percent - b.percent; });
    else list.sort(function (a, b) { return b.percent - a.percent; });
    return list;
  }

  return {
    snapshot: snapshot,
    studentLevel: studentLevel,
    weekActivity: weekActivity,
    distribution: distribution,
    recommendations: recommendations,
    subjectsSorted: subjectsSorted
  };
})();
