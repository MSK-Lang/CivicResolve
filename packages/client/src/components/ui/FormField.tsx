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
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-ink-primary uppercase tracking-wider"
        >
          {label}
          {required && (
            <span className="ml-1 text-accent" title="Required field" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {required && (
          <span className="text-[10px] text-ink-muted uppercase font-mono tracking-wider">
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
          className="text-xs font-medium text-[#8A2222] pt-0.5"
        >
          {error}
        </p>
      )}
    </div>
  );
}
