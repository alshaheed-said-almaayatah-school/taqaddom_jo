/* ============================================================
   focus.js
   Pomodoro Timer + تسجيل جلسات التركيز

   يعتمد على: Store (ui.js) + Progress (progress.js)
   ============================================================ */

window.Focus = (function () {

  /* ============================================================
     الحالات
     ============================================================ */

  const PRESETS = {
    '25': { work: 25 * 60, rest: 5 * 60 },
    '50': { work: 50 * 60, rest: 10 * 60 },
    '15': { work: 15 * 60, rest: 3 * 60 }
  };

  let preset    = '25';
  let mode      = 'work';   // 'work' | 'rest'
  let remaining = PRESETS[preset].work;
  let total     = PRESETS[preset].work;
  let timerId   = null;
  let running   = false;

  /* ============================================================
     عناصر DOM (تُلتقط عند init)
     ============================================================ */

  let elTimer, elProgress, elMode;
  let btnStart, btnPause, btnReset;
  let elToday, elTotal;

  /* ============================================================
     تنسيق الوقت
     ============================================================ */

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  /* ============================================================
     العرض
     ============================================================ */

  function render() {
    if (!elTimer) return;

    elTimer.textContent = fmt(remaining);

    const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
    elProgress.style.width = pct + '%';

    elMode.textContent = mode === 'work' ? 'دراسة' : 'راحة';
    elMode.className = 'badge ' + (mode === 'work' ? 'info' : 'success');

    document.title = running
      ? fmt(remaining) + ' — ' + (mode === 'work' ? 'دراسة' : 'راحة')
      : 'استراتيجيات التركيز | منصة تقدّم';
  }

  /* ============================================================
     إحصاء الجلسات
     ============================================================ */

  function dayKey(ts) {
    const d = new Date(ts || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  function refreshStats() {
    const sessions = Store.getFocusSessions();
    const today = dayKey();

    if (elToday) {
      elToday.textContent = sessions.filter(function (s) {
        return dayKey(s.at) === today;
      }).length;
    }
    if (elTotal) {
      elTotal.textContent = sessions.length;
    }
  }

  /* ============================================================
     تغيير الإعداد
     ============================================================ */

  function setPreset(key) {
    if (!PRESETS[key]) return;
    if (running) return;

    preset    = key;
    mode      = 'work';
    total     = PRESETS[key].work;
    remaining = total;

    UI.els('.chip').forEach(function (c) {
      c.classList.toggle('active', c.dataset.preset === key);
    });

    render();
  }

  /* ============================================================
     العدّاد
     ============================================================ */

  function tick() {
    remaining--;

    if (remaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      running = false;
      onPhaseEnd();
      return;
    }
    render();
  }

  function onPhaseEnd() {
    if (mode === 'work') {
      const dur = Math.round(total / 60);

      Store.addFocusSession({ duration: dur, preset: preset });
      Store.logActivity('focus', 'أكملت جلسة تركيز مدتها ' + dur + ' دقيقة', { duration: dur });
      Progress.checkAchievements();
      refreshStats();

      UI.toast('✅ انتهت جلسة الدراسة! خذ راحة ' + Math.round(PRESETS[preset].rest / 60) + ' دقائق', 'success', 5000);

      mode      = 'rest';
      total     = PRESETS[preset].rest;
      remaining = total;
    } else {
      UI.toast('انتهت الراحة — جاهز لجلسة جديدة 🍅', 'info', 5000);

      mode      = 'work';
      total     = PRESETS[preset].work;
      remaining = total;
    }

    /* صوت قصير (اختياري) */
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start();
        setTimeout(function () {
          osc.stop();
          if (ctx.close) ctx.close();
        }, 300);
      }
    } catch (e) { /* تجاهل */ }

    if (btnStart) btnStart.disabled = false;
    if (btnPause) btnPause.disabled = true;

    render();
  }

  /* ============================================================
     أوامر التحكم
     ============================================================ */

  function start() {
    if (running) return;
    running = true;

    if (btnStart) btnStart.disabled = true;
    if (btnPause) btnPause.disabled = false;

    timerId = setInterval(tick, 1000);
    render();
  }

  function pause() {
    if (!running) return;
    running = false;

    clearInterval(timerId);
    timerId = null;

    if (btnStart) btnStart.disabled = false;
    if (btnPause) btnPause.disabled = true;

    render();
  }

  function reset() {
    running = false;
    clearInterval(timerId);
    timerId = null;

    mode      = 'work';
    total     = PRESETS[preset].work;
    remaining = total;

    if (btnStart) btnStart.disabled = false;
    if (btnPause) btnPause.disabled = true;

    render();
  }

  /* ============================================================
     التهيئة
     ============================================================ */

  function init() {
    elTimer    = document.getElementById('pomoTimer');
    if (!elTimer) return;  // الصفحة ليست focus.html

    elProgress = document.getElementById('pomoProgress');
    elMode     = document.getElementById('pomoMode');
    btnStart   = document.getElementById('pomoStart');
    btnPause   = document.getElementById('pomoPause');
    btnReset   = document.getElementById('pomoReset');
    elToday    = document.getElementById('todaySessions');
    elTotal    = document.getElementById('totalSessions');

    UI.els('.chip').forEach(function (c) {
      c.addEventListener('click', function () { setPreset(c.dataset.preset); });
    });

    if (btnStart) btnStart.addEventListener('click', start);
    if (btnPause) btnPause.addEventListener('click', pause);
    if (btnReset) btnReset.addEventListener('click', reset);

    setPreset('25');
    refreshStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ============================================================
     التصدير
     ============================================================ */

  return {
    start: start,
    pause: pause,
    reset: reset,
    setPreset: setPreset
  };
})();
