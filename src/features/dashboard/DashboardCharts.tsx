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
        <div className="glow-card relative lg:col-span-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">الإيرادات الشهرية</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              محدث لحظياً
            </span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                }}
                formatter={(v) => [formatCurrency(Number(v), currency), 'الإيرادات']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={primaryColor}
                fill="url(#revenue)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gender Pie */}
      <div className={`glow-card relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] p-6 ${showMoney ? '' : 'lg:col-span-3'}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">توزيع الطلاب (ذكور وإناث)</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              <Cell fill="#6366f1" />
              <Cell fill="#ec4899" />
            </Pie>
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
