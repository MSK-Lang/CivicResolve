import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError = false, className = '', disabled, children, options, ...props },
  ref
) {
  const baseClasses =
    'w-full min-h-[44px] px-3 py-2 bg-surface text-ink-primary text-sm rounded ' +
    'border transition-colors appearance-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none';

  const stateClasses = hasError
    ? 'border-[#8A2222] focus-visible:outline-[#8A2222]'
    : 'border-border focus-visible:outline-accent';

  return (
    <div className="relative w-full">
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={`${baseClasses} ${stateClasses} pr-9 ${className}`}
        {...props}
      >
        {options
          ? options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-ink-muted"
        aria-hidden="true"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
});
