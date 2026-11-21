import React from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = '',
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // Clone single child to inject id and aria attributes if it is a valid React element
  const renderedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{
        id?: string;
        hasError?: boolean;
        'aria-describedby'?: string;
      }>, {
        id: (children.props as { id?: string }).id || id,
        hasError: Boolean(error) || (children.props as { hasError?: boolean }).hasError,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-ink-primary tracking-tight"
        >
          {label}
          {required && (
            <span className="ml-1 text-terracotta-700" title="Required field" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {required && (
          <span className="text-xs text-ink-muted uppercase tracking-wider font-mono">
            Required
          </span>
        )}
      </div>

      {hint && (
        <p id={hintId} className="text-xs text-ink-secondary leading-normal">
          {hint}
        </p>
      )}

      {renderedChild}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-red-700 flex items-center gap-1.5 pt-0.5"
        >
          <span aria-hidden="true" className="font-bold">!</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
