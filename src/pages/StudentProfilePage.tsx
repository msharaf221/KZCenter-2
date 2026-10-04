import { ArrowLeftRight, ArrowRight, BookOpen, CalendarDays, ClipboardCheck, CreditCard, GraduationCap, Megaphone, MessageCircle, Phone, PhoneCall, Receipt, RefreshCw, School, StickyNote, User, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import RenewDialog from '../components/RenewDialog';
import TransferDialog from '../components/TransferDialog';
import Badge from '../components/ui/Badge';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import QuickCollectDialog from '../features/payments/QuickCollectDialog';
import { usePageResource } from '../hooks/usePageResource';
import type { RenewalInfo } from '../lib/billing';
import { RENEWAL_STATE_LABEL } from '../lib/billing';
import { printStudentCard } from '../lib/printing';
import { formatCurrency, formatDate, getWhatsAppLink } from '../lib/utils';
import { emptyStudentProfile, loadStudentProfile } from '../services/queries/studentProfile';

const RENEWAL_STYLE: Record<RenewalInfo['state'], string> = {
  active: 'bg-green-50 text-green-700',
  expiring: 'bg-yellow-50 text-yellow-700',
  expired: 'bg-red-50 text-red-700',
};

/** عنصر بيانات مكتوب (اسم الحقل + القيمة) — القيمة الفاضية بتتعرض «—» */
function InfoItem({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value?: string | number | null; dir?: 'ltr' | 'rtl' }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="text-cyan-500 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 leading-tight">{label}</p>
        <p className={`font-bold leading-snug break-words ${empty ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`} dir={dir}>
          {empty ? '—' : value}
        </p>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  return <StudentProfileContent key={id} id={id} />;
}

function StudentProfileContent({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const { can, user } = useAuth();
  const canCollect = can('payments', 'create');
  const showMoney = can('payments', 'view'); // الأرقام المالية لمن عنده صلاحية المدفوعات
  const query = useCallback(() => loadStudentProfile(id || '', settings?.upcomingDueDays, { role: user?.role, teacherId: user?.teacherId }), [id, settings?.upcomingDueDays, user?.role, user?.teacherId]);
  const { data, loading, error, reload } = usePageResource(query, emptyStudentProfile());
  const { student, allGroups, allCourses, allTeachers, groups, payments, balance, renewalByGroup, enrollmentByGroup, transfers, attendance, examResults } = data;
  const loadData = useCallback(async () => { await reload(); }, [reload]);
  useEffect(() => {
    if (!loading && !error && data.requestedId === id && !data.student) navigate('/students');
  }, [loading, error, data, id, navigate]);

  const [transferFrom, setTransferFrom] = useState<{ groupId: string; groupName: string } | null>(null);
  const [renewTarget, setRenewTarget] = useState<{ groupId: string } | null>(null);

  // نافذة تحصيل دفعة (كاملة أو جزئية)
  const [payTarget, setPayTarget] = useState<{ groupId?: string; label: string; remaining: number } | null>(null);

  function openPay(groupId: string | undefined, label: string, remainingAmount: number) {
    setPayTarget({ groupId, label, remaining: remainingAmount });
  }

  if (error) return <PageReadError title="ملف الطالب" onRetry={reload} />;

  if (loading || data.requestedId !== id) return <Layout title="جاري التحميل..."><div className="p-8 text-center text-slate-400 animate-pulse">جاري التحميل...</div></Layout>;
  if (!student) return null;

  const remaining = balance ? balance.remaining : (student.totalOwed || 0) - student.totalPaid;

  // إحصائيات الحضور
  const attStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    excused: attendance.filter(a => a.status === 'excused').length,
  };
  const attTotal = attendance.length;
  const attRate = attTotal > 0 ? Math.round(((attStats.present + attStats.late) / attTotal) * 100) : null;


  return (
    <Layout title={`ملف الطالب: ${student.name}`}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 font-bold transition-colors">
          <ArrowRight size={20} /> عودة للطلاب
        </button>

        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="w-24 h-24 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex flex-shrink-0 items-center justify-center text-4xl font-bold shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            {student.gender === 'male' ? '👦' : '👧'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{student.name}</h1>
              <Badge status={student.status} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              {student.age} سنة • {student.gender === 'male' ? 'ولد' : 'بنت'}
              {student.gradeLevel ? ` • ${student.gradeLevel}` : ''}
            </p>

            {/* البيانات مكتوبة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mb-4">
              <InfoItem icon={<Phone size={15} />} label="هاتف الطالب" value={student.phone} dir="ltr" />
              <InfoItem icon={<PhoneCall size={15} />} label="هاتف ولي الأمر" value={student.parentPhone} dir="ltr" />
              <InfoItem icon={<User size={15} />} label="اسم ولي الأمر" value={student.parentName} />
              <InfoItem icon={<School size={15} />} label="المدرسة" value={student.school} />
              <InfoItem icon={<Megaphone size={15} />} label="عرف المركز عن طريق" value={student.source} />
              <InfoItem icon={<CalendarDays size={15} />} label="تاريخ التسجيل" value={formatDate(student.createdAt)} />
              {student.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoItem icon={<StickyNote size={15} />} label="ملاحظات" value={student.notes} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-medium">
              {student.phone && (
                <a href={getWhatsAppLink(student.phone)} target="_blank" rel="noreferrer" title={`واتساب الطالب ${student.phone}`}
                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 transition-all text-xs font-bold shadow-sm">
                  <MessageCircle size={14} /> واتساب الطالب
                </a>
              )}
              <a href={getWhatsAppLink(student.parentPhone)} target="_blank" rel="noreferrer" title={`واتساب ولي الأمر ${student.parentPhone}`}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 transition-all text-xs font-bold shadow-sm">
                <MessageCircle size={14} /> واتساب ولي الأمر
              </a>
              <a href={`tel:${student.parentPhone}`} className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 text-slate-700 dark:text-slate-300 transition-all text-xs font-bold shadow-sm">
                <PhoneCall size={14} /> اتصال بولي الأمر
              </a>
              <button
                type="button"
                onClick={() => printStudentCard(student, { settings, groupName: groups[0]?.name })}
                className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-3 py-1.5 rounded-xl border border-cyan-500/20 transition-all text-xs font-bold cursor-pointer shadow-sm"
                title="طباعة كارنيه الطالب مع الباركود"
              >
                <CreditCard size={14} /> طباعة الكارنيه
              </button>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-400"><Users size={14} /> {groups.length} مجموعة</div>
              {showMoney && (
                <div className={`px-3 py-1.5 rounded-xl font-bold font-mono border text-xs ${remaining > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                  {remaining > 0 ? `المتبقي: ${formatCurrency(remaining, settings?.currency)}` : 'خالص الديون'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* تنبيه تجديد: اشتراك منتهي أو قرب ينتهي */}
        {groups.some(g => renewalByGroup[g.id]?.state !== 'active' && (balance?.groups.some(b => b.groupId === g.id) ?? false)) && (
          <div className="glow-card relative bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center gap-3 overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none" />
            <RefreshCw size={18} className="text-amber-500 animate-spin" />
            <div className="flex-1 min-w-[200px] text-sm">
              <p className="font-bold text-amber-500">الاشتراك انتهى — يتطلب التجديد</p>
              <p className="text-amber-400/90 text-xs font-mono mt-0.5">
                {groups
                  .filter(g => renewalByGroup[g.id]?.state !== 'active' && balance?.groups.some(b => b.groupId === g.id))
                  .map(g => {
                    const r = renewalByGroup[g.id];
                    return `${g.name}: ${RENEWAL_STATE_LABEL[r.state]}${r.endDate ? ` (${formatDate(r.endDate)})` : ''}`;
                  })
                  .join(' • ')}
              </p>
            </div>
            {canCollect && (
              <button
                onClick={() => {
                  const g = groups.find(x => renewalByGroup[x.id]?.state !== 'active');
                  if (g) setRenewTarget({ groupId: g.id });
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
                تجديد الآن
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><BookOpen className="text-indigo-400" /> المجموعات والمدرسين</h2>
            <div className="overflow-auto flex-1 max-h-[300px]">
              <table className="w-full text-right">
                <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-bold"><th className="pb-3">المجموعة</th><th className="pb-3">الكورس</th><th className="pb-3 text-center">المدرس</th><th className="pb-3 text-center">الاشتراك</th>{canCollect && <th className="pb-3 text-center">إجراءات</th>}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {groups.length === 0 ? <tr><td colSpan={canCollect ? 5 : 4} className="py-8 text-center text-slate-400">لا توجد مجموعات</td></tr> :
                    groups.map(g => {
                      const r = renewalByGroup[g.id];
                      const en = enrollmentByGroup[g.id];
                      const hasPlan = !!r && r.periods > 0;
                      return (
                        <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-bold text-slate-900 dark:text-white">
                            {g.name}
                            {en?.renewalCount ? <span className="block text-[10px] font-mono text-slate-400">تجدد {en.renewalCount} مرة</span> : null}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">{g.courseName}</td>
                          <td className="py-3 text-center text-cyan-600 dark:text-cyan-400 font-medium hover:underline cursor-pointer" onClick={() => navigate(`/teachers/${g.teacherId}`)}>{g.teacherName}</td>
                          <td className="py-3 text-center">
                            {hasPlan ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${RENEWAL_STYLE[r.state]}`}
                                title={r.endDate ? `ينتهي ${formatDate(r.endDate)}` : ''}>
                                {RENEWAL_STATE_LABEL[r.state]}
                                {r.endDate && <span className="block font-mono text-[10px] opacity-80">حتى {formatDate(r.endDate)}</span>}
                              </span>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          {canCollect && (
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onClick={() => setRenewTarget({ groupId: g.id })}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${r?.state === 'expired' ? 'text-white bg-rose-600 hover:bg-rose-500 shadow-sm' : r?.state === 'expiring' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                  title="تجديد الاشتراك في نفس المجموعة">
                                  <RefreshCw size={12} /> تجديد
                                </button>
                                <button disabled={!can('students', 'edit')} onClick={() => setTransferFrom({ groupId: g.id, groupName: g.name })}
                                  className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-2.5 py-1 rounded-lg font-bold transition-all">
                                  تحويل
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {showMoney && (
            <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="text-cyan-400" /> سجل المدفوعات</h2>
              <div className="overflow-auto flex-1 max-h-[300px]">
                <table className="w-full text-right">
                  <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-bold"><th className="pb-3">المبلغ</th><th className="pb-3">النوع</th><th className="pb-3 text-center">التاريخ</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {payments.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400">لا يوجد مدفوعات</td></tr> :
                      payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount, settings?.currency)}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">{p.type === 'subscription' ? 'اشتراك' : p.type === 'books' ? 'كتب' : 'أخرى'}</td>
                          <td className="py-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{formatDate(p.date)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* الحساب — شهر بشهر */}
        {showMoney && (
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="text-cyan-400" /> الحساب التفصيلي
              </h2>
              {balance && (
                <span className={`mr-auto text-sm font-bold font-mono px-3 py-1 rounded-full border ${balance.remaining > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                  {balance.remaining > 0
                    ? `باقي عليه: ${formatCurrency(balance.remaining, settings?.currency)}`
                    : 'خالص'}
                </span>
              )}
            </div>

            {!balance || balance.groups.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-sm">الطالب مش مسجل في أي مجموعة لسه</p>
            ) : (
              <div className="space-y-4">
                {balance.groups.map(g => {
                  const r = renewalByGroup[g.groupId];
                  const months = g.installments
                    .slice()
                    .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.periodIndex - a.periodIndex);
                  return (
                    <div key={g.groupId} className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/30 dark:bg-white/[0.01]">
                      {/* رأس المجموعة */}
                      <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-100/60 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                        <div className="flex-1 min-w-[150px]">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{g.groupName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {g.courseName}
                            {r && r.periods > 0 && r.endDate && (
                              <> • <span className={r.state === 'expired' ? 'text-rose-500 font-bold font-mono' : r.state === 'expiring' ? 'text-amber-500 font-bold font-mono' : 'font-mono'}>
                                {r.state === 'expired' ? `انتهى ${formatDate(r.endDate)}` : `مدفوع حتى ${formatDate(r.endDate)}`}
                              </span></>
                            )}
                          </p>
                        </div>
                        <div className="text-xs text-center px-2">
                          <p className="text-slate-400">مدفوع</p>
                          <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(g.paid, settings?.currency)}</p>
                        </div>
                        <div className="text-xs text-center px-2">
                          <p className="text-slate-400">باقي</p>
                          <p className={`font-mono font-bold ${g.remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {g.remaining > 0 ? formatCurrency(g.remaining, settings?.currency) : 'خالص'}
                          </p>
                        </div>
                        {canCollect && g.remaining > 0 && (
                          <button onClick={() => openPay(g.groupId, g.groupName, g.remaining)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-sm transition-all">
                            تحصيل
                          </button>
                        )}
                        {canCollect && groups.some(x => x.id === g.groupId) && (
                          <button onClick={() => setRenewTarget({ groupId: g.groupId })}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 transition-all"
                            title="تجديد">
                            <RefreshCw size={12} /> تجديد
                          </button>
                        )}
                      </div>
                      {/* الشهور */}
                      <table className="w-full text-right text-sm">
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {months.map(i => {
                            const left = Math.max(0, i.amount - i.paidAmount);
                            const label = i.status === 'paid' ? 'مدفوع'
                              : i.paidAmount > 0 ? `باقي ${formatCurrency(left, settings?.currency)}`
                                : 'لم يدفع';
                            const cls = i.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : i.paidAmount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
                            return (
                              <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">{i.periodLabel}</td>
                                <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{formatDate(i.dueDate)}</td>
                                <td className="py-2.5 px-3.5 text-center font-mono text-slate-700 dark:text-slate-300">{formatCurrency(i.amount, settings?.currency)}</td>
                                <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(i.paidAmount, settings?.currency)}</td>
                                <td className="py-2.5 px-3.5 text-left">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* سجل التحويلات */}
        {transfers.length > 0 && (
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowLeftRight className="text-cyan-400" /> سجل التحويلات
              <span className="text-xs font-mono text-slate-400">({transfers.length})</span>
            </h2>
            <div className="overflow-auto max-h-[220px]">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <th className="pb-3">التاريخ</th>
                    <th className="pb-3">من</th>
                    <th className="pb-3">إلى</th>
                    <th className="pb-3">السبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {transfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400 text-xs">{formatDate(t.date)}</td>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{t.fromGroupName}</td>
                      <td className="py-2.5 font-bold text-cyan-600 dark:text-cyan-400">{t.toGroupName}</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400 text-xs">{t.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ملخص الحضور */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardCheck className="text-cyan-400" /> سجل الحضور
              {attRate !== null && (
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full mr-auto border ${attRate >= 75 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : attRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
                  نسبة الحضور {attRate}%
                </span>
              )}
            </h2>
            {attTotal === 0 ? (
              <p className="py-8 text-center text-slate-400 text-sm">لا يوجد سجل حضور بعد</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2.5 mb-4 text-center text-sm">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3"><p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xl">{attStats.present}</p><p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">حضور</p></div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3"><p className="font-mono font-black text-rose-600 dark:text-rose-400 text-xl">{attStats.absent}</p><p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">غياب</p></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3"><p className="font-mono font-black text-amber-500 dark:text-amber-400 text-xl">{attStats.late}</p><p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">تأخير</p></div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-3"><p className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-xl">{attStats.excused}</p><p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">استئذان</p></div>
                </div>
                <div className="overflow-auto flex-1 max-h-[200px]">
                  <table className="w-full text-right">
                    <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400"><th className="pb-2">التاريخ</th><th className="pb-2 text-center">الحالة</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                      {attendance.slice(0, 15).map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{formatDate(a.date)}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${a.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                a.status === 'absent' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                  a.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                              }`}>
                              {a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غائب' : a.status === 'late' ? 'متأخر' : 'مستأذن'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* نتائج الامتحانات */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><GraduationCap className="text-cyan-400" /> نتائج الامتحانات</h2>
            <div className="overflow-auto flex-1 max-h-[300px]">
              <table className="w-full text-right">
                <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400"><th className="pb-3">الامتحان</th><th className="pb-3 text-center">الدرجة</th><th className="pb-3 text-center">النسبة</th><th className="pb-3 text-center">التاريخ</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {examResults.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-slate-400">لا توجد نتائج بعد</td></tr> :
                    examResults.map(r => {
                      const pct = r.maxGrade > 0 ? Math.round((r.grade / r.maxGrade) * 100) : 0;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-bold text-slate-900 dark:text-white">{r.examName}</td>
                          <td className="py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{r.grade} / {r.maxGrade}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${pct >= 75 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : pct >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>{pct}%</span>
                          </td>
                          <td className="py-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{formatDate(r.examDate)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* تحويل لمجموعة/مدرس آخر */}
      {transferFrom && (
        <TransferDialog
          open={!!transferFrom}
          studentId={student.id}
          studentName={student.name}
          fromGroupId={transferFrom.groupId}
          groups={allGroups}
          courses={allCourses}
          teachers={allTeachers}
          onClose={() => setTransferFrom(null)}
          onDone={() => loadData()}
        />
      )}

      {/* تجديد / استكمال الاشتراك */}
      {renewTarget && (
        <RenewDialog
          open={!!renewTarget}
          studentId={student.id}
          studentName={student.name}
          groupId={renewTarget.groupId}
          onClose={() => setRenewTarget(null)}
          onDone={() => loadData()}
        />
      )}

      {/* نافذة تحصيل دفعة (كاملة أو جزئية) */}
      <QuickCollectDialog
        isOpen={!!payTarget}
        target={payTarget ? {
          studentId: id || '',
          studentName: student.name,
          remaining: payTarget.remaining,
          groupId: payTarget.groupId,
          groupName: payTarget.label,
        } : null}
        onClose={() => setPayTarget(null)}
        onSuccess={loadData}
      />
    </Layout>
  );
}
