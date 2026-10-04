import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { DashboardData } from '../../services/queries/dashboard';

interface DashboardChartsProps {
  showMoney: boolean;
  revenueData: DashboardData['revenueData'];
  genderData: DashboardData['genderData'];
  primaryColor: string;
  currency?: string;
}

export default function DashboardCharts({
  showMoney,
  revenueData,
  genderData,
  primaryColor,
  currency,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Chart */}
      {showMoney && (
        <div className="glow-card relative lg:col-span-2 bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">الإيرادات الشهرية</h3>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              محدث لحظياً
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor || '#06b6d4'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={primaryColor || '#06b6d4'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                }}
                formatter={(v) => [formatCurrency(Number(v), currency), 'الإيرادات']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={primaryColor || '#06b6d4'}
                fill="url(#revenue)"
                strokeWidth={3}
                dot={{ r: 4, fill: primaryColor || '#06b6d4', strokeWidth: 2, stroke: '#070b14' }}
                activeDot={{ r: 6, fill: '#00f0ff', stroke: '#070b14', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gender Pie */}
      <div className={`glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden ${showMoney ? '' : 'lg:col-span-3'}`}>
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">توزيع الطلاب (ذكور وإناث)</h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              <Cell fill="#06b6d4" />
              <Cell fill="#ec4899" />
            </Pie>
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
