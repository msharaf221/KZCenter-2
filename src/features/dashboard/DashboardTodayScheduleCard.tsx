import { formatDate, getArabicDay, getStatusLabel } from '../../lib/utils';
import type { DashboardData } from '../../services/queries/dashboard';

interface DashboardTodayScheduleCardProps {
  todayGroups: DashboardData['todayGroups'];
  recentStudents: DashboardData['recentStudents'];
  todayKey: string;
}

export default function DashboardTodayScheduleCard({
  todayGroups,
  recentStudents,
  todayKey,
}: DashboardTodayScheduleCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Today's Groups */}
      <div className="glow-card relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200/70 dark:border-slate-800/70">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            حصص اليوم — {getArabicDay(todayKey)}
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          {todayGroups.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm font-medium">لا توجد حصص مجدولة لليوم</p>
          ) : (
            <div className="space-y-2.5">
              {todayGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {group.courseName} • {group.teacherName}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    {group.schedule
                      .filter((s) => s.days.includes(todayKey))
                      .map((s, i) => (
                        <p key={i} className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                          {s.startTime} - {s.endTime}
                        </p>
                      ))}
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{group.studentIds.length} طالب</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Students */}
      <div className="glow-card relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200/70 dark:border-slate-800/70">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">آخر الطلاب المسجلين</h3>
        </div>
        <div className="p-4 sm:p-6">
          {recentStudents.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm font-medium">لا يوجد طلاب مسجلون حتى الآن</p>
          ) : (
            <div className="space-y-2.5">
              {recentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                    {student.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{student.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" dir="ltr">{student.parentPhone}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                        ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      {getStatusLabel(student.status)}
                    </span>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1" dir="ltr">{formatDate(student.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
