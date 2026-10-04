import { Key, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import ResourceError from '../components/ui/ResourceError';
import { useAuth } from '../contexts/AuthContext';
import { readAll } from '../data/readers';
import type { User, UserRole } from '../domain/models';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { notify } from '../lib/notifications';
import { ROLE_LABEL } from '../lib/permissions';
import { formatDate } from '../lib/utils';

const loadTeacherChoices = () => readAll('teachers');

export default function UsersPage() {
  const { allUsers, usersError, usersLoading, refreshUsers, addUser, deleteUser, resetPassword, user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', role: 'teacher' as UserRole, teacherId: '' });
  const { data: teachers, error: teacherError, loading: teachersLoading, reload: reloadTeachers } = useAsyncResource(loadTeacherChoices, [], { enabled: showModal });
  const [resetPassword_, setResetPassword_] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddUser() {
    if (!form.username.trim()) { notify.error('اسم المستخدم مطلوب'); return; }
    if (form.password.length < 6) { notify.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (form.password !== form.confirmPassword) { notify.error('كلمتا المرور غير متطابقتين'); return; }
    if (form.role === 'teacher' && !form.teacherId) { notify.error('اختر المدرس المرتبط بهذا الحساب حتى يرى مجموعاته'); return; }
    setLoading(true);
    try {
      await addUser(form.username, form.password, form.role, form.role === 'teacher' ? form.teacherId : undefined);
      setShowModal(false);
      setForm({ username: '', password: '', confirmPassword: '', role: 'teacher', teacherId: '' });
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'حدث خطأ');
    } finally { setLoading(false); }
  }

  async function handleResetPassword() {
    if (resetPassword_.length < 6) { notify.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (resetPassword_ !== resetConfirm) { notify.error('كلمتا المرور غير متطابقتين'); return; }
    if (!selectedUser) return;
    setLoading(true);
    try {
      await resetPassword(selectedUser.id, resetPassword_);
      setShowResetModal(false);
      setResetPassword_('');
      setResetConfirm('');
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'حدث خطأ');
    } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser(id);
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'لا يمكن حذف هذا المستخدم');
    }
  }

  if (usersError) return <PageReadError title="إدارة المستخدمين" onRetry={refreshUsers} />;
  if (usersLoading) return <Layout title="إدارة المستخدمين"><p role="status" className="p-6 text-center">جاري تحميل المستخدمين...</p></Layout>;

  const visibleUsers = allUsers.filter(u => !u.deleted);

  return (
    <Layout title="إدارة المستخدمين">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
            <Plus size={16} /> إضافة مستخدم
          </button>
        </div>

        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="p-4 text-right text-xs">#</th>
                <th className="p-4 text-right text-xs">اسم المستخدم</th>
                <th className="p-4 text-right text-xs">الدور</th>
                <th className="p-4 text-right text-xs">تاريخ الإنشاء</th>
                <th className="p-4 text-center text-xs">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {visibleUsers.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-xs font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(0,240,255,0.3)] border border-white/20">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{u.username}</p>
                          {u.id === currentUser?.id && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">(أنت)</span>}
                        </div>
                        {u.role === 'teacher' && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {u.teacherId ? (teachers.find(t => t.id === u.teacherId)?.name || 'مدرس محذوف') : 'غير مرتبط بمدرس'}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><Badge status={u.role} label={ROLE_LABEL[u.role] || u.role} /></td>
                  <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(u.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedUser(u); setShowResetModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all shadow-sm"
                        title="إعادة تعيين كلمة المرور">
                        <Key size={13} /> تغيير المرور
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => setDeleteId(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all shadow-sm">
                          <Trash2 size={13} /> حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مستخدم جديد">
        {teacherError && <ResourceError onRetry={reloadTeachers} message="تعذّر تحميل قائمة المدرسين لربط الحساب." />}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم المستخدم *</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="مثال: teacher1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الدور</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              <option value="admin" className="bg-slate-900 text-white">{ROLE_LABEL.admin}</option>
              <option value="secretary" className="bg-slate-900 text-white">{ROLE_LABEL.secretary}</option>
              <option value="accountant" className="bg-slate-900 text-white">{ROLE_LABEL.accountant}</option>
              <option value="supervisor" className="bg-slate-900 text-white">{ROLE_LABEL.supervisor}</option>
              <option value="teacher" className="bg-slate-900 text-white">{ROLE_LABEL.teacher}</option>
            </select>
          </div>
          {form.role === 'teacher' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المدرس المرتبط *</label>
              <select value={form.teacherId} onChange={e => setForm({...form, teacherId: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                <option value="" className="bg-slate-900 text-white">— اختر المدرس —</option>
                {teachers.map(t => <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">حساب المدرس بيشوف مجموعاته وطلابه هو بس</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور *</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">تأكيد كلمة المرور *</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleAddUser} disabled={loading || (form.role === 'teacher' && (teachersLoading || !!teacherError))}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all disabled:opacity-60">
            {loading ? 'جاري الإضافة...' : 'إضافة'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">إلغاء</button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={`تغيير كلمة مرور: ${selectedUser?.username}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
            <input type="password" value={resetPassword_} onChange={e => setResetPassword_(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">تأكيد كلمة المرور</label>
            <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleResetPassword} disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all disabled:opacity-60">
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">إلغاء</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} title="حذف المستخدم" message="هل أنت متأكد من حذف هذا المستخدم؟"
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} danger />
    </Layout>
  );
}
