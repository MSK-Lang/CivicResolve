import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = 'Loading...',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center p-8 text-ink-secondary ${className}`}
    >
      <Loader2
        className="w-5 h-5 animate-spin text-accent mb-2 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-xs text-ink-secondary">{label}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded border border-border p-6 text-center bg-surface my-4 ${className}`}
    >
      <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface-subtle text-ink-muted mb-2.5">
        {icon || <Inbox className="w-4 h-4" aria-hidden="true" />}
      </div>
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Service Notice',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded border border-[#F3C7C7] bg-[#FBEBEB] p-4 text-center my-4 ${className}`}
    >
      <div className="inline-flex items-center justify-center w-7 h-7 rounded bg-white text-[#8A2222] mb-2">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[#8A2222]">{title}</h3>
      <p className="mt-1 text-xs text-[#8A2222]/80 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
