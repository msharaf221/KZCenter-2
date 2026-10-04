import dayjs from 'dayjs';
import { Calendar, ChevronLeft, ChevronRight, CreditCard, DollarSign, Download, Printer, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell, Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
} from 'recharts';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import { useApp } from '../contexts/AppContext';
import { dailyReport } from '../domain/reporting/daily';
import { usePageResource } from '../hooks/usePageResource';
import { notify } from '../lib/notifications';
import { downloadCSV, formatCurrency, formatDate, paymentStatusBadge, paymentStatusLabel, toCSV } from '../lib/utils';
import { loadDailyReportData } from '../services/queries/dailyReports';

const PIE_COLORS = ['#22c55e', '#f97316', '#ef4444'];
const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899'];

export default function DailyReportsPage() {
  const { settings } = useApp();

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const query = useCallback(() => loadDailyReportData({ selectedDate }), [selectedDate]);
  const { data: { loadedDate, allPayments, allExpenses, allRefunds, students, courses, payments, expenses }, loading, error, reload } = usePageResource(query, {
    loadedDate: '', allPayments: [], allExpenses: [], allRefunds: [], students: [], courses: [], payments: [], expenses: [],
  });

  // Navigate dates
  function goToPreviousDay() {
    setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  }

  function goToNextDay() {
    const next = dayjs(selectedDate).add(1, 'day');
    if (next.isAfter(dayjs())) return; // Don't go to future
    setSelectedDate(next.format('YYYY-MM-DD'));
  }

  function goToToday() {
    setSelectedDate(dayjs().format('YYYY-MM-DD'));
  }

  const { todayRevenue, todayPending, todayLate, todayExpenses, todayProfit, totalPaymentsCount, paidPaymentsCount, revenueChange, statusData, typeData, last7Days } = useMemo(
    () => dailyReport({ payments: allPayments, expenses: allExpenses, refunds: allRefunds }, selectedDate),
    [allPayments, allExpenses, allRefunds, selectedDate],
  );

  // Get student and course names
  function getStudentName(id: string) {
    return students.find(s => s.id === id)?.name || 'غير معروف';
  }
  function getCourseName(id?: string) {
    if (!id) return '—';
    return courses.find(c => c.id === id)?.name || '—';
  }
  function getPaymentType(type: string) {
    return type === 'subscription' ? 'اشتراك' : type === 'books' ? 'كتب' : 'أخرى';
  }
  // Export functions
  function exportDailyReport() {
    const data = payments.map(p => ({
      student: getStudentName(p.studentId),
      course: getCourseName(p.courseId),
      amount: p.amount,
      type: getPaymentType(p.type),
      status: paymentStatusLabel(p),
      notes: p.notes || '',
    }));
    const csv = toCSV(data as unknown as Record<string, unknown>[], [
      { key: 'student', label: 'الطالب' },
      { key: 'course', label: 'الكورس' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة' },
      { key: 'notes', label: 'ملاحظات' },
    ]);
    downloadCSV(csv, `daily_report_${selectedDate}.csv`);
    notify.success('تم تصدير التقرير اليومي');
  }

  function printReport() {
    window.print();
  }

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const displayDate = dayjs(selectedDate).format('dddd، D MMMM YYYY');

  if (error) return <PageReadError title="التقارير اليومية" onRetry={reload} />;

  if (loading || loadedDate !== selectedDate) {
    return (
      <Layout title="التقارير اليومية">
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="التقارير اليومية">
      <div className="space-y-6 print-full">
        {/* Date Navigation */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 relative border border-slate-200/80 dark:border-white/10 shadow-sm no-print">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>

              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-cyan-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  max={dayjs().format('YYYY-MM-DD')}
                  className="px-3.5 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                />
              </div>

              <button
                onClick={goToNextDay}
                disabled={isToday}
                className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>

              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-3.5 py-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold hover:bg-cyan-500/20 transition-all cursor-pointer"
                >
                  اليوم
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <Printer size={16} /> طباعة
              </button>
              <button
                onClick={exportDailyReport}
                className="flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500"
              >
                <Download size={16} /> تصدير CSV
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 text-center flex items-center justify-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{displayDate}</h2>
            {isToday && <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">اليوم</span>}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الإيرادات</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <DollarSign size={15} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(todayRevenue, settings?.currency)}</p>
            {revenueChange !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-mono font-bold ${revenueChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {revenueChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{Math.abs(revenueChange)}% عن أمس</span>
              </div>
            )}
          </div>

          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المدفوعات المعلقة</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <CreditCard size={15} className="text-amber-500" />
              </div>
            </div>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(todayPending, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{payments.filter(p => !p.deleted && p.status === 'pending').length} دفعة</p>
          </div>

          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المدفوعات المتأخرة</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <CreditCard size={15} className="text-rose-500" />
              </div>
            </div>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(todayLate, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{payments.filter(p => !p.deleted && p.status === 'late').length} دفعة</p>
          </div>

          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المصروفات</span>
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Wallet size={15} className="text-orange-500" />
              </div>
            </div>
            <p className="text-lg font-black text-orange-600 dark:text-orange-400 font-mono">{formatCurrency(todayExpenses, settings?.currency)}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{expenses.length} مصروف</p>
          </div>

          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صافي الربح</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${todayProfit >= 0 ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
                {todayProfit >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              </div>
            </div>
            <p className={`text-lg font-black font-mono ${todayProfit >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(todayProfit, settings?.currency)}
            </p>
          </div>

          <div className="glow-card relative p-4 rounded-2xl bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عدد المعاملات</span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Users size={15} className="text-violet-500" />
              </div>
            </div>
            <p className="text-lg font-black text-violet-600 dark:text-violet-400 font-mono">{totalPaymentsCount}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">{paidPaymentsCount} مدفوعة</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Trend */}
          <div className="glow-card relative lg:col-span-2 bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              اتجاه الإيرادات (آخر 7 أيام)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: '#f8fafc',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value), settings?.currency),
                    name === 'revenue' ? 'الإيرادات' : name === 'expense' ? 'المصروفات' : 'الربح'
                  ]}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Legend formatter={v => v === 'revenue' ? 'الإيرادات' : v === 'expense' ? 'المصروفات' : 'الربح'} />
                <Line type="monotone" dataKey="revenue" stroke="#00f0ff" strokeWidth={2.5} dot={{ fill: '#00f0ff', r: 4 }} name="revenue" />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} dot={{ fill: '#f43f5e', r: 4 }} name="expense" />
                <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} name="profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Status Pie */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
              توزيع حالة الدفعات
            </h3>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">لا توجد دفعات</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(7, 11, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      color: '#f8fafc',
                    }}
                    formatter={(_v, _n, props) => [formatCurrency(props.payload.amount, settings?.currency), props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Types & Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Types */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              الإيرادات حسب النوع
            </h3>
            {typeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">لا توجد إيرادات</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(148, 163, 184, 0.2)" width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(7, 11, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(0, 240, 255, 0.25)',
                      color: '#f8fafc',
                    }}
                    formatter={(v) => [formatCurrency(Number(v), settings?.currency), 'المبلغ']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Today's Expenses */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#f43f5e]" />
              مصروفات اليوم
            </h3>
            {expenses.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">لا توجد مصروفات</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-[#070b14]/70 border border-slate-200/50 dark:border-white/5 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{exp.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {exp.category === 'salaries' ? 'رواتب' :
                          exp.category === 'bills' ? 'فواتير' :
                            exp.category === 'maintenance' ? 'صيانة' :
                              exp.category === 'purchases' ? 'مشتريات' :
                                exp.category === 'rent' ? 'إيجار' : 'أخرى'}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(exp.amount, settings?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">تفاصيل المدفوعات</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{formatDate(selectedDate)}</p>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <DollarSign size={48} className="mx-auto mb-3 opacity-30 text-cyan-400" />
              <p>لا توجد مدفوعات في هذا اليوم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">#</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الطالب</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الكورس</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">المبلغ</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">النوع</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {payments.map((payment, idx) => (
                    <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-4 text-sm font-bold text-slate-900 dark:text-white">{getStudentName(payment.studentId)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{getCourseName(payment.courseId)}</td>
                      <td className="p-4 text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount, settings?.currency)}</td>
                      <td className="p-4">
                        <span className="text-xs bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-bold">
                          {getPaymentType(payment.type)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${paymentStatusBadge(payment)}`}>
                          {paymentStatusLabel(payment)}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{payment.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 dark:bg-[#070b14]/80 border-t border-slate-200/80 dark:border-white/10">
                  <tr>
                    <td colSpan={3} className="p-4 text-sm font-bold text-slate-900 dark:text-white">الإجمالي</td>
                    <td className="p-4 text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(todayRevenue, settings?.currency)}
                    </td>
                    <td colSpan={3} className="p-4 text-xs font-mono text-slate-400">
                      ({paidPaymentsCount} من {totalPaymentsCount} مدفوعة)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Daily Summary Print Section */}
        <div className="hidden print:block bg-white p-6 rounded-2xl border border-gray-200">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">{settings?.centerName || 'EduCenter Pro'}</h1>
            <h2 className="text-lg text-gray-600">التقرير اليومي للإيرادات</h2>
            <p className="text-gray-500">{displayDate}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">الإيرادات</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(todayRevenue, settings?.currency)}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">المصروفات</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(todayExpenses, settings?.currency)}</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600">صافي الربح</p>
              <p className={`text-xl font-bold ${todayProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {formatCurrency(todayProfit, settings?.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
