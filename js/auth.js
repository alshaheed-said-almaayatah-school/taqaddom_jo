/* ============================================================
   Auth — تسجيل / دخول / جلسة (LocalStorage)
   عند إضافة Backend: استبدل جسم الدوال بـ fetch فقط.
   ============================================================ */

const Auth = (() => {

  // تنبيه: هذا ليس تشفيرًا حقيقيًا — فقط obfuscation للنسخة التجريبية.
  const hash = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36);
  };

  const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

  const register = ({ name, email, password }) => {
    name  = String(name  || '').trim();
    email = normalizeEmail(email);

    if (!name || !email || !password)
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };
    if (password.length < 6)
      return { ok: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { ok: false, error: 'البريد الإلكتروني غير صحيح.' };

    const users = Store.getUsers();
    if (users[email]) return { ok: false, error: 'هذا البريد مسجّل مسبقًا.' };

    users[email] = {
      id: Store.cryptoId(),
      name, email,
      pass: hash(password),
      createdAt: Date.now()
    };
    Store.saveUsers(users);
    Store.setSession({ userId: users[email].id, email });
    Store.logActivity('account', 'أنشأت حسابك في المنصة');

    return { ok: true, user: users[email] };
  };

  const login = ({ email, password }) => {
    email = normalizeEmail(email);
    if (!email || !password)
      return { ok: false, error: 'الرجاء تعبئة جميع الحقول.' };

    const users = Store.getUsers();
    const u = users[email];
    if (!u) return { ok: false, error: 'لا يوجد حساب بهذا البريد.' };
    if (u.pass !== hash(password)) return { ok: false, error: 'كلمة المرور غير صحيحة.' };

    Store.setSession({ userId: u.id, email });
    return { ok: true, user: u };
  };

  const logout = () => {
    Store.setSession(null);
  };

  const currentUser = () => {
    const s = Store.getSession();
    if (!s) return null;
    const u = Store.getUsers()[s.email];
    return u ? { id: u.id, name: u.name, email: u.email } : null;
  };

  const loginPath = () =>
    location.pathname.includes('/pages/') ? '../login.html' : 'login.html';

  const requireAuth = () => {
    const u = currentUser();
    if (!u) { location.replace(loginPath()); return null; }
    return u;
  };

  const requireGuest = () => {
    if (currentUser()) { location.replace(loginPath().replace('login.html', 'dashboard.html')); }
  };

  return { register, login, logout, currentUser, requireAuth, requireGuest };
})();
