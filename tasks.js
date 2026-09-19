/* ============================================================
   tasks.js
   قائمة المهام (To-Do)
   ⚠️ يعتمد على Store + UI
   ============================================================ */

window.Tasks = (function () {

  let currentFilter = 'all'; // all | active | done

  /* ============================================================
     عرض قائمة المهام
     ============================================================ */
  function render(containerSelector) {
    const root = UI.el(containerSelector);
    if (!root) return;

    let list = Store.getTasks() || [];

    // فلترة
    if (currentFilter === 'active') list = list.filter(function (t) { return !t.done; });
    else if (currentFilter === 'done') list = list.filter(function (t) { return t.done; });

    if (!list.length) {
      const msg = currentFilter === 'done'
        ? 'لا توجد مهام مكتملة بعد.'
        : currentFilter === 'active'
          ? 'لا مهام نشطة — أضف مهمة جديدة!'
          : 'لا توجد مهام — أضف أول مهمة أعلاه.';
      root.innerHTML =
        '<div class="empty-state">' +
          '<span class="empty-ico">✅</span>' +
          '<p>' + msg + '</p>' +
        '</div>';
      return;
    }

    const priorityLabel = { low: 'منخفضة', normal: 'عادية', high: 'عالية' };

    root.innerHTML = list.map(function (t) {
      const pr = t.priority || 'normal';
      return '<div class="task-item ' + (t.done ? 'done' : '') + '" data-task-id="' + t.id + '">' +
        '<button class="task-check" data-toggle="' + t.id + '" type="button" aria-label="إكمال">✓</button>' +
        '<div class="task-body">' +
          '<p class="task-text">' + UI.escape(t.text) + '</p>' +
          '<div class="task-meta">' +
            '<span class="task-priority ' + pr + '">' + priorityLabel[pr] + '</span>' +
            (t.done && t.doneAt ? '<span>أُنجزت ' + UI.fmtRelative(t.doneAt) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<button class="task-delete" data-delete="' + t.id + '" type="button" title="حذف">🗑️</button>' +
      '</div>';
    }).join('');

    /* ربط أزرار الإكمال */
    UI.els('[data-toggle]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        await Store.toggleTask(btn.dataset.toggle);
        const t = (Store.getTasks() || []).find(function (x) { return x.id === btn.dataset.toggle; });
        if (t && t.done) {
          await Store.logActivity('task', 'أنجزت مهمة: ' + t.text, { task_id: t.id });
        }
        render(containerSelector);
      });
    });

    /* ربط أزرار الحذف */
    UI.els('[data-delete]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const ok = await UI.confirm({
          title: 'حذف المهمة',
          message: 'هل تريد حذف هذه المهمة؟',
          okText: 'حذف',
          cancelText: 'إلغاء',
          danger: true
        });
        if (!ok) return;
        await Store.deleteTask(btn.dataset.delete);
        UI.toast('تم حذف المهمة', 'warning');
        render(containerSelector);
      });
    });
  }

  /* ============================================================
     النموذج — إضافة مهمة
     ============================================================ */
  function bindForm(formSelector, containerSelector) {
    const form = UI.el(formSelector);
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const textEl = form.querySelector('[name="taskText"]');
      const prEl   = form.querySelector('[name="taskPriority"]');
      const text = textEl ? textEl.value.trim() : '';
      const priority = prEl ? prEl.value : 'normal';

      if (!text) { UI.toast('أدخل نص المهمة', 'warning'); return; }

      await Store.addTask({ text: text, priority: priority });
      UI.toast('تمت إضافة المهمة ✅', 'success');
      if (textEl) textEl.value = '';
      if (prEl) prEl.value = 'normal';
      render(containerSelector);
    });
  }

  /* ============================================================
     الفلاتر
     ============================================================ */
  function bindFilters(containerSelector) {
    UI.els('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentFilter = btn.dataset.filter;
        UI.els('[data-filter]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.filter === currentFilter);
        });
        render(containerSelector);
      });
    });
  }

  /* ============================================================
     تهيئة
     ============================================================ */
  function init(formSelector, containerSelector) {
    if (!UI.el(containerSelector)) return;
    render(containerSelector);
    bindForm(formSelector, containerSelector);
    bindFilters(containerSelector);
  }

  return {
    render: render,
    bindForm: bindForm,
    bindFilters: bindFilters,
    init: init
  };
})();
