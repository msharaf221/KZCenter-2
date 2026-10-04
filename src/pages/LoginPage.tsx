import { AlertTriangle, Eye, EyeOff, Lock, RefreshCw, Shield, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userErrorMessage } from '../domain/errors';
import StudentPortalView from '../features/portal/StudentPortalView';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { notify } from '../lib/notifications';
import { checkPasswordStrength } from '../lib/security';
import { resetLocalDatabase } from '../services/localRecoveryService';

export default function LoginPage() {
  const [viewMode, setViewMode] = useState<'login' | 'portal'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  // تأكيد إعادة التعيين بنافذة React بدل نافذة المتصفح الأصلية
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof checkPasswordStrength> | null>(null);
  const { login, changePassword, rateLimitInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const flag = sessionStorage.getItem('educenter_must_change_pw');
    if (flag === 'true') {
      setMustChangePassword(true);
    }
  }, []);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(checkPasswordStrength(newPassword));
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      notify.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        if (result.mustChangePassword) {
          setMustChangePassword(true);
        } else {
          notify.success('مرحباً بك! تم تسجيل الدخول بنجاح');
          navigate('/');
        }
      } else {
        if (rateLimitInfo && !rateLimitInfo.remainingAttempts) {
          notify.error('تم حظر المحاولات مؤقتاً. حاول لاحقاً.');
        } else {
          notify.error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      notify.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { notify.error('أدخل كلمة المرور الحالية'); return; }
    if (!newPassword || newPassword.length < 6) {
      notify.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword === 'admin123') {
      notify.error('لا يمكن استخدام كلمة المرور الافتراضية');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error('كلمتا المرور غير متطابقتين');
      return;
    }
    if (passwordStrength && passwordStrength.score < 2) {
      notify.error('كلمة المرور ضعيفة. يرجى تحسينها.');
      return;
    }
    setLoading(true);
    try {
      const success = await changePassword(password, newPassword);
      if (success) {
        setMustChangePassword(false);
        notify.success('تم تغيير كلمة المرور بنجاح! مرحباً بك.');
        navigate('/');
      }
    } catch (err) {
      console.error('Change password error:', err);
      notify.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDatabase() {
    if (!username.trim() || !password) { notify.error('أدخل بيانات حساب مسؤول لإعادة تعيين القاعدة'); return; }
    const ok = await confirm({
      title: 'إعادة تعيين قاعدة البيانات',
      message: 'هل أنت متأكد من إعادة تعيين قاعدة البيانات؟ سيتم حذف جميع البيانات المحلية! تأكد من وجود نسخة احتياطية.',
      confirmLabel: 'نعم، إعادة التعيين', danger: true,
    });
    if (!ok) return;
    setResetting(true);
    try {
      await resetLocalDatabase(username, password, true, () => notify.error('أغلق النوافذ الأخرى للتطبيق لاستكمال إعادة التعيين'));
      notify.success('تم إعادة تعيين قاعدة البيانات. سيتم تحديث الصفحة...');
      window.location.reload();
    } catch (error) { notify.error(userErrorMessage(error, 'حدث خطأ أثناء إعادة التعيين')); }
    finally { setResetting(false); }
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
              <Shield size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">تغيير كلمة المرور</h1>
            <p className="text-gray-500 mt-2">يجب تغيير كلمة المرور قبل المتابعة</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-orange-600" />
                <p className="text-sm font-bold text-orange-800">تنبيه أمني</p>
              </div>
              <p className="text-xs text-orange-700">
                هذا الحساب يحتاج تغيير كلمة المرور لحمايته، سواء كانت افتراضية أو أعاد المسؤول تعيينها.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-semibold text-gray-700 mb-2">كلمة المرور الحالية</label>
                <input id="current-password" type="password" autoComplete="current-password" value={password}
                  onChange={event => setPassword(event.target.value)} placeholder="أدخل كلمة المرور الحالية"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور قوية"
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  />
                </div>
                {/* Password strength indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#e5e7eb',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </p>
                    {passwordStrength.suggestions.length > 0 && (
                      <ul className="mt-1 text-xs text-gray-500">
                        {passwordStrength.suggestions.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !password || !newPassword || newPassword !== confirmPassword || (passwordStrength?.score ?? 0) < 2}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all
                  disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-orange-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري التغيير...
                  </span>
                ) : 'تغيير كلمة المرور والمتابعة'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-[#070b14]" dir="rtl">
      {/* Ambient background glow orbs */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 dark:bg-purple-500/20 blur-[120px] pointer-events-none" />

      <div className={`w-full relative z-10 transition-all duration-300 ${viewMode === 'portal' ? 'max-w-4xl py-6' : 'max-w-md'}`}>
        {/* شريط التبديل بين دخول الموظفين وبوابة الطلاب */}
        <div className="flex bg-white/80 dark:bg-[#0c1324]/80 backdrop-blur-md p-1.5 rounded-2xl mb-8 max-w-sm mx-auto shadow-sm border border-slate-200/80 dark:border-white/10 no-print">
          <button
            type="button"
            onClick={() => setViewMode('login')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'login'
                ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            🔐 دخول الموظفين
          </button>
          <button
            type="button"
            onClick={() => setViewMode('portal')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'portal'
                ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            🎓 استعلام الطالب وولي الأمر
          </button>
        </div>

        {viewMode === 'portal' ? (
          <StudentPortalView />
        ) : (
          <>
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500 to-indigo-500 blur-xl opacity-40 animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#0c1324] to-[#1e1b4b] border border-cyan-400/40 rounded-3xl flex items-center justify-center shadow-xl shadow-cyan-500/20">
                  <span className="text-4xl select-none">🎓</span>
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  EduCenter Pro
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">نظام إدارة المركز التعليمي الذكي</p>
            </div>

            {/* Form Card */}
            <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-7 sm:p-8 border border-slate-200/80 dark:border-white/10 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">تسجيل الدخول</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">اسم المستخدم</label>
                  <div className="relative">
                    <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      className="w-full pr-11 pl-4 py-3 bg-slate-50/80 dark:bg-[#070b14]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">كلمة المرور</label>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      className="w-full pr-11 pl-11 py-3 bg-slate-50/80 dark:bg-[#070b14]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Rate limit warning */}
                {rateLimitInfo && rateLimitInfo.remainingAttempts <= 2 && rateLimitInfo.remainingAttempts > 0 && (
                  <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-700 dark:text-amber-300">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      متبقي {rateLimitInfo.remainingAttempts} محاولات قبل الحظر المؤقت
                    </p>
                  </div>
                )}

                {rateLimitInfo && rateLimitInfo.remainingAttempts === 0 && (
                  <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-700 dark:text-rose-300">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      تم حظر المحاولات. حاول مرة أخرى بعد بضع دقائق.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (rateLimitInfo?.remainingAttempts === 0)}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white rounded-2xl font-bold text-sm transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98] cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      جاري تسجيل الدخول...
                    </span>
                  ) : 'تسجيل الدخول'}
                </button>
              </form>

              {import.meta.env.DEV && (
                <div className="mt-6 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1.5">بيانات الدخول الافتراضية:</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">المستخدم: <strong className="text-slate-900 dark:text-slate-100 font-mono">admin</strong></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">كلمة المرور: <strong className="text-slate-900 dark:text-slate-100 font-mono">admin123</strong></p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1.5">⚠️ سيتم طلب تغييرها فور الدخول</p>
                </div>
              )}
              {/* Reset Database Button (dev only - dangerous) */}
              {import.meta.env.DEV && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleResetDatabase}
                    disabled={resetting}
                    className="text-xs text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={resetting ? 'animate-spin' : ''} />
                    {resetting ? 'جاري إعادة التعيين...' : 'إعادة تعيين قاعدة البيانات'}
                  </button>
                </div>
              )}

              {/* تأكيد إعادة تعيين قاعدة البيانات — نافذة React بدل نافذة المتصفح الأصلية */}
              {confirmDialog}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
