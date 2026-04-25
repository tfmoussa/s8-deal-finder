import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full h-9 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none',
            error && 'border-red-400 focus:border-red-400',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Select;
