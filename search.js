/* ============================================================
   search.js
   بحث موحّد في المنهج — مواد / وحدات / دروس

   يعتمد على: Curriculum (curriculum.js) + Progress (progress.js)
   ============================================================ */

window.Search = (function () {

  /* ============================================================
     بحث أساسي
     ============================================================ */

  function query(q, limit) {
    limit = limit || 25;
    const raw = String(q || '').trim();

    if (!raw) {
      return { subjects: [], lessons: [], empty: true };
    }

    const res = Curriculum.search(raw, limit);
    return {
      subjects: res.subjects,
      lessons: res.lessons,
      empty: !res.subjects.length && !res.lessons.length
    };
  }

  /* ============================================================
     بحث مُثرى (مع حالة الدرس ونسبة المادة)
     ============================================================ */

  function enriched(q, limit) {
    const r = query(q, limit);

    return {
      subjects: r.subjects.map(function (s) {
        const c = Progress.subjectCounts(s.id);
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          percent: c ? c.percent : 0,
          done: c ? c.done : 0,
          total: c ? c.total : 0
        };
      }),
      lessons: r.lessons.map(function (l) {
        const st = Progress.getStatus(l.lesson_id);
        return {
          lesson_id: l.lesson_id,
          lesson_name: l.lesson_name,
          subject_name: l.subject_name,
          unit_number: l.unit_number,
          unit_name: l.unit_name,
          status: st,
          statusLabel: Progress.STATUS_LABEL[st]
        };
      }),
      empty: r.empty
    };
  }

  /* ============================================================
     بناء HTML للنتائج
     ============================================================ */

  function renderResults(q, opts) {
    opts = opts || {};
    const r = enriched(q);

    if (r.empty) {
      return '<p class="tiny muted">لا نتائج مطابقة.</p>';
    }

    const subjectHits = r.subjects.map(function (s) {
      return '<div class="sr-item" data-subject="' + s.id + '">' +
               '<span class="sr-ico">📚</span>' +
               '<span>' + UI.escape(s.name) + '</span>' +
               '<span class="tiny">' + s.percent + '% · مادة</span>' +
             '</div>';
    }).join('');

    const lessonHits = r.lessons.map(function (l) {
      const ico = l.status === 'done' ? '✓'
                : l.status === 'inprogress' ? '◐'
                : '📘';
      return '<a class="sr-item" href="lesson.html?id=' + encodeURIComponent(l.lesson_id) + '">' +
               '<span class="sr-ico">' + ico + '</span>' +
               '<span>' + UI.escape(l.lesson_name) + '</span>' +
               '<span class="tiny">' + UI.escape(l.subject_name) + ' · و' + l.unit_number + '</span>' +
             '</a>';
    }).join('');

    return subjectHits + lessonHits;
  }

  /* ============================================================
     ربط صندوق بحث بعنصر
     ============================================================ */

  function bind(inputSelector, resultsSelector, opts) {
    opts = opts || {};
    const input = UI.el(inputSelector);
    const box   = UI.el(resultsSelector);
    if (!input || !box) return;

    let timer = null;

    input.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        const q = input.value.trim();
        if (!q) {
          box.classList.add('hidden');
          box.innerHTML = '';
          return;
        }

        box.innerHTML = renderResults(q, opts);
        box.classList.remove('hidden');

        /* النقر على مادة → فتحها في صفحة subjects */
        UI.els('[data-subject]', box).forEach(function (el) {
          el.addEventListener('click', function () {
            const id = el.dataset.subject;
            const target = document.querySelector('#s-' + id);
            if (target) {
              const list = target.querySelector('.units-list');
              if (list) list.hidden = false;
              target.classList.add('open');
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            box.classList.add('hidden');
            input.value = '';
          });
        });
      }, 120);
    });

    /* إغلاق عند الضغط خارج الصندوق */
    document.addEventListener('click', function (e) {
      if (!e.target.closest(inputSelector) && !e.target.closest(resultsSelector)) {
        box.classList.add('hidden');
      }
    });

    /* إغلاق بمفتاح Escape */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        box.classList.add('hidden');
        input.blur();
      }
    });
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    query: query,
    enriched: enriched,
    renderResults: renderResults,
    bind: bind
  };
})();
