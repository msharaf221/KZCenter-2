import dayjs from 'dayjs';
import { AlertTriangle, Calendar, Clock, Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell, Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
} from 'recharts';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import { useApp } from '../contexts/AppContext';
import { reportCharts } from '../domain/reporting/charts';
import { dateRange, financialSummary } from '../domain/reporting/finance';
import { usePageResource } from '../hooks/usePageResource';
import { AGING_RANGES, debtAging, installmentRemaining, upcomingDues } from '../lib/billing';
import { notify } from '../lib/notifications';
import { downloadCSV, formatCurrency, formatDate, toCSV } from '../lib/utils';
import { loadReportData } from '../services/queries/reports';

const GENDER_COLORS = ['#6366f1', '#ec4899'];
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4'];

export default function ReportsPage() {
  const { settings } = useApp();

  // فترة التقرير — كان ثابت على «آخر 6 أشهر» من غير اختيار
  const [from, setFrom] = useState(dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data, loading, error, reload } = usePageResource(loadReportData, {
    students: [], teachers: [], courses: [], groups: [], payments: [], expenses: [], refunds: [], installments: [],
  });

  const { students, installments } = data;
  const today = dayjs().format('YYYY-MM-DD');
  const { genderData, statusData, ageGroups, courseData, groupFillData, monthlyData, teacherData, expensePieData } = useMemo(() => reportCharts(data, today), [data, today]);
  const { grossRevenue: totalRevenue, refunds: totalRefunds, expenses: totalExpenses, profit: netProfit, byMethod, paymentCount, refundCount, expenseCount } = useMemo(
    () => financialSummary(data, dateRange(from, to), 'signed'), [data, from, to],
  );

  // ===== أعمار الديون =====
  const debtBuckets = debtAging(installments);

  // ===== استحقاقات قريبة =====
  const upcoming = upcomingDues(installments, settings?.upcomingDueDays ?? 3);

  function exportReport() {
    const data = students.map(s => ({
      name: s.name, age: s.age, gender: s.gender === 'male' ? 'ولد' : 'بنت',
      status: s.status === 'active' ? 'نشط' : s.status === 'suspended' ? 'متوقف' : 'منتهي',
      totalPaid: s.totalPaid, parentPhone: s.parentPhone,
    }));
    const csv = toCSV(data as unknown as Record<string, unknown>[], [
      { key: 'name', label: 'الاسم' }, { key: 'age', label: 'العمر' },
      { key: 'gender', label: 'النوع' }, { key: 'status', label: 'الحالة' },
      { key: 'totalPaid', label: 'إجمالي المدفوع' }, { key: 'parentPhone', label: 'هاتف ولي الأمر' },
    ]);
    downloadCSV(csv, 'students_report.csv');
    notify.success('تم تصدير التقرير');
  }

  if (error) return <PageReadError title="التقارير والإحصائيات" onRetry={reload} />;

  if (loading) {
    return (
      <Layout title="التقارير والإحصائيات">
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="التقارير والإحصائيات">
      <div className="space-y-6">
        {/* Top actions + period picker */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 relative border border-slate-200/80 dark:border-white/10 shadow-sm no-print">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Calendar size={16} className="text-cyan-500" /> فترة التقرير
            </div>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
            <span className="text-slate-400 text-sm font-bold">←</span>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'هذا الشهر', f: dayjs().startOf('month').format('YYYY-MM-DD'), t: dayjs().format('YYYY-MM-DD') },
                { label: 'آخر 3 أشهر', f: dayjs().subtract(3, 'month').startOf('month').format('YYYY-MM-DD'), t: dayjs().format('YYYY-MM-DD') },
                { label: 'آخر 6 أشهر', f: dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD'), t: dayjs().format('YYYY-MM-DD') },
                { label: 'السنة دي', f: dayjs().startOf('year').format('YYYY-MM-DD'), t: dayjs().format('YYYY-MM-DD') },
              ].map(q => (
                <button key={q.label} onClick={() => { setFrom(q.f); setTo(q.t); }}
                  className="px-3 py-1.5 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer">
                  {q.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mr-auto">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer">
                <Printer size={16} /> طباعة
              </button>
              <button onClick={exportReport} className="flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500">
                <Download size={16} /> تصدير CSV
              </button>
            </div>
          </div>
          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
            من {formatDate(from)} إلى {formatDate(to)} — كل الأرقام المالية تحت محسوبة على هذه الفترة
          </p>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المحصل</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{formatCurrency(totalRevenue, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{paymentCount} دفعة</p>
          </div>
          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">المسترد</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{formatCurrency(totalRefunds, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{refundCount} عملية</p>
          </div>
          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المصروفات</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">{formatCurrency(totalExpenses, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{expenseCount} بند</p>
          </div>
          <div className="glow-card relative p-5 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">صافي الربح</p>
            <p className={`text-2xl font-black font-mono mt-1 ${netProfit >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(netProfit, settings?.currency)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">بعد خصم المسترد والمصروفات</p>
          </div>
        </div>

        {/* التحصيل حسب طريقة الدفع */}
        {Object.keys(byMethod).length > 0 && (
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              التحصيل حسب طريقة الدفع
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {(Object.entries(byMethod) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([m, v]) => (
                  <div key={m} className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#070b14]/70 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{({ cash: 'نقدي', wallet: 'محفظة', instapay: 'انستاباي', card: 'بطاقة', bank: 'تحويل بنكي', other: 'أخرى' } as Record<string, string>)[m] || m}: </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(v, settings?.currency)}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">({totalRevenue > 0 ? Math.round((v / totalRevenue) * 100) : 0}%)</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* أعمار الديون */}
        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-500" /> أعمار الديون (Aging)
          </h3>
          <p className="text-xs text-slate-400 mb-4">توزيع المتأخرات على الطلاب حسب مدة التأخير</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {AGING_RANGES.map((range, idx) => {
              const b = debtBuckets.find(x => x.key === range.key);
              const accents = [
                'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
                'border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400',
                'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
                'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400',
                'border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400',
              ][idx] || 'border-slate-500/20 bg-slate-500/5 text-slate-400';
              return (
                <div key={range.key} className={`p-3.5 rounded-xl border ${accents}`}>
                  <p className="text-xs font-bold mb-1">{range.label}</p>
                  <p className="text-lg font-black font-mono">{formatCurrency(b?.amount || 0, settings?.currency)}</p>
                  <p className="text-[11px] font-mono opacity-70 mt-0.5">{b?.count || 0} شهر</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* استحقاقات قريبة */}
        {upcoming.count > 0 && (
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/20 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Clock size={17} className="text-indigo-400" /> استحقاقات قريبة
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {upcoming.count} شهر بإجمالي {formatCurrency(upcoming.amount, settings?.currency)} مطلوب دفعهم خلال {settings?.upcomingDueDays ?? 3} يوم
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                  <tr className="text-right text-xs text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5">الطالب</th>
                    <th className="px-4 py-2.5">الاستحقاق</th>
                    <th className="px-4 py-2.5">المتبقي</th>
                    <th className="px-4 py-2.5">فاضل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {upcoming.items.slice(0, 12).map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                        {students.find(st => st.id === i.studentId)?.name || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{formatDate(i.dueDate)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(installmentRemaining(i), settings?.currency)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${i.daysUntilDue <= 1 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                          {i.daysUntilDue === 0 ? 'النهاردة' : `${i.daysUntilDue} يوم`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue vs Expenses */}
        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            الإيرادات والمصروفات (آخر 6 أشهر)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(7, 11, 20, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  color: '#f8fafc',
                }}
                formatter={(v, n) => [formatCurrency(Number(v), settings?.currency), n === 'revenue' ? 'إيرادات' : n === 'expense' ? 'مصروفات' : 'ربح']}
              />
              <Legend formatter={v => v === 'revenue' ? 'إيرادات' : v === 'expense' ? 'مصروفات' : 'ربح'} />
              <Bar dataKey="revenue" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 1: Gender + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              أولاد و بنات
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {genderData.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
              توزيع حالة الطلاب
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((item, i) => <Cell key={i} fill={item.color} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Age distribution + Course enrollment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              توزيع الأعمار
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} name="عدد الطلاب" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
              الكورسات (عدد الطلاب)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={courseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="students" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="الطلاب" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Group fill rate + Teacher performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              نسبة امتلاء المجموعات
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={groupFillData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: '#f8fafc',
                  }}
                  formatter={(v) => [`${v}%`, 'نسبة الامتلاء']}
                />
                <Bar dataKey="fill" radius={[6, 6, 0, 0]} name="الامتلاء">
                  {groupFillData.map((item, i) => (
                    <Cell key={i} fill={item.fill >= 90 ? '#f43f5e' : item.fill >= 70 ? '#f59e0b' : '#06b6d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
              أداء المدرسين
            </h3>
            {teacherData.length === 0 ? (
              <p className="text-center text-slate-400 py-8 font-medium">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={teacherData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(7, 11, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend formatter={v => v === 'groups' ? 'مجموعات' : 'طلاب'} />
                  <Bar dataKey="groups" fill="#06b6d4" radius={[6, 6, 0, 0]} name="groups" />
                  <Bar dataKey="students" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense categories */}
        {expensePieData.length > 0 && (
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              توزيع المصروفات حسب الفئة
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  dataKey="value" label={({ name, value }) => `${name}: ${formatCurrency(value, settings?.currency)}`}>
                  {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
}
