/* ============================================================
   auth.js
   Firebase Auth + تحميل بيانات المستخدم
   ⚠️ يعتمد على window.FB + window.Store + window.UI
   ============================================================ */

window.Auth = (function () {

  let currentUser = null;
  let readyResolve;
  const readyPromise = new Promise(function (res) { readyResolve = res; });

  /* ---------- ترجمة الأخطاء ---------- */
  function translateError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'هذا البريد مسجّل مسبقًا.';
      case 'auth/invalid-email':        return 'البريد الإلكتروني غير صحيح.';
      case 'auth/weak-password':        return 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل.';
      case 'auth/user-not-found':       return 'لا يوجد حساب بهذا البريد.';
      case 'auth/wrong-password':       return 'كلمة المرور غير صحيحة.';
      case 'auth/invalid-credential':   return 'البريد أو كلمة المرور غير صحيحة.';
      case 'auth/too-many-requests':    return 'محاولات كثيرة — حاول لاحقًا.';
      case 'auth/network-request-failed': return 'تحقق من اتصالك بالإنترنت.';
      case 'auth/user-disabled':        return 'هذا الحساب معطّل.';
      case 'auth/operation-not-allowed': return 'التسجيل بالبريد غير مفعّل حاليًا.';
      default:                          return 'حدث خطأ — حاول مرة أخرى.';
    }
  }

  function waitFB() {
    return new Promise(function (resolve) {
      (function check() {
        if (window.FB && window.FB.auth) return resolve();
        setTimeout(check, 50);
      })();
    });
  }

  /* ---------- تسجيل حساب جديد ---------- */
  async function register(input) {
    input = input || {};
    const name     = String(input.name || '').trim();
    const email    = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    if (!name || !email || !password)
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };
    if (name.length < 2)
      return { ok: false, error: 'الاسم قصير جدًا.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { ok: false, error: 'البريد الإلكتروني غير صحيح.' };
    if (password.length < 6)
      return { ok: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' };

    try {
      await waitFB();

      const cred = await FB.createUserWithEmailAndPassword(FB.auth, email, password);
      const user = cred.user;

      try { await FB.updateProfile(user, { displayName: name }); } catch (e) {}

      await FB.setDoc(FB.doc(FB.db, 'users', user.uid), {
        profile: { name: name, email: email, createdAt: Date.now() },
        progress: {},
        achievements: {},
        streak: { days: [] },
        goals: [],
        focus: [],
        activity: [{
          id: 'welcome', type: 'account',
          message: 'أنشأت حسابك في المنصة 🎉',
          meta: {}, at: Date.now()
        }],
        tasks: [],
        exams: [],
        grades: { subjects: {}, target: 90 },
        notes: {}
      });

      return { ok: true, user: { uid: user.uid, name: name, email: email } };
    } catch (err) {
      console.error('[Auth.register]', err);
      return { ok: false, error: translateError(err.code) };
    }
  }

  /* ---------- تسجيل الدخول ---------- */
  async function login(input) {
    input = input || {};
    const email    = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    if (!email || !password)
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };

    try {
      await waitFB();
      const cred = await FB.signInWithEmailAndPassword(FB.auth, email, password);
      return { ok: true, user: cred.user };
    } catch (err) {
      console.error('[Auth.login]', err);
      return { ok: false, error: translateError(err.code) };
    }
  }

  /* ---------- تسجيل الخروج ---------- */
  async function logout() {
    try {
      await waitFB();
      await FB.signOut(FB.auth);
      return { ok: true };
    } catch (err) {
      console.error('[Auth.logout]', err);
      return { ok: false, error: 'تعذّر تسجيل الخروج.' };
    }
  }

  /* ---------- نسيت كلمة المرور ---------- */
  async function resetPassword(email) {
    email = String(email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'أدخل بريدك الإلكتروني.' };
    try {
      await waitFB();
      await FB.sendPasswordResetEmail(FB.auth, email);
      return { ok: true };
    } catch (err) {
      console.error('[Auth.resetPassword]', err);
      return { ok: false, error: translateError(err.code) };
    }
  }

  /* ---------- المستخدم الحالي ---------- */
  function currentUserFn() { return currentUser; }

  /* ---------- حماية الصفحات ---------- */
  async function requireAuth() {
    await readyPromise;
    if (!currentUser) {
      location.replace('login.html');
      return null;
    }
    return currentUser;
  }

  /* ---------- المزامنة الفورية ---------- */
  (async function init() {
    await waitFB();

    FB.onAuthStateChanged(FB.auth, async function (user) {
      if (user) {
        currentUser = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'طالب')
        };

        try {
          Store.setUid(user.uid);
          await Store.loadAll();
        } catch (err) {
          console.error('[Auth] load user data:', err);
          try { UI.toast('تعذّر تحميل بياناتك، حاول تحديث الصفحة.', 'error', 5000); } catch (e) {}
        }
      } else {
        currentUser = null;
        try { Store.setUid(null); } catch (e) {}
      }

      readyResolve(currentUser);
      document.dispatchEvent(new CustomEvent('auth:changed', { detail: currentUser }));
    });
  })();

  return {
    register: register,
    login: login,
    logout: logout,
    resetPassword: resetPassword,
    currentUser: currentUserFn,
    requireAuth: requireAuth,
    ready: readyPromise
  };
})();
