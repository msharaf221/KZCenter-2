import { X } from 'lucide-react';
import { ReactNode, useId } from 'react';
import DialogFrame from './DialogFrame';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <DialogFrame
      open={isOpen}
      onDismiss={onClose}
      labelledBy={titleId}
      className={`${sizeClasses[size]} max-h-[90vh] flex flex-col`}
    >
      <div className="flex items-center justify-between p-5 border-b border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03] gap-4">
        <h2 id={titleId} className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate min-w-0">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-5 sm:p-6">{children}</div>
    </DialogFrame>
  );
}
