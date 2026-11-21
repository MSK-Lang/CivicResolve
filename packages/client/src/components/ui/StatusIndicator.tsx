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
  submitted: { label: 'Submitted', bg: 'bg-surface-subtle', text: 'text-ink-secondary', border: 'border-border', Icon: Clock },
  triaged: { label: 'Triaged', bg: 'bg-[#F2ECE9]', text: 'text-[#5E4238]', border: 'border-[#E0D3CC]', Icon: Cpu },
  in_progress: { label: 'In Progress', bg: 'bg-[#EBF3FB]', text: 'text-[#1D4E7A]', border: 'border-[#CCE2F6]', Icon: Activity },
  resolved: { label: 'Resolved', bg: 'bg-[#EDF6F0]', text: 'text-[#306B48]', border: 'border-[#C6E6D1]', Icon: CheckCircle2 },
  needs_review: { label: 'Needs Review', bg: 'bg-[#FEF9E7]', text: 'text-[#7A5B0B]', border: 'border-[#F5E5A8]', Icon: AlertTriangle },
  closed: { label: 'Closed', bg: 'bg-surface-subtle', text: 'text-ink-muted', border: 'border-border', Icon: CheckCheck },
  rejected: { label: 'Rejected', bg: 'bg-surface-subtle', text: 'text-ink-muted', border: 'border-border', Icon: XCircle },
};

export function StatusIndicator({ status, showIcon = true, className = '' }: StatusIndicatorProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const config = statusConfig[normalized] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-surface-subtle',
    text: 'text-ink-secondary',
    border: 'border-border',
    Icon: HelpCircle,
  };

  const { Icon } = config;

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${config.bg} ${config.text} ${config.border} select-none ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
}
