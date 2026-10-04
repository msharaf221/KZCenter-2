import {
  AlertTriangle,
  Clock, DollarSign,
  Download,
  Eraser,
  Eye,
  MessageCircle,
  Receipt,
  Search,
  TrendingDown,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import WriteOffDebtsDialog from '../components/WriteOffDebtsDialog';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import QuickCollectDialog from '../features/payments/QuickCollectDialog';
import { usePageResource } from '../hooks/usePageResource';
import { notify } from '../lib/notifications';
import { downloadCSV, formatCurrency, formatDate, getWhatsAppLink, toCSV } from '../lib/utils';
import type { DebtorRow } from '../services/balanceService';
import type { WriteOffResult, WriteOffScope } from '../services/debtWriteOffService';
import { loadDebtors } from '../services/queries/debtors';

type FilterKey = 'all' | 'overdue' | 'neverPaid' | 'suspended';
type SortKey = 'remaining' | 'overdue' | 'oldestPayment' | 'name';

export default function DebtorsPage() {
  const navigate = useNavigate();
  const { settings } = useApp();
  const { can } = useAuth();
  const canCollect = can('payments', 'create');
  const canWriteOff = can('debtors', 'delete'); // إبراء الذمة = إلغاء أقساط → صلاحية حذف

  const [showWriteOff, setShowWriteOff] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('remaining');

  const [payTarget, setPayTarget] = useState<DebtorRow | null>(null);

  const { data: debtors, loading, reload: load, error } = usePageResource(loadDebtors, []);

  const rows = debtors
    .filter(d => {
      const q = search.trim().toLowerCase();
      if (q && !d.name.toLowerCase().includes(q) && !d.parentPhone.includes(q)) return false;
      if (filter === 'overdue') return d.overdueCount > 0;
      if (filter === 'neverPaid') return d.daysSinceLastPayment === null;
      if (filter === 'suspended') return d.status === 'suspended';
      return true;
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sort === 'overdue') return b.overdueAmount - a.overdueAmount || b.remaining - a.remaining;
      if (sort === 'oldestPayment') {
        const av = a.daysSinceLastPayment ?? Number.MAX_SAFE_INTEGER;
        const bv = b.daysSinceLastPayment ?? Number.MAX_SAFE_INTEGER;
        return bv - av;
      }
      return b.remaining - a.remaining;
    });

  const totals = {
    count: rows.length,
    remaining: rows.reduce((s, d) => s + d.remaining, 0),
    overdueAmount: rows.reduce((s, d) => s + d.overdueAmount, 0),
    overdueCount: rows.reduce((s, d) => s + d.overdueCount, 0),
    neverPaid: rows.filter(d => d.daysSinceLastPayment === null).length,
  };

  function reminderText(d: DebtorRow) {
    const center = settings?.centerName || 'المركز';
    const groups = d.groups.map(g => g.groupName).join('، ');
    return `السلام عليكم، نود تذكيركم بأن الباقي على الطالب/ة ${d.name} هو ${d.remaining} ${settings?.currency || ''}${groups ? ` (${groups})` : ''}. برجاء السداد في أقرب وقت. ${center}`;
  }

  function exportCSV() {
    const csv = toCSV(
      rows.map(d => ({
        name: d.name,
        parentPhone: d.parentPhone,
        groups: d.groups.map(g => g.groupName).join(' | '),
        owed: d.owed,
        paid: d.paid,
        remaining: d.remaining,
        overdueCount: d.overdueCount,
        overdueAmount: d.overdueAmount,
        lastPayment: d.lastPaymentDate ? formatDate(d.lastPaymentDate) : 'لم يدفع بعد',
        days: d.daysSinceLastPayment ?? '',
      })),
      [
        { key: 'name', label: 'الطالب' },
        { key: 'parentPhone', label: 'هاتف ولي الأمر' },
        { key: 'groups', label: 'المجموعات' },
        { key: 'owed', label: 'المطلوب' },
        { key: 'paid', label: 'المدفوع' },
        { key: 'remaining', label: 'المتبقي' },
        { key: 'overdueCount', label: 'شهور متأخرة' },
        { key: 'overdueAmount', label: 'قيمة المتأخرات' },
        { key: 'lastPayment', label: 'آخر دفعة' },
        { key: 'days', label: 'أيام من آخر دفعة' },
      ]
    );
    downloadCSV(csv, 'debtors.csv');
    notify.success('تم تصدير المديونيات');
  }

  function openPay(d: DebtorRow) {
    setPayTarget(d);
  }

  async function handleWriteOff(info: { scope: WriteOffScope; reason: string; result: WriteOffResult }) {
    const { result } = info;
    const p = result.preview;
    if (!p) return;

    notify.success(
      `تم تصفير ${formatCurrency(p.amount, settings?.currency)} — ${p.installmentsCount} قسط لـ ${p.studentsCount} طالب`
    );

    setShowWriteOff(false);
    await load();
  }

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: debtors.length },
    { key: 'overdue', label: 'عليهم متأخرات', count: debtors.filter(d => d.overdueCount > 0).length },
    { key: 'neverPaid', label: 'لم يدفعوا بعد', count: debtors.filter(d => d.daysSinceLastPayment === null).length },
    { key: 'suspended', label: 'متوقفون', count: debtors.filter(d => d.status === 'suspended').length },
  ];

  if (error) return <PageReadError title="المديونيات" onRetry={load} />;

  return (
    <Layout title="المديونيات والتنبيهات">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Users size={16} />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">طلاب عليهم مبالغ</p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">{totals.count}</p>
          </div>

          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <DollarSign size={16} />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المتبقي</p>
            </div>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">{formatCurrency(totals.remaining, settings?.currency)}</p>
          </div>

          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle size={16} />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">متأخرات</p>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{totals.overdueCount}</p>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500">({formatCurrency(totals.overdueAmount, settings?.currency)})</p>
            </div>
          </div>

          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Clock size={16} />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">لم يدفعوا بعد</p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">{totals.neverPaid}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 relative border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-wrap items-center gap-3">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          <div className="flex-1 min-w-48 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو هاتف ولي الأمر..."
              className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-100/80 dark:bg-[#070b14]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-1">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === f.key
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer">
            <option value="remaining">الترتيب: الأكبر متبقياً</option>
            <option value="overdue">الترتيب: الأكبر متأخرات</option>
            <option value="oldestPayment">الترتيب: الأقدم دفعة</option>
            <option value="name">الترتيب: بالاسم</option>
          </select>

          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer">
            <Download size={16} /> تصدير
          </button>

          {canWriteOff && (
            <button onClick={() => setShowWriteOff(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-rose-500/20 bg-rose-500/10 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
              title="إبراء ذمة: تصفير الأقساط غير المسددة قبل بداية شهر جديد">
              <Eraser size={16} /> تصفير المديونيات
            </button>
          )}
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الطالب</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المجموعات</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المطلوب</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المدفوع</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المتبقي</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">التأخير</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">آخر دفعة</th>
                  <th className="p-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan={8} className="p-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-400">
                    {debtors.length === 0 ? '🎉 لا توجد مديونيات — كل الطلاب مسددين' : 'لا نتائج مطابقة للفلتر'}
                  </td></tr>
                ) : rows.map(d => (
                  <tr key={d.studentId} className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors ${d.overdueCount > 0 ? 'bg-rose-500/[0.04]' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => navigate(`/students/${d.studentId}`)} className="text-right group cursor-pointer">
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">{d.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" dir="ltr">{d.parentPhone}</p>
                      </button>
                      {d.status === 'suspended' && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">متوقف</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300 max-w-[220px]">
                      {d.groups.map(g => (
                        <div key={g.groupId} className="truncate">
                          <span className="font-semibold">{g.groupName}</span>
                          <span className="text-slate-400 font-mono"> • {formatCurrency(g.remaining, settings?.currency)}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300">{formatCurrency(d.owed, settings?.currency)}</td>
                    <td className="p-4 text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(d.paid, settings?.currency)}</td>
                    <td className="p-4 text-sm font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(d.remaining, settings?.currency)}</td>
                    <td className="p-4">
                      {d.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <AlertTriangle size={12} /> متأخر {formatCurrency(d.overdueAmount, settings?.currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {d.lastPaymentDate ? (
                        <>
                          <span className="font-mono">{formatDate(d.lastPaymentDate)}</span>
                          <span className="block text-slate-400 text-[11px] mt-0.5">من {d.daysSinceLastPayment} يوم</span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <TrendingDown size={12} /> لم يدفع بعد
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {canCollect && (
                          <button onClick={() => openPay(d)}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer" title="تحصيل دفعة">
                            <Receipt size={15} />
                          </button>
                        )}
                        {d.parentPhone && (
                          <a href={getWhatsAppLink(d.parentPhone, reminderText(d))} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all hover:scale-105 active:scale-95" title="تذكير عبر واتساب">
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button onClick={() => navigate(`/students/${d.studentId}`)}
                          className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer" title="ملف الطالب">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* نافذة التحصيل */}
      <QuickCollectDialog
        isOpen={!!payTarget}
        target={payTarget ? {
          studentId: payTarget.studentId,
          studentName: payTarget.name,
          remaining: payTarget.remaining,
          groupName: payTarget.groups.map(g => g.groupName).join('، ') || undefined,
          overdueAmount: payTarget.overdueAmount,
        } : null}
        onClose={() => setPayTarget(null)}
        onSuccess={load}
      />

      {/* نافذة تصفير المديونيات */}
      <WriteOffDebtsDialog
        isOpen={showWriteOff}
        onClose={() => setShowWriteOff(false)}
        onDone={handleWriteOff}
        currency={settings?.currency}
      />
    </Layout>
  );
}
