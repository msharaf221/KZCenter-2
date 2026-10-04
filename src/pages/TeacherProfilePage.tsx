import { ArrowRight, Banknote, BookOpen, CalendarDays, GraduationCap, Mail, MessageCircle, Phone, PhoneCall, StickyNote, Users2, Wallet } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import Badge from '../components/ui/Badge';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { describeTeacherPay } from '../domain/payroll/settings';
import { usePageResource } from '../hooks/usePageResource';
import { formatCurrency, formatDate, getWhatsAppLink } from '../lib/utils';
import { emptyTeacherProfile, loadTeacherProfile } from '../services/queries/teacherProfile';

/** عنصر بيانات مكتوب (اسم الحقل + القيمة) */
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

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useApp();
  const { can } = useAuth();
  const showMoney = can('payroll', 'view');
  const query = useCallback(() => loadTeacherProfile(id || ''), [id]);
  const { data, loading, error, reload } = usePageResource(query, emptyTeacherProfile());
  const { teacher, groups, students, expenses } = data;
  useEffect(() => {
    if (!loading && !error && data.requestedId === id && !data.teacher) navigate('/teachers');
  }, [loading, error, data, id, navigate]);

  if (error) return <PageReadError title="ملف المدرس" onRetry={reload} />;

  if (loading || data.requestedId !== id) return <Layout title="جاري التحميل..."><div className="p-8 text-center text-slate-400 animate-pulse">جاري التحميل...</div></Layout>;
  if (!teacher) return null;

  const totalPaid = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout title={`ملف المدرس: ${teacher.name}`}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header/Back */}
        <button onClick={() => navigate('/teachers')} className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 font-bold transition-colors">
          <ArrowRight size={20} /> عودة للمدرسين
        </button>

        {/* Profile Card */}
        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex flex-shrink-0 items-center justify-center text-4xl font-bold shadow-[0_0_20px_rgba(0,240,255,0.25)] border border-white/20">
            {teacher.avatar ? <img src={teacher.avatar} alt="avatar" className="w-full h-full object-cover rounded-2xl" /> : teacher.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{teacher.name}</h1>
              <Badge status={teacher.status} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{teacher.specialization}</p>

            {/* البيانات مكتوبة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mb-4">
              <InfoItem icon={<Phone size={15} />} label="رقم الهاتف" value={teacher.phone} dir="ltr" />
              <InfoItem icon={<Mail size={15} />} label="البريد الإلكتروني" value={teacher.email} dir="ltr" />
              <InfoItem icon={<BookOpen size={15} />} label="التخصص" value={teacher.specialization} />
              {showMoney && (
                <InfoItem icon={<Wallet size={15} />} label="طريقة حساب المستحقات" value={describeTeacherPay(teacher, settings?.currency)} />
              )}
              <InfoItem icon={<CalendarDays size={15} />} label="تاريخ الانضمام" value={formatDate(teacher.createdAt)} />
              {showMoney && teacher.payNotes && (
                <InfoItem icon={<StickyNote size={15} />} label="ملاحظات المستحقات" value={teacher.payNotes} />
              )}
              {teacher.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoItem icon={<StickyNote size={15} />} label="ملاحظات" value={teacher.notes} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {showMoney && (
                <button onClick={() => navigate('/payroll')}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                  <Banknote size={14} /> إضافة دفعة راتب
                </button>
              )}
              <a href={getWhatsAppLink(teacher.phone)} target="_blank" rel="noreferrer" title={`واتساب ${teacher.phone}`}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 transition-all shadow-sm">
                <MessageCircle size={14} /> واتساب
              </a>
              <a href={`tel:${teacher.phone}`}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 text-slate-700 dark:text-slate-300 transition-all shadow-sm">
                <PhoneCall size={14} /> اتصال
              </a>
              {teacher.email && (
                <a href={`mailto:${teacher.email}`}
                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 text-slate-700 dark:text-slate-300 transition-all shadow-sm">
                  <Mail size={14} /> إيميل
                </a>
              )}
              <div className="bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-slate-600 dark:text-slate-400">{students.length} طالب</div>
              <div className="bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-slate-600 dark:text-slate-400">{groups.length} مجموعة</div>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Expenses/Salaries Payments */}
          {showMoney && (
            <div className="lg:col-span-2 glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
              <div className="flex justify-between items-center mb-4 border-b border-slate-200/80 dark:border-white/10 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="text-emerald-400" /> دفعات الرواتب
                </h2>
                <div className="flex items-center gap-6">
                  <div className="text-left">
                    <p className="text-xs text-slate-400">الراتب المتوقع (شهرياً)</p>
                    <p className="text-lg font-bold font-mono text-cyan-500 dark:text-cyan-400" dir="ltr">
                      {(() => {
                        if (teacher.payModel === 'fixed') return formatCurrency(teacher.salary || 0, settings?.currency);
                        if (teacher.payModel === 'per_student') return formatCurrency(students.length * (teacher.payRate || 0), settings?.currency);
                        if (teacher.payModel === 'per_group') return formatCurrency(groups.length * (teacher.payRate || 0), settings?.currency);
                        if (teacher.payModel === 'percentage' || teacher.payModel === 'subscription_percentage') return `نسبة (${teacher.payRate || 0}%)`;
                        return formatCurrency(teacher.salary || 0, settings?.currency);
                      })()}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-white/10"></div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">المنصرف ({expenses.length})</p>
                    <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">{formatCurrency(totalPaid, settings?.currency)}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1 max-h-[300px]">
                <table className="w-full text-right">
                  <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-bold"><th className="pb-3">التاريخ</th><th className="pb-3">المبلغ</th><th className="pb-3">البيان</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {expenses.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400">لا توجد دفعات رواتب مسجلة لهذا المدرس</td></tr> :
                     expenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">{formatDate(e.date, 'YYYY/MM/DD')}</td>
                        <td className="py-3 font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(e.amount, settings?.currency)}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-300 truncate">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Groups */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Users2 className="text-cyan-400" /> مجموعات المدرس</h2>
            <div className="overflow-auto flex-1">
              <table className="w-full text-right">
                <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-bold"><th className="pb-3">المجموعة</th><th className="pb-3">الكورس</th><th className="pb-3 text-center">الطلاب</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {groups.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400">لا توجد مجموعات</td></tr> :
                   groups.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => navigate(`/groups/${g.id}`)}>
                      <td className="py-3 font-bold text-cyan-600 dark:text-cyan-400 hover:underline">{g.name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{g.courseName}</td>
                      <td className="py-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{g.studentIds.length}/{g.maxStudents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Students */}
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><GraduationCap className="text-cyan-400" /> الطلاب ({students.length})</h2>
            <div className="overflow-auto flex-1 max-h-[400px]">
              <table className="w-full text-right">
                <thead><tr className="border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-bold"><th className="pb-3">اسم الطالب</th><th className="pb-3 text-center">المتبقي</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {students.length === 0 ? <tr><td colSpan={2} className="py-8 text-center text-slate-400">لا يوجد طلاب</td></tr> :
                   students.map(s => {
                     const remaining = (s.totalOwed || 0) - s.totalPaid;
                     return (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => navigate(`/students/${s.id}`)}>
                        <td className="py-3 font-bold text-cyan-600 dark:text-cyan-400 hover:underline">{s.name}</td>
                        <td className="py-3 text-center">
                          {remaining > 0 ? <span className="font-mono font-bold text-rose-500">{formatCurrency(remaining, settings?.currency)}</span> : <span className="text-slate-400 font-mono text-xs">—</span>}
                        </td>
                      </tr>
                     );
                   })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
