import {
  Clock,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  CheckCheck,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export type IssueStatusType =
  | 'submitted'
  | 'triaged'
  | 'in_progress'
  | 'resolved'
  | 'needs_review'
  | 'closed'
  | 'rejected'
  | string;

export interface StatusIndicatorProps {
  status: IssueStatusType;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; Icon: typeof Clock }
> = {
  submitted: {
    label: 'Submitted',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    Icon: Clock,
  },
  triaged: {
    label: 'Triaged',
    bg: 'bg-civic-50',
    text: 'text-civic-900',
    border: 'border-civic-300',
    Icon: Cpu,
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-300',
    Icon: Activity,
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    Icon: CheckCircle2,
  },
  needs_review: {
    label: 'Needs Review',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    Icon: AlertTriangle,
  },
  closed: {
    label: 'Closed',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    Icon: CheckCheck,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    Icon: XCircle,
  },
};

export function StatusIndicator({
  status,
  showIcon = true,
  className = '',
}: StatusIndicatorProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const config = statusConfig[normalized] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    Icon: HelpCircle,
  };

  const { Icon } = config;

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${config.bg} ${config.text} ${config.border} select-none ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
}
