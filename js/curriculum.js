/* ============================================================
   Curriculum — طبقة قراءة موحّدة فوق data.js
   لا صفحة تقرأ CURRICULUM_DATA مباشرة.
   ============================================================ */

const Curriculum = (() => {

  let tree = null;

  const build = () => {
    if (tree) return tree;

    const subjects = (window.CURRICULUM_DATA?.subjects || []).map(sub => {
      let lessonsCount = 0;
      const units = sub.units.map(u => {
        lessonsCount += u.lessons.length;
        return {
          unit_number: u.unit_number,
          name: u.name,
          lessonsCount: u.lessons.length,
          lessons: u.lessons.map((name, i) => ({
            lesson_id: `${sub.id}-${u.unit_number}-${i + 1}`,
            lesson_number: i + 1,
            lesson_name: name,
            subject_id: sub.id,
            subject_name: sub.name,
            unit_number: u.unit_number,
            unit_name: u.name
          }))
        };
      });
      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        unitsCount: units.length,
        lessonsCount,
        units
      };
    });

    const flatLessons = [];
    const byLessonId = new Map();
    const bySubjectId = new Map();

    subjects.forEach(sub => {
      bySubjectId.set(sub.id, sub);
      sub.units.forEach(u => {
        u.lessons.forEach(l => {
          flatLessons.push(l);
          byLessonId.set(l.lesson_id, l);
        });
      });
    });

    tree = {
      meta: window.CURRICULUM_DATA?.meta || {},
      subjects,
      flatLessons,
      indexes: { byLessonId, bySubjectId },
      stats: {
        totalSubjects: subjects.length,
        totalUnits: subjects.reduce((s, x) => s + x.unitsCount, 0),
        totalLessons: flatLessons.length
      }
    };
    return tree;
  };

  /* ---------- Accessors ---------- */
  const get         = () => build();
  const getMeta     = () => build().meta;
  const getSubjects = () => build().subjects;
  const getSubject  = (id) => build().indexes.bySubjectId.get(Number(id)) || null;
  const getLesson   = (id) => build().indexes.byLessonId.get(id) || null;
  const getAll      = () => build().flatLessons;
  const getStats    = () => build().stats;

  const getNextLesson = (lessonId) => {
    const all = build().flatLessons;
    const i = all.findIndex(l => l.lesson_id === lessonId);
    return (i >= 0 && i < all.length - 1) ? all[i + 1] : null;
  };

  const getPrevLesson = (lessonId) => {
    const all = build().flatLessons;
    const i = all.findIndex(l => l.lesson_id === lessonId);
    return (i > 0) ? all[i - 1] : null;
  };

  /* ---------- Normalization for search ---------- */
  const normalize = (s) => String(s || '')
    .trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');

  /* ---------- Search ---------- */
  const search = (query, limit = 25) => {
    const q = normalize(query);
    if (!q) return { subjects: [], lessons: [] };

    const subjectsHit = build().subjects
      .filter(s => normalize(s.name).includes(q))
      .slice(0, limit);

    const lessonsHit = build().flatLessons
      .filter(l =>
        normalize(l.lesson_name).includes(q) ||
        normalize(l.unit_name).includes(q) ||
        normalize(l.subject_name).includes(q)
      )
      .slice(0, limit);

    return { subjects: subjectsHit, lessons: lessonsHit };
  };

  return {
    get, getMeta, getSubjects, getSubject, getLesson, getAll, getStats,
    getNextLesson, getPrevLesson, search, normalize
  };
})();
