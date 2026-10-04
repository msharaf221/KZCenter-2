import { Clock } from 'lucide-react';
import { installmentRemaining } from '../../lib/billing';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { DashboardData } from '../../services/queries/dashboard';

interface DashboardUpcomingCardProps {
  upcoming: DashboardData['upcoming'];
  recentStudents: DashboardData['recentStudents'];
  upcomingDueDays?: number;
  currency?: string;
  onNavigateToPayments: () => void;
}

export default function DashboardUpcomingCard({
  upcoming,
  recentStudents,
  upcomingDueDays = 3,
  currency,
  onNavigateToPayments,
}: DashboardUpcomingCardProps) {
  if (!upcoming || upcoming.count <= 0) return null;

  return (
    <div className="glow-card relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-amber-500/20 dark:border-amber-500/20 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Clock size={18} />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            مطلوب دفعه خلال {upcomingDueDays} يوم
          </h3>
          <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
            {upcoming.count} طالب • {formatCurrency(upcoming.amount, currency)}
          </span>
        </div>
        <button
          onClick={onNavigateToPayments}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
        >
          تحصيل الأقساط ←
        </button>
      </div>
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {upcoming.items.slice(0, 6).map((item) => {
          const st = recentStudents.find((x) => x.id === item.studentId);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 transition-all hover:bg-amber-500/10"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{st?.name || 'طالب'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  يستحق {formatDate(item.dueDate)}
                  <span className={item.daysUntilDue <= 1 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                    {' '}• {item.daysUntilDue === 0 ? 'النهاردة' : `بعد ${item.daysUntilDue} يوم`}
                  </span>
                </p>
              </div>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400 shrink-0 font-mono">
                {formatCurrency(installmentRemaining(item), currency)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
