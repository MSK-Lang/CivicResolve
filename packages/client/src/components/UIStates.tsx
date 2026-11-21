import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Unable to Load Data', message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center my-6" role="alert">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-700 mb-3">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <p className="mt-1 text-sm text-red-700 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center px-4 py-2 bg-red-700 text-white rounded-md text-sm font-medium hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-600 min-h-[44px]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Fetching latest data...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 animate-spin text-civic-600 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center my-6 bg-white">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-3">
        <Inbox className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-4 py-2 bg-civic-700 text-white rounded-md text-sm font-medium hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
