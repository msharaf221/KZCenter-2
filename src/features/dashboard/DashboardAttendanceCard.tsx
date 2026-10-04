import { Users2 } from 'lucide-react';
import type { DashboardData } from '../../services/queries/dashboard';

interface DashboardAttendanceCardProps {
  todayAttendance: DashboardData['todayAttendance'];
}

export default function DashboardAttendanceCard({ todayAttendance }: DashboardAttendanceCardProps) {
  const items = [
    { label: 'حاضر', value: todayAttendance.present, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    { label: 'غائب', value: todayAttendance.absent, cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' },
    { label: 'متأخر', value: todayAttendance.late, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
    { label: 'مستأذن', value: todayAttendance.excused, cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
  ];

  return (
    <div className="glow-card relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            <Users2 size={18} />
          </div>
          <span>حضور اليوم</span>
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {todayAttendance.recordedGroups} مجموعة مسجّلة
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className={`rounded-2xl p-4 text-center transition-transform hover:scale-105 duration-200 ${it.cls}`}>
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">{it.value}</p>
            <p className="text-xs font-bold mt-1 tracking-wide">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
