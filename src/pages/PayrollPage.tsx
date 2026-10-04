import dayjs from 'dayjs';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, Teacher } from '../domain/models';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { notify } from '../lib/notifications';
import { formatCurrency, formatDate } from '../lib/utils';
import { deleteExpense, saveExpense } from '../services/commands/expenses';
import { loadExpensesList } from '../services/queries/expenses';
import { loadTeachersList } from '../services/queries/teachers';

const PAGE_SIZE = 20;

export default function PayrollPage() {
  const task = useCommandTask();
  const { settings } = useApp();
  const { user, can } = useAuth();
  const canWrite = can('payroll', 'money') || can('expenses', 'create');
  const canDelete = can('expenses', 'delete');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [form, setForm] = useState({
    teacherId: '',
    amount: 0, 
    description: 'راتب شهر ' + dayjs().format('MM-YYYY'),
    date: dayjs().format('YYYY-MM-DD'),
  });

  const query = useCallback(() => loadExpensesList({ page, pageSize: PAGE_SIZE, search, categoryFilter: 'salaries' }), [page, search]);
  const { data: { expenses, total }, loading, reload: load, error } = usePageResource(query, {
    allExpenses: [], expenses: [], total: 0,
  });

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    loadTeachersList({ page: 1, pageSize: 1000, search: '' })
      .then(res => setTeachers(res.teachers))
      .catch(console.error);
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ teacherId: '', amount: 0, description: 'راتب شهر ' + dayjs().format('MM-YYYY'), date: dayjs().format('YYYY-MM-DD') });
    setShowModal(true);
  }
  
  function openEdit(e: Expense) {
    if (e.payrollId) { notify.error('هذا الراتب مسجل بالنظام القديم ولا يمكن تعديله'); return; }
    setEditing(e);
    setForm({ teacherId: e.teacherId || '', amount: e.amount, description: e.description, date: e.date });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.amount || form.amount <= 0) {
      notify.error('المبلغ غير صحيح');
      return;
    }
    await task.run(async () => {
      await saveExpense(user, { category: 'salaries', amount: form.amount, description: form.description, date: form.date, teacherId: form.teacherId || undefined }, editing?.id);
      notify.success(editing ? 'تم تحديث الدفعة' : 'تم صرف الراتب');
      setShowModal(false);
      await load();
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) return <PageReadError title="الرواتب" onRetry={load} />;

  return (
    <Layout title="إدارة الرواتب (دفعات بسيطة)">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input type="text" placeholder="بحث في دفعات الرواتب..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all" />
          </div>
          {canWrite && (
            <button onClick={openAdd}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2">
              <Plus size={18} /> صرف راتب
            </button>
          )}
        </div>

        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="px-4 py-3.5">التاريخ</th>
                  <th className="px-4 py-3.5">المدرس/الموظف</th>
                  <th className="px-4 py-3.5">المبلغ</th>
                  <th className="px-4 py-3.5">البيان</th>
                  <th className="px-4 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading && expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">جاري التحميل...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">لا يوجد رواتب مسجلة{search ? ' مطابقة للبحث' : ''}</td></tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(e.date, 'YYYY/MM/DD')}</td>
                      <td className="px-4 py-3.5">
                        {e.teacherId ? (
                          <Link to={`/teachers/${e.teacherId}`} className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline">
                            {teachers.find(t => t.id === e.teacherId)?.name || 'غير معروف'}
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(e.amount, settings?.currency)}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={e.description}>{e.description}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canWrite && !e.payrollId && (
                            <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-transparent hover:border-amber-500/20 transition-all" title="تعديل">
                              <Edit2 size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all" title="حذف">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#070b14]/50">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { if (!task.pending) setShowModal(false); }} title={editing ? 'تعديل دفعة' : 'صرف راتب جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المدرس / الموظف (اختياري)</label>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              <option value="" className="bg-slate-900 text-white">بدون تحديد</option>
              {teachers.map(t => <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المبلغ</label>
              <input type="number" min="0" value={form.amount || ''} onChange={e => setForm({ ...form, amount: +e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">البيان / الوصف</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
          </div>
          <div className="pt-2">
            <button disabled={task.pending} onClick={handleSave}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
              {task.pending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onCancel={() => { if (!task.pending) setDeleteId(null); }}
        title="حذف الدفعة" message="هل أنت متأكد من حذف دفعة الراتب هذه؟"
        confirmLabel="حذف الدفعة" danger={true}
        onConfirm={async () => {
          if (!deleteId) return;
          await task.run(async () => {
            await deleteExpense(user, deleteId);
            notify.success('تم حذف الدفعة');
            setDeleteId(null);
            await load();
          });
        }} />
    </Layout>
  );
}
