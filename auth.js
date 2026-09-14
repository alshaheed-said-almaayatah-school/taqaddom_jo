/* ============================================================
   auth.js
   حسابات + جلسة (LocalStorage)
   يعتمد على: ui.js (Store)

   ⚠️ عند إضافة Backend لاحقًا: استبدل جسم الدوال بـ fetch فقط.
   ============================================================ */

window.Auth = (function () {

  /* ---------- تشفير تجريبي (ليس آمنًا — للعرض فقط) ---------- */
  function hash(s) {
    let h = 0;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return 'h' + (h >>> 0).toString(36);
  }

  function normalizeEmail(e) {
    return String(e || '').trim().toLowerCase();
  }

  function isValidEmail(e) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
  }

  /* ============================================================
     تسجيل حساب جديد
     ============================================================ */
  function register(input) {
    input = input || {};
    let name     = String(input.name || '').trim();
    let email    = normalizeEmail(input.email);
    let password = String(input.password || '');

    if (!name || !email || !password) {
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };
    }
    if (name.length < 2) {
      return { ok: false, error: 'الاسم قصير جدًا.' };
    }
    if (!isValidEmail(email)) {
      return { ok: false, error: 'البريد الإلكتروني غير صحيح.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' };
    }

    const users = Store.getUsers();
    if (users[email]) {
      return { ok: false, error: 'هذا البريد مسجّل مسبقًا.' };
    }

    users[email] = {
      id: Store.cryptoId(),
      name: name,
      email: email,
      pass: hash(password),
      createdAt: Date.now()
    };
    Store.saveUsers(users);

    Store.setSession({ userId: users[email].id, email: email });
    Store.logActivity('account', 'أنشأت حسابك في المنصة');

    return { ok: true, user: publicUser(users[email]) };
  }

  /* ============================================================
     تسجيل الدخول
     ============================================================ */
  function login(input) {
    input = input || {};
    let email    = normalizeEmail(input.email);
    let password = String(input.password || '');

    if (!email || !password) {
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };
    }

    const users = Store.getUsers();
    const u = users[email];

    if (!u) {
      return { ok: false, error: 'لا يوجد حساب بهذا البريد.' };
    }
    if (u.pass !== hash(password)) {
      return { ok: false, error: 'كلمة المرور غير صحيحة.' };
    }

    Store.setSession({ userId: u.id, email: email });
    return { ok: true, user: publicUser(u) };
  }

  /* ============================================================
     تسجيل الخروج
     ============================================================ */
  function logout() {
    Store.setSession(null);
  }

  /* ============================================================
     المستخدم الحالي
     ============================================================ */
  function currentUser() {
    const s = Store.getSession();
    if (!s || !s.email) return null;
    const u = Store.getUsers()[s.email];
    return u ? publicUser(u) : null;
  }

  /* ============================================================
     حماية الصفحات
     ============================================================ */

  // يعيد المستخدم أو يعيد التوجيه إلى login
  function requireAuth() {
    const u = currentUser();
    if (!u) {
      location.replace('login.html');
      return null;
    }
    return u;
  }

  // إذا كان المستخدم مسجّلًا → يعيد التوجيه إلى dashboard
  function requireGuest() {
    if (currentUser()) {
      location.replace('dashboard.html');
      return false;
    }
    return true;
  }

  /* ---------- إزالة البيانات الحساسة ---------- */
  function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email };
  }

  /* ============================================================
     التصدير
     ============================================================ */
  return {
    register: register,
    login: login,
    logout: logout,
    currentUser: currentUser,
    requireAuth: requireAuth,
    requireGuest: requireGuest
  };
})();
