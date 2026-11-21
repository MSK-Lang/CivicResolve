import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className = '', disabled, ...props },
  ref
) {
  const baseClasses =
    'w-full min-h-[44px] px-3 py-2 bg-surface text-ink-primary text-sm rounded ' +
    'border transition-colors placeholder:text-ink-muted ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none';

  const stateClasses = hasError
    ? 'border-[#8A2222] focus-visible:outline-[#8A2222]'
    : 'border-border focus-visible:outline-accent';

  return (
    <input
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError ? true : undefined}
      className={`${baseClasses} ${stateClasses} ${className}`}
      {...props}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError = false, className = '', disabled, rows = 4, ...props },
  ref
) {
  const baseClasses =
    'w-full min-h-[88px] px-3 py-2 bg-surface text-ink-primary text-sm rounded ' +
    'border transition-colors placeholder:text-ink-muted leading-relaxed ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none';

  const stateClasses = hasError
    ? 'border-[#8A2222] focus-visible:outline-[#8A2222]'
    : 'border-border focus-visible:outline-accent';

  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={hasError ? true : undefined}
      className={`${baseClasses} ${stateClasses} ${className}`}
      {...props}
    />
  );
});
