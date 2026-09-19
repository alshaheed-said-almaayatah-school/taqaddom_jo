/* ============================================================
   exams.js
   الامتحانات + العدّاد التنازلي
   ⚠️ يعتمد على Store + Progress + Curriculum + UI
   ============================================================ */

window.Exams = (function () {

  let tickInterval = null;

  /* ============================================================
     حساب الوقت المتبقي
     ============================================================ */
  function timeLeft(dateStr) {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { past: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { past: false, days, hours, minutes, seconds, total: diff };
  }

  function urgency(dateStr) {
    const t = timeLeft(dateStr);
    if (t.past) return 'past';
    if (t.days < 1) return 'urgent';
    if (t.days <= 3) return 'soon';
    return 'normal';
  }

  /* ============================================================
     عرض قائمة الامتحانات
     ============================================================ */
  function render(containerSelector) {
    const root = UI.el(containerSelector);
    if (!root) return;

    const list = Store.getExams() || [];
    list.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (!list.length) {
      root.innerHTML =
        '<div class="empty-state">' +
          '<span class="empty-ico">📅</span>' +
          '<p>لا توجد امتحانات قادمة — أضف أول امتحان أعلاه.</p>' +
        '</div>';
      return;
    }

    root.innerHTML = list.map(function (ex) {
      const t = timeLeft(ex.date);
      const u = urgency(ex.date);
      const dateObj = new Date(ex.date);
      const dateStr = new Intl.DateTimeFormat('ar', {
        dateStyle: 'full', timeStyle: 'short'
      }).format(dateObj);

      let countdown = '';
      if (t.past) {
        countdown = '<p class="exam-date" style="color:var(--text-3)">✅ انتهى</p>';
      } else {
        countdown =
          '<div class="exam-countdown">' +
            '<div class="countdown-cell"><span class="countdown-num" data-days="' + ex.id + '">' + t.days + '</span><span class="countdown-lbl">يوم</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-hours="' + ex.id + '">' + String(t.hours).padStart(2, '0') + '</span><span class="countdown-lbl">ساعة</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-minutes="' + ex.id + '">' + String(t.minutes).padStart(2, '0') + '</span><span class="countdown-lbl">دقيقة</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-seconds="' + ex.id + '">' + String(t.seconds).padStart(2, '0') + '</span><span class="countdown-lbl">ثانية</span></div>' +
          '</div>';
      }

      return '<div class="exam-item ' + u + '" data-exam-id="' + ex.id + '">' +
        '<div class="exam-head">' +
          '<div class="grow">' +
            '<h3 class="exam-title">' + UI.escape(ex.title) + '</h3>' +
            (ex.subject ? '<span class="exam-subject">📚 ' + UI.escape(ex.subject) + '</span>' : '') +
          '</div>' +
          '<button class="exam-delete" data-delete="' + ex.id + '" title="حذف" type="button">🗑️</button>' +
        '</div>' +
        countdown +
        '<p class="exam-date">📅 ' + UI.escape(dateStr) + '</p>' +
        (ex.notes ? '<p class="exam-notes">' + UI.escape(ex.notes) + '</p>' : '') +
      '</div>';
    }).join('');

    /* ربط أزرار الحذف */
    UI.els('[data-delete]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.dataset.delete;
        const ok = await UI.confirm({
          title: 'حذف الامتحان',
          message: 'هل تريد حذف هذا الامتحان؟',
          okText: 'حذف',
          cancelText: 'إلغاء',
          danger: true
        });
        if (!ok) return;
        await Store.deleteExam(id);
        UI.toast('تم حذف الامتحان', 'warning');
        render(containerSelector);
      });
    });
  }

  /* ============================================================
     تحديث العدّاد كل ثانية
     ============================================================ */
  function startTicker(containerSelector) {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(function () {
      const list = Store.getExams() || [];
      list.forEach(function (ex) {
        const t = timeLeft(ex.date);
        if (t.past) return;

        const dEl = document.querySelector('[data-days="' + ex.id + '"]');
        const hEl = document.querySelector('[data-hours="' + ex.id + '"]');
        const mEl = document.querySelector('[data-minutes="' + ex.id + '"]');
        const sEl = document.querySelector('[data-seconds="' + ex.id + '"]');

        if (dEl) dEl.textContent = t.days;
        if (hEl) hEl.textContent = String(t.hours).padStart(2, '0');
        if (mEl) mEl.textContent = String(t.minutes).padStart(2, '0');
        if (sEl) sEl.textContent = String(t.seconds).padStart(2, '0');
      });
    }, 1000);
  }

  /* ============================================================
     النموذج — إضافة امتحان
     ============================================================ */
  function bindForm(formSelector, containerSelector) {
    const form = UI.el(formSelector);
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const title   = form.querySelector('[name="examTitle"]').value.trim();
      const subject = form.querySelector('[name="examSubject"]').value.trim();
      const date    = form.querySelector('[name="examDate"]').value;
      const notes   = form.querySelector('[name="examNotes"]').value.trim();

      if (!title) { UI.toast('أدخل اسم الامتحان', 'warning'); return; }
      if (!date)  { UI.toast('أدخل تاريخ الامتحان', 'warning'); return; }

      await Store.addExam({
        title: title,
        subject: subject,
        date: date,
        notes: notes
      });
      await Store.logActivity('exam', 'أضفت امتحانًا: ' + title, { title: title });
      UI.toast('تمت إضافة الامتحان ✅', 'success');
      form.reset();
      render(containerSelector);
      startTicker(containerSelector);
    });
  }

  /* ============================================================
     تهيئة الصفحة
     ============================================================ */
  function init(formSelector, containerSelector) {
    if (!UI.el(containerSelector)) return;
    render(containerSelector);
    startTicker(containerSelector);
    bindForm(formSelector, containerSelector);
  }

  return {
    timeLeft: timeLeft,
    urgency: urgency,
    render: render,
    startTicker: startTicker,
    bindForm: bindForm,
    init: init
  };
})();
