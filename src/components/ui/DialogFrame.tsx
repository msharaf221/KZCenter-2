import type { ReactNode } from 'react';
import { useDialogLifecycle } from '../../hooks/useDialogLifecycle';

interface Props {
  open: boolean;
  onDismiss: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  children: ReactNode;
}

/** Single overlay/panel primitive; no native browser/Electron confirmation windows. */
export default function DialogFrame({
  open,
  onDismiss,
  labelledBy,
  describedBy,
  role = 'dialog',
  className = '',
  children,
}: Props) {
  const panelRef = useDialogLifecycle(open, onDismiss);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 w-full fade-in overflow-hidden ${className}`}
      >
        {/* Subtle luminous top highlight ray */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
