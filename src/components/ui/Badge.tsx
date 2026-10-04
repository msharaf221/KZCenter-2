import { getStatusColor, getStatusLabel } from '../../lib/utils';

interface BadgeProps {
  status: string;
  label?: string;
  dot?: boolean;
}

export default function Badge({ status, label, dot = true }: BadgeProps) {
  const isPulseActive = ['active', 'paid', 'present', 'open'].includes(status.toLowerCase());
  const isAlert = ['late', 'absent', 'suspended', 'debt'].includes(status.toLowerCase());

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
        border border-black/5 dark:border-white/10 shadow-xs tracking-wide transition-all
        backdrop-blur-md ${getStatusColor(status)}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
          {isPulseActive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
          )}
          {isAlert && (
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-current opacity-70" />
          )}
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      <span>{label || getStatusLabel(status)}</span>
    </span>
  );
}
