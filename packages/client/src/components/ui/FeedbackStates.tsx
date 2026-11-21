import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = 'Loading municipal data...',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-ink-secondary ${className}`}
    >
      <Loader2
        className="w-7 h-7 animate-spin text-civic-800 mb-3 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-ink-primary">{label}</p>
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
      className={`rounded-lg border-2 border-dashed border-border-strong p-8 sm:p-10 text-center bg-paper-card my-6 ${className}`}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-paper-subtle text-ink-secondary mb-3 border border-border-subtle">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-ink-primary tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-ink-secondary max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button type="button" variant="primary" onClick={onAction}>
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
  title = 'Service Unavailable',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-lg border border-red-300 bg-red-50 p-6 text-center my-6 ${className}`}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-red-100 text-red-800 mb-3 border border-red-200">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-red-950 tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-red-900 max-w-md mx-auto leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button type="button" variant="destructive" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
