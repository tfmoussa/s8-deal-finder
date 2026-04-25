import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'blue';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-slate-100 text-slate-700',
        variant === 'success' && 'bg-emerald-100 text-emerald-700',
        variant === 'warning' && 'bg-amber-100 text-amber-700',
        variant === 'danger'  && 'bg-red-100 text-red-700',
        variant === 'muted'   && 'bg-slate-100 text-slate-500',
        variant === 'blue'    && 'bg-blue-100 text-blue-700',
        className
      )}
    >
      {children}
    </span>
  );
}
