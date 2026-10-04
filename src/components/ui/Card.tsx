import { ReactNode } from 'react';
import { getContrastColor } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({ children, className = '', onClick, hoverable = true }: CardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={`
        relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl
        rounded-2xl border border-slate-200/80 dark:border-white/10
        shadow-[0_4px_24px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)]
        transition-all duration-300 overflow-hidden
        ${hoverable && isInteractive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/40 dark:hover:border-cyan-400/40' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Specular top border light */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  subtitle?: string;
  trend?: { value: number; up: boolean };
  onClick?: () => void;
}

export function StatCard({ title, value, icon, color, subtitle, trend, onClick }: StatCardProps) {
  const contrast = getContrastColor(color);

  return (
    <div
      onClick={onClick}
      className={`
        glow-card group relative p-5 rounded-2xl
        bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl
        border border-slate-200/80 dark:border-white/10
        shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)]
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:border-indigo-500/40 dark:hover:border-cyan-400/40' : ''}
      `}
    >
      {/* Top luminous highlight ray */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-80 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight telemetry-number">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5 truncate font-medium">
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: trend.up ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: trend.up ? '#10b981' : '#f43f5e',
                border: `1px solid ${trend.up ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
              }}
            >
              <span>{trend.up ? '↑' : '↓'}</span>
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Glowing Icon Container */}
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-2xl blur-md opacity-35 group-hover:opacity-75 transition-opacity"
            style={{ backgroundColor: color }}
          />
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: color,
              color: contrast,
            }}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
