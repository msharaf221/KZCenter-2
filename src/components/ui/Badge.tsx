import { getStatusColor, getStatusLabel } from '../../lib/utils';

interface BadgeProps {
  status: string;
  label?: string;
  dot?: boolean;
}

export default function Badge({ status, label, dot = true }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
        border border-black/5 dark:border-white/10 shadow-xs tracking-wide transition-colors
        ${getStatusColor(status)}
      `}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      )}
      <span>{label || getStatusLabel(status)}</span>
    </span>
  );
}
