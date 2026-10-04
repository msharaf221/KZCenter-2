import dayjs from 'dayjs';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, ExpenseCategory } from '../domain/models';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { notify } from '../lib/notifications';
import { formatCurrency, formatDate } from '../lib/utils';
import { deleteExpense, saveExpense } from '../services/commands/expenses';
import { loadExpensesList } from '../services/queries/expenses';

const PAGE_SIZE = 20;
const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salaries: 'رواتب', bills: 'فواتير', maintenance: 'صيانة',
  purchases: 'مشتريات', rent: 'إيجار', other: 'أخرى',
};
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4'];

export default function ExpensesPage() {
  const task = useCommandTask();
  const { settings } = useApp();
  const { user, can } = useAuth();
  const canWrite = can('expenses', 'create') || can('expenses', 'edit');
  const canDelete = can('expenses', 'delete');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'other' as ExpenseCategory,
    amount: 0, description: '',
    date: dayjs().format('YYYY-MM-DD'),
  });

  const query = useCallback(() => loadExpensesList({ page, pageSize: PAGE_SIZE, search, categoryFilter }), [page, search, categoryFilter]);
  const { data: { allExpenses, expenses, total }, loading, reload: load, error } = usePageResource(query, {
    allExpenses: [], expenses: [], total: 0,
  });
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ category: 'other', amount: 0, description: '', date: dayjs().format('YYYY-MM-DD') });
    setShowModal(true);
  }
  function openEdit(e: Expense) {
    if (e.payrollId) { notify.error('سند صرف المرتب مرتبط بكشف معتمد ولا يُعدّل يدوياً'); return; }
    setEditing(e);
    setForm({ category: e.category, amount: e.amount, description: e.description, date: e.date });
    setShowModal(true);
  }

  async function handleSave() {
    await task.run(async () => {
      await saveExpense(user, form, editing?.id);
      notify.success(editing ? 'تم تحديث المصروف' : 'تم إضافة المصروف');
      setShowModal(false);
      await load();
    });
  }

  // Pie data
  const categoryTotals: Record<string, number> = {};
  allExpenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });
  const pieData = Object.entries(categoryTotals).map(([cat, amount]) => ({
    name: CATEGORY_LABELS[cat as ExpenseCategory] || cat,
    value: amount,
  }));

  const totalAll = allExpenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = allExpenses.filter(e => e.date.startsWith(dayjs().format('YYYY-MM'))).reduce((s, e) => s + e.amount, 0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) return <PageReadError title="المصروفات" onRetry={load} />;

  return (
    <Layout title="إدارة المصروفات">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-rose-500/20 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">إجمالي المصروفات</p>
            <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(totalAll, settings?.currency)}</p>
          </div>
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-amber-500/20 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">هذا الشهر</p>
            <p className="text-2xl font-black font-mono text-amber-500 dark:text-amber-400 tracking-tight">{formatCurrency(thisMonth, settings?.currency)}</p>
          </div>
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">عدد السجلات</p>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-300 tracking-tight">{total}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie chart */}
          {pieData.length > 0 && (
            <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                توزيع المصروفات
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} strokeWidth={2} stroke="#070b14" dataKey="value" label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(7, 11, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      color: '#f8fafc',
                    }}
                    formatter={(v) => [formatCurrency(Number(v), settings?.currency), 'المبلغ']} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className={`glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden ${pieData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-36 relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="بحث في المصروفات..."
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                  <option value="" className="bg-slate-900 text-white">كل الفئات</option>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-900 text-white">{l}</option>)}
                </select>
                {canWrite && (
                  <button onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all mr-auto">
                    <Plus size={16} /> إضافة
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="p-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الفئة</th>
                    <th className="p-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الوصف</th>
                    <th className="p-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المبلغ</th>
                    <th className="p-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400">التاريخ</th>
                    <th className="p-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                    </td></tr>
                  ) : expenses.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">لا توجد مصروفات</td></tr>
                  ) : expenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
                          {CATEGORY_LABELS[expense.category]}
                        </span>
                      </td>
                      <td className="p-3.5 text-sm font-medium text-slate-900 dark:text-white">{expense.description}</td>
                      <td className="p-3.5 text-sm font-mono font-black text-rose-600 dark:text-rose-400">{formatCurrency(expense.amount, settings?.currency)}</td>
                      <td className="p-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(expense.date)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {expense.payrollId && can('payroll', 'view') && <Link to={`/payroll?teacher=${encodeURIComponent(expense.teacherId || '')}`} className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 hover:underline" title="سند صرف مرتبط بالمرتبات ولا يُعدّل يدوياً">كشف المرتب</Link>}
                          {canWrite && !expense.payrollId && <button onClick={() => openEdit(expense)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-transparent hover:border-amber-500/20 transition-all"><Edit2 size={14} /></button>}
                          {canDelete && !expense.payrollId && <button onClick={() => setDeleteId(expense.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل المصروف' : 'إضافة مصروف'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الفئة</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-slate-900 text-white">{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الوصف *</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="وصف المصروف" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المبلغ *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" min="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={task.pending} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
            {editing ? 'تحديث' : 'إضافة'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">إلغاء</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} title="حذف المصروف" message="هل أنت متأكد؟"
        onConfirm={async () => {
          if (!deleteId) return;
          await task.run(async () => { await deleteExpense(user, deleteId); notify.success('تم الحذف'); await load(); });
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)} danger />
    </Layout>
  );
}
