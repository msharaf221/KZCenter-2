import { MessageCircle, RefreshCw } from 'lucide-react';
import { RENEWAL_STATE_LABEL } from '../../lib/billing';
import { formatCurrency, formatDate, getWhatsAppLink } from '../../lib/utils';
import type { DashboardData } from '../../services/queries/dashboard';
import type { RenewalCandidate } from '../../services/renewalService';

interface DashboardRenewalsCardProps {
  renewals: DashboardData['renewals'];
  showMoney: boolean;
  canRenew: boolean;
  centerName?: string;
  currency?: string;
  onNavigateToStudent: (studentId: string) => void;
  onSelectRenew: (candidate: RenewalCandidate) => void;
}

export default function DashboardRenewalsCard({
  renewals,
  showMoney,
  canRenew,
  centerName,
  currency,
  onNavigateToStudent,
  onSelectRenew,
}: DashboardRenewalsCardProps) {
  if (renewals.length === 0) return null;

  return (
    <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-amber-500/20 shadow-sm overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />
      <div className="p-5 sm:p-6 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <RefreshCw size={18} className="animate-spin-slow" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            طلاب محتاجين تجديد
          </h3>
          <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
            {renewals.filter((r) => r.info.state === 'expired').length} منتهي •{' '}
            {renewals.filter((r) => r.info.state === 'expiring').length} يقترب
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-2.5">
        {renewals.slice(0, 8).map((r) => (
          <div
            key={`${r.studentId}-${r.groupId}`}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 hover:bg-amber-500/15 transition-all"
          >
            <button onClick={() => onNavigateToStudent(r.studentId)} className="flex-1 min-w-0 text-right cursor-pointer">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{r.studentName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {r.groupName} • {r.courseName} • {r.teacherName}
                {showMoney && r.remaining > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold"> • متبقي {formatCurrency(r.remaining, currency)}</span>
                )}
              </p>
            </button>
            <div className="text-left shrink-0">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  r.info.state === 'expired'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {RENEWAL_STATE_LABEL[r.info.state]}
              </span>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                {r.info.endDate ? formatDate(r.info.endDate) : ''}
                {typeof r.info.daysLeft === 'number' &&
                  (r.info.daysLeft > 0 ? ` · باقي ${r.info.daysLeft} يوم` : ` · من ${Math.abs(r.info.daysLeft)} يوم`)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.parentPhone && (
                <a
                  href={getWhatsAppLink(
                    r.parentPhone,
                    `السلام عليكم، معكم ${centerName || 'المركز'}.\nشهر ${r.studentName} في ${r.groupName} ${
                      r.info.state === 'expired' ? 'خلص' : 'بيخلص'
                    }${r.info.endDate ? ` (${formatDate(r.info.endDate)})` : ''}. يسعدنا استمراركم معنا — برجاء التواصل لتجديد الشهر.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                  title={`واتساب ولي الأمر ${r.parentPhone}`}
                >
                  <MessageCircle size={15} />
                </a>
              )}
              {canRenew && (
                <button
                  onClick={() => onSelectRenew(r)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  تجديد
                </button>
              )}
            </div>
          </div>
        ))}
        {renewals.length > 8 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-2 font-medium">
            و{renewals.length - 8} طالب آخر — افتح ملف الطالب
          </p>
        )}
      </div>
    </div>
  );
}
