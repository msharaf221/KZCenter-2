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
        relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm
        rounded-2xl border border-slate-200/80 dark:border-slate-800/80
        shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]
        transition-all duration-300
        ${hoverable && isInteractive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30' : ''}
        ${className}
      `}
      onClick={onClick}
    >
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
        bg-white/95 dark:bg-slate-900/90 backdrop-blur-md
        border border-slate-200/80 dark:border-slate-800/80
        shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)]
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:border-indigo-500/40 dark:hover:border-indigo-500/40' : ''}
      `}
    >
      {/* Top luminous highlight ray */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: trend.up ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: trend.up ? '#16a34a' : '#dc2626',
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
            className="absolute inset-0 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition-opacity"
            style={{ backgroundColor: color }}
          />
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105"
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
