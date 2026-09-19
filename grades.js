/* ============================================================
   grades.js
   المعدل الدراسي + الهدف + التحفيز
   ⚠️ يعتمد على Store + Curriculum + UI
   ============================================================ */

window.Grades = (function () {

  /* ============================================================
     قراءة/حفظ العلامات
     ============================================================ */
  function getData() {
    const g = Store.getGrades();
    return {
      subjects: g.subjects || {},
      target: g.target || 90
    };
  }

  async function saveSubjectGrade(subjectId, grade) {
    const g = getData();
    const value = grade === '' ? null : Math.max(0, Math.min(100, Number(grade)));
    if (value === null) delete g.subjects[subjectId];
    else g.subjects[subjectId] = value;
    await Store.setGrades(g);
  }

  async function saveTarget(target) {
    const g = getData();
    const value = Math.max(0, Math.min(100, Number(target) || 90));
    g.target = value;
    await Store.setGrades(g);
  }

  /* ============================================================
     الحسابات
     ============================================================ */
  function computeAverage() {
    const g = getData();
    const grades = Object.keys(g.subjects)
      .map(function (k) { return g.subjects[k]; })
      .filter(function (v) { return typeof v === 'number' && v > 0; });

    if (!grades.length) return 0;
    const sum = grades.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / grades.length) * 10) / 10;
  }

  function computeGap() {
    const g = getData();
    const avg = computeAverage();
    if (!avg) return { gap: 0, message: 'أدخل علاماتك لحساب الفجوة', status: 'unknown' };

    const gap = Math.round((g.target - avg) * 10) / 10;

    let message = '';
    let status = '';

    if (gap <= -5) {
      status = 'excellent';
      message = '🎉 رائع! معدلك يتجاوز هدفك بـ ' + Math.abs(gap) + ' درجة. حافظ على هذا المستوى!';
    } else if (gap <= 0) {
      status = 'good';
      message = '👏 ممتاز! وصلت إلى هدفك. لا تتوقف الآن.';
    } else if (gap <= 5) {
      status = 'close';
      message = '💪 أنت قريب جدًا من هدفك — يفصلك ' + gap + ' درجة فقط. زد جهدك قليلًا!';
    } else if (gap <= 15) {
      status = 'mid';
      message = '🎯 يفصلك ' + gap + ' درجة عن هدفك. ركّز على المواد الأقل درجة.';
    } else {
      status = 'far';
      message = '🚀 أنت بحاجة إلى ' + gap + ' درجة — لا تقلق، خطوة كل يوم تكفي!';
    }

    return { gap, message, status, avg, target: g.target };
  }

  /* ============================================================
     عرض صفحة المعدل
     ============================================================ */
  function render(avgSelector, gapSelector, subjectsSelector, targetSelector) {
    const g = getData();
    const avg = computeAverage();
    const gapInfo = computeGap();

    /* المعدل */
    const avgEl = UI.el(avgSelector);
    if (avgEl) avgEl.textContent = avg ? avg.toFixed(1) : '—';

    /* الفجوة */
    const gapEl = UI.el(gapSelector);
    if (gapEl) {
      gapEl.innerHTML =
        '<div class="motivation-card ' + (gapInfo.status === 'excellent' || gapInfo.status === 'good' ? 'goal-done' : '') + '">' +
          '<span class="motivation-ico">' + iconForStatus(gapInfo.status) + '</span>' +
          '<div class="grow">' +
            '<p class="mb-0">' + gapInfo.message + '</p>' +
          '</div>' +
        '</div>';
    }

    /* الهدف */
    const targetEl = UI.el(targetSelector);
    if (targetEl) targetEl.value = g.target;

    /* المواد */
    const root = UI.el(subjectsSelector);
    if (!root) return;

    const subjects = Curriculum.getSubjects();
    root.innerHTML = subjects.map(function (s) {
      const val = g.subjects[s.id] != null ? g.subjects[s.id] : '';
      return '<div class="grade-subject-row">' +
        '<span class="grade-subject-name">' + UI.escape(s.name) + '</span>' +
        '<input type="number" class="grade-subject-input" ' +
               'min="0" max="100" step="0.5" ' +
               'placeholder="—" ' +
               'value="' + val + '" ' +
               'data-subject-id="' + s.id + '" />' +
      '</div>';
    }).join('');

    /* ربط الحقول */
    UI.els('[data-subject-id]', root).forEach(function (input) {
      let timer = null;
      input.addEventListener('input', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async function () {
          await saveSubjectGrade(input.dataset.subjectId, input.value);
          updateDisplay(avgSelector, gapSelector);
        }, 500);
      });
    });

    /* ربط هدف المعدل */
    if (targetEl) {
      targetEl.addEventListener('input', async function () {
        await saveTarget(targetEl.value);
        updateDisplay(avgSelector, gapSelector);
      });
    }

    updateProgressBar(avg, g.target);
  }

  function updateDisplay(avgSelector, gapSelector) {
    const avg = computeAverage();
    const gapInfo = computeGap();

    const avgEl = UI.el(avgSelector);
    if (avgEl) avgEl.textContent = avg ? avg.toFixed(1) : '—';

    const gapEl = UI.el(gapSelector);
    if (gapEl) {
      gapEl.innerHTML =
        '<div class="motivation-card ' + (gapInfo.status === 'excellent' || gapInfo.status === 'good' ? 'goal-done' : '') + '">' +
          '<span class="motivation-ico">' + iconForStatus(gapInfo.status) + '</span>' +
          '<div class="grow">' +
            '<p class="mb-0">' + gapInfo.message + '</p>' +
          '</div>' +
        '</div>';
    }

    updateProgressBar(avg, gapInfo.target || 90);
  }

  function updateProgressBar(avg, target) {
    const bar = document.getElementById('gradeBar');
    const labels = document.getElementById('gradeLabels');
    if (!bar) return;

    const pct = target > 0 ? Math.min(100, Math.round((avg / target) * 100)) : 0;
    bar.style.width = pct + '%';

    if (labels) {
      labels.innerHTML =
        '<span>معدلك: ' + (avg ? avg.toFixed(1) : '—') + '</span>' +
        '<span>هدفك: ' + target + '</span>';
    }
  }

  function iconForStatus(status) {
    switch (status) {
      case 'excellent': return '🎉';
      case 'good':      return '👏';
      case 'close':     return '💪';
      case 'mid':       return '🎯';
      case 'far':       return '🚀';
      default:          return '📊';
    }
  }

  /* ============================================================
     تهيئة
     ============================================================ */
  function init(opts) {
    opts = opts || {};
    if (!UI.el(opts.subjectsSelector || '#gradesSubjects')) return;
    render(
      opts.avgSelector || '#gradeAverage',
      opts.gapSelector || '#gradeGap',
      opts.subjectsSelector || '#gradesSubjects',
      opts.targetSelector || '#gradeTarget'
    );
  }

  return {
    getData: getData,
    computeAverage: computeAverage,
    computeGap: computeGap,
    render: render,
    init: init
  };
})();
