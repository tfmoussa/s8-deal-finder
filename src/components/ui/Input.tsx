import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-2.5 text-[var(--muted-foreground)] text-sm select-none pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              prefix && 'pl-7',
              suffix && 'pr-7',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-400/30',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-2.5 text-[var(--muted-foreground)] text-sm select-none pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export default Input;
