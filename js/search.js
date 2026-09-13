/* ============================================================
   Search — بحث موحّد في المنهج (مواد / وحدات / دروس)
   يعتمد على Curriculum.search + Progress للحالة.
   ============================================================ */

const Search = (() => {

  /* ---------- بحث سريع ---------- */
  const query = (q, limit = 25) => {
    const raw = String(q || '').trim();
    if (!raw) return { subjects: [], lessons: [], empty: true };

    const res = Curriculum.search(raw, limit);
    return {
      subjects: res.subjects,
      lessons:  res.lessons,
      empty:    !res.subjects.length && !res.lessons.length
    };
  };

  /* ---------- نتيجة مع حالة الدرس ---------- */
  const enriched = (q, limit = 25) => {
    const r = query(q, limit);
    return {
      subjects: r.subjects.map(s => {
        const c = Progress.subjectCounts(s.id);
        return { ...s, ...c };
      }),
      lessons: r.lessons.map(l => ({
        ...l,
        status: Progress.getStatus(l.lesson_id),
        statusLabel: Progress.STATUS_LABEL[Progress.getStatus(l.lesson_id)]
      })),
      empty: r.empty
    };
  };

  /* ---------- بناء HTML لصندوق النتائج ---------- */
  const renderResults = (q, { basePath = '' } = {}) => {
    const r = enriched(q);

    if (r.empty) {
      return `<p class="tiny muted">لا نتائج مطابقة.</p>`;
    }

    const subjectHits = r.subjects.map(s =>
      `<div class="sr-item" data-subject="${s.id}">
         <span class="sr-ico">📚</span>
         <span>${UI.escape(s.name)}</span>
         <span class="tiny">${s.percent}% · مادة</span>
       </div>`
    ).join('');

    const lessonHits = r.lessons.map(l => {
      const ico = l.status === 'done' ? '✓' : l.status === 'inprogress' ? '◐' : '📘';
      return `
        <a class="sr-item" href="${basePath}lesson.html?id=${encodeURIComponent(l.lesson_id)}">
          <span class="sr-ico">${ico}</span>
          <span>${UI.escape(l.lesson_name)}</span>
          <span class="tiny">${UI.escape(l.subject_name)} · و${l.unit_number}</span>
        </a>`;
    }).join('');

    return subjectHits + lessonHits;
  };

  /* ---------- تفعيل صندوق بحث على عنصر ---------- */
  const bind = (inputSelector, resultsSelector, { basePath = '' } = {}) => {
    const input = UI.el(inputSelector);
    const box   = UI.el(resultsSelector);
    if (!input || !box) return;

    let timer = null;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = input.value.trim();
        if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }

        box.innerHTML = renderResults(q, { basePath });
        box.classList.remove('hidden');

        // النقر على مادة → فتحها
        UI.els('[data-subject]', box).forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.subject;
            const target = document.querySelector(`#s-${id}`);
            box.classList.add('hidden');
            input.value = '';
            if (target) {
              const list = target.querySelector('.units-list');
              if (list) list.hidden = false;
              target.classList.add('open');
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
      }, 120);
    });

    // إغلاق عند الضغط خارج
    document.addEventListener('click', (e) => {
      if (!e.target.closest(inputSelector) && !e.target.closest(resultsSelector)) {
        box.classList.add('hidden');
      }
    });
  };

  return { query, enriched, renderResults, bind };
})();
