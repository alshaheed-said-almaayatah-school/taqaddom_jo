/* ============================================================
   curriculum.js
   طبقة قراءة موحّدة فوق data.js
   لا صفحة تقرأ CURRICULUM_DATA مباشرة

   يعتمد على: data.js (window.CURRICULUM_DATA)
   ============================================================ */

window.Curriculum = (function () {

  let tree = null;

  /* ============================================================
     بناء الشجرة (مرة واحدة)
     ============================================================ */
  function build() {
    if (tree) return tree;

    const raw = window.CURRICULUM_DATA || {};
    const rawSubjects = raw.subjects || [];

    const subjects = rawSubjects.map(function (sub) {
      let lessonsCount = 0;

      const units = (sub.units || []).map(function (u) {
        lessonsCount += (u.lessons || []).length;

        return {
          unit_number: u.unit_number,
          name: u.name,
          lessonsCount: (u.lessons || []).length,
          lessons: (u.lessons || []).map(function (lessonName, i) {
            return {
              lesson_id: sub.id + '-' + u.unit_number + '-' + (i + 1),
              lesson_number: i + 1,
              lesson_name: lessonName,
              subject_id: sub.id,
              subject_name: sub.name,
              unit_number: u.unit_number,
              unit_name: u.name
            };
          })
        };
      });

      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        unitsCount: units.length,
        lessonsCount: lessonsCount,
        units: units
      };
    });

    /* قائمة مسطّحة لكل الدروس */
    const flatLessons = [];
    const byLessonId  = new Map();
    const bySubjectId = new Map();

    subjects.forEach(function (sub) {
      bySubjectId.set(sub.id, sub);
      sub.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          flatLessons.push(l);
          byLessonId.set(l.lesson_id, l);
        });
      });
    });

    tree = {
      meta: raw.meta || {},
      subjects: subjects,
      flatLessons: flatLessons,
      indexes: {
        byLessonId: byLessonId,
        bySubjectId: bySubjectId
      },
      stats: {
        totalSubjects: subjects.length,
        totalUnits: subjects.reduce(function (s, x) { return s + x.unitsCount; }, 0),
        totalLessons: flatLessons.length
      }
    };

    return tree;
  }

  /* ============================================================
     الوصول للبيانات
     ============================================================ */

  function get()         { return build(); }
  function getMeta()     { return build().meta; }
  function getSubjects() { return build().subjects; }
  function getAll()      { return build().flatLessons; }
  function getStats()    { return build().stats; }

  function getSubject(id) {
    return build().indexes.bySubjectId.get(Number(id)) || null;
  }

  function getLesson(id) {
    return build().indexes.byLessonId.get(id) || null;
  }

  /* ============================================================
     التنقل بين الدروس
     ============================================================ */

  function getNextLesson(lessonId) {
    const all = build().flatLessons;
    const i = all.findIndex(function (l) { return l.lesson_id === lessonId; });
    if (i < 0 || i >= all.length - 1) return null;
    return all[i + 1];
  }

  function getPrevLesson(lessonId) {
    const all = build().flatLessons;
    const i = all.findIndex(function (l) { return l.lesson_id === lessonId; });
    if (i <= 0) return null;
    return all[i - 1];
  }

  /* ============================================================
     تطبيع النص العربي (للبحث)
     ============================================================ */

  function normalize(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
  }

  /* ============================================================
     البحث
     ============================================================ */

  function search(query, limit) {
    limit = limit || 25;
    const q = normalize(query);
    if (!q) return { subjects: [], lessons: [] };

    const subjectsHit = build().subjects
      .filter(function (s) { return normalize(s.name).indexOf(q) !== -1; })
      .slice(0, limit);

    const lessonsHit = build().flatLessons
      .filter(function (l) {
        return normalize(l.lesson_name).indexOf(q) !== -1 ||
               normalize(l.unit_name).indexOf(q) !== -1 ||
               normalize(l.subject_name).indexOf(q) !== -1;
      })
      .slice(0, limit);

    return { subjects: subjectsHit, lessons: lessonsHit };
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    get: get,
    getMeta: getMeta,
    getSubjects: getSubjects,
    getSubject: getSubject,
    getLesson: getLesson,
    getAll: getAll,
    getStats: getStats,
    getNextLesson: getNextLesson,
    getPrevLesson: getPrevLesson,
    search: search,
    normalize: normalize
  };
})();
