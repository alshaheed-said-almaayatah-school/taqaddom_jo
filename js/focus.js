/* ============================================================
   Focus — Pomodoro + تسجيل الجلسات
   ============================================================ */

const Focus = (() => {

  const PRESETS = {
    '25': { work: 25 * 60, rest: 5 * 60 },
    '50': { work: 50 * 60, rest: 10 * 60 },
    '15': { work: 15 * 60, rest: 3 * 60 }
  };

  let preset   = '25';
  let mode     = 'work';         // 'work' | 'rest'
  let remaining = PRESETS[preset].work;
  let total     = PRESETS[preset].work;
  let timerId   = null;
  let running   = false;

  /* ---------- DOM ---------- */
  const $ = (s) => document.querySelector(s);

  const elTimer    = $('#pomoTimer');
  const elProgress = $('#pomoProgress');
  const elMode     = $('#pomoMode');
  const btnStart   = $('#pomoStart');
  const btnPause   = $('#pomoPause');
  const btnReset   = $('#pomoReset');
  const elToday    = $('#todaySessions');
  const elTotal    = $('#totalSessions');

  /* ---------- Helpers ---------- */
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const render = () => {
    elTimer.textContent = fmt(remaining);
    const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
    elProgress.style.width = pct + '%';
    elMode.textContent = mode === 'work' ? 'دراسة' : 'راحة';
    elMode.className = 'badge ' + (mode === 'work' ? 'info' : 'success');
    document.title = running
      ? `${fmt(remaining)} — ${mode === 'work' ? 'دراسة' : 'راحة'}`
      : 'استراتيجيات التركيز — منصة تقدّم';
  };

  /* ---------- جلسات ---------- */
  const dayKey = (ts = Date.now()) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const refreshStats = () => {
    const sessions = Store.getFocusSessions();
    const today = dayKey();
    elToday.textContent = sessions.filter(s => dayKey(s.at) === today).length;
    elTotal.textContent = sessions.length;
  };

  /* ---------- Actions ---------- */
  const setPreset = (key) => {
    if (!PRESETS[key]) return;
    if (running) return; // لا تغيير أثناء التشغيل
    preset = key;
    mode = 'work';
    total = PRESETS[key].work;
    remaining = total;
    document.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('active', c.dataset.preset === key)
    );
    render();
  };

  const tick = () => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      running = false;
      onPhaseEnd();
      return;
    }
    render();
  };

  const onPhaseEnd = () => {
    if (mode === 'work') {
      // سجّل جلسة عمل مكتملة
      const dur = Math.round(total / 60);
      Store.addFocusSession({ duration: dur, preset });
      Store.logActivity('focus', `أكملت جلسة تركيز مدتها ${dur} دقيقة`, { duration: dur });
      Progress.checkAchievements();
      refreshStats();
      UI.toast(`✅ انتهت جلسة الدراسة! خذ راحة ${Math.round(PRESETS[preset].rest/60)} دقائق`, 'success', 5000);

      // انتقل للراحة تلقائيًا
      mode = 'rest';
      total = PRESETS[preset].rest;
      remaining = total;
    } else {
      UI.toast('انتهت الراحة — جاهز لجلسة جديدة 🍅', 'info', 5000);
      mode = 'work';
      total = PRESETS[preset].work;
      remaining = total;
    }

    // صوت قصير (اختياري، فشل صامت)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 300);
    } catch (e) { /* تجاهل */ }

    btnStart.disabled = false;
    btnPause.disabled = true;
    render();
  };

  const start = () => {
    if (running) return;
    running = true;
    btnStart.disabled = true;
    btnPause.disabled = false;
    timerId = setInterval(tick, 1000);
    render();
  };

  const pause = () => {
    if (!running) return;
    running = false;
    clearInterval(timerId);
    timerId = null;
    btnStart.disabled = false;
    btnPause.disabled = true;
    render();
  };

  const reset = () => {
    running = false;
    clearInterval(timerId);
    timerId = null;
    mode = 'work';
    total = PRESETS[preset].work;
    remaining = total;
    btnStart.disabled = false;
    btnPause.disabled = true;
    render();
  };

  /* ---------- Init ---------- */
  const init = () => {
    if (!elTimer) return;

    document.querySelectorAll('.chip').forEach(c => {
      c.addEventListener('click', () => setPreset(c.dataset.preset));
    });

    btnStart.addEventListener('click', start);
    btnPause.addEventListener('click', pause);
    btnReset.addEventListener('click', reset);

    setPreset('25');
    refreshStats();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { start, pause, reset, setPreset };
})();
