import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:pointer-events-none select-none',
          // Variants
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
          variant === 'secondary' && 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300',
          variant === 'outline' && 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]',
          variant === 'ghost' && 'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]',
          variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
          // Sizes
          size === 'sm' && 'text-xs px-2.5 py-1.5 h-7',
          size === 'md' && 'text-sm px-3.5 py-2 h-9',
          size === 'lg' && 'text-base px-5 py-2.5 h-11',
          size === 'icon' && 'w-9 h-9 p-0',
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
