import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, HelpCircle } from 'lucide-react';
import type { PriorityLevel } from '@civicresolve/shared';

export type PriorityInput = PriorityLevel | 'critical' | 'high' | 'medium' | 'low' | string;

export interface PriorityIndicatorProps {
  priority: PriorityInput;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

const priorityConfig: Record<
  string,
  { code: string; label: string; bg: string; text: string; border: string; Icon: typeof AlertTriangle }
> = {
  p1_critical: { code: 'P1', label: 'Critical', bg: 'bg-[#FBEBEB]', text: 'text-[#8A2222]', border: 'border-[#F3C7C7]', Icon: ShieldAlert },
  critical: { code: 'P1', label: 'Critical', bg: 'bg-[#FBEBEB]', text: 'text-[#8A2222]', border: 'border-[#F3C7C7]', Icon: ShieldAlert },
  p2_high: { code: 'P2', label: 'High', bg: 'bg-[#FDF2E9]', text: 'text-[#914811]', border: 'border-[#F8D5B7]', Icon: AlertTriangle },
  high: { code: 'P2', label: 'High', bg: 'bg-[#FDF2E9]', text: 'text-[#914811]', border: 'border-[#F8D5B7]', Icon: AlertTriangle },
  p3_medium: { code: 'P3', label: 'Medium', bg: 'bg-[#FEF9E7]', text: 'text-[#7A5B0B]', border: 'border-[#F5E5A8]', Icon: Clock },
  medium: { code: 'P3', label: 'Medium', bg: 'bg-[#FEF9E7]', text: 'text-[#7A5B0B]', border: 'border-[#F5E5A8]', Icon: Clock },
  p4_low: { code: 'P4', label: 'Low', bg: 'bg-[#EDF6F0]', text: 'text-[#306B48]', border: 'border-[#C6E6D1]', Icon: CheckCircle2 },
  low: { code: 'P4', label: 'Low', bg: 'bg-[#EDF6F0]', text: 'text-[#306B48]', border: 'border-[#C6E6D1]', Icon: CheckCircle2 },
};

export function PriorityIndicator({ priority, score, showIcon = true, className = '' }: PriorityIndicatorProps) {
  const normalized = priority.toLowerCase().replace(/[\s-]/g, '_');
  const config = priorityConfig[normalized] || {
    code: 'P?',
    label: priority,
    bg: 'bg-surface-subtle',
    text: 'text-ink-primary',
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
      <span className="font-mono text-[11px] font-semibold">{config.code}</span>
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono text-[11px] opacity-75 border-l border-current pl-1 ml-0.5">
          {score}
        </span>
      )}
    </span>
  );
}
