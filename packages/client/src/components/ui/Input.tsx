import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className = '', disabled, ...props },
  ref
) {
  const baseClasses =
    'w-full min-h-[44px] px-3.5 py-2.5 bg-paper-card text-ink-primary text-sm rounded-md ' +
    'border transition-colors placeholder:text-ink-muted ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none';

  const stateClasses = hasError
    ? 'border-red-600 focus-visible:outline-red-700 focus-visible:border-red-600'
    : 'border-border-strong focus-visible:outline-civic-800 focus-visible:border-civic-800';

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
    'w-full min-h-[88px] px-3.5 py-2.5 bg-paper-card text-ink-primary text-sm rounded-md ' +
    'border transition-colors placeholder:text-ink-muted leading-relaxed ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none';

  const stateClasses = hasError
    ? 'border-red-600 focus-visible:outline-red-700 focus-visible:border-red-600'
    : 'border-border-strong focus-visible:outline-civic-800 focus-visible:border-civic-800';

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
