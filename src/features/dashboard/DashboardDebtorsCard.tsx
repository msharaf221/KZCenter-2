import { AlertTriangle } from 'lucide-react';
import type { DebtAlert } from '../../lib/debtAlerts';
import { formatCurrency } from '../../lib/utils';
import type { DebtorRow } from '../../services/balanceService';

interface DashboardDebtorsCardProps {
  canSeeDebtors: boolean;
  topDebtors: DebtorRow[];
  debtAlert: DebtAlert | null;
  currency?: string;
  onNavigateToDebtors: () => void;
  onNavigateToStudent: (studentId: string) => void;
}

export default function DashboardDebtorsCard({
  canSeeDebtors,
  topDebtors,
  debtAlert,
  currency,
  onNavigateToDebtors,
  onNavigateToStudent,
}: DashboardDebtorsCardProps) {
  if (!canSeeDebtors || topDebtors.length === 0) return null;

  return (
    <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-rose-500/20 shadow-sm overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
      <div className="p-5 sm:p-6 border-b border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">أعلى المديونيات</h3>
          <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold">
            {debtAlert?.debtorsCount} طالب • {formatCurrency(debtAlert?.totalRemaining || 0, currency)}
          </span>
        </div>
        <button
          onClick={onNavigateToDebtors}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
        >
          عرض كل المديونيات ←
        </button>
      </div>
      <div className="p-4 sm:p-6 space-y-2">
        {topDebtors.map((d) => (
          <button
            key={d.studentId}
            onClick={() => onNavigateToStudent(d.studentId)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/10 transition-all text-right cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{d.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {d.groups.map((g) => g.groupName).join('، ') || '—'}
                {d.overdueCount > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold"> • متأخر</span>}
              </p>
            </div>
            <div className="text-left shrink-0">
              <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(d.remaining, currency)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {d.lastPaymentDate ? `آخر دفعة من ${d.daysSinceLastPayment} يوم` : 'لم يدفع بعد'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
