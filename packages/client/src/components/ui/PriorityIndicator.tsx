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
  {
    code: string;
    label: string;
    bg: string;
    text: string;
    border: string;
    Icon: typeof AlertTriangle;
  }
> = {
  p1_critical: {
    code: 'P1',
    label: 'Critical',
    bg: 'bg-red-50',
    text: 'text-red-900',
    border: 'border-red-300',
    Icon: ShieldAlert,
  },
  critical: {
    code: 'P1',
    label: 'Critical',
    bg: 'bg-red-50',
    text: 'text-red-900',
    border: 'border-red-300',
    Icon: ShieldAlert,
  },
  p2_high: {
    code: 'P2',
    label: 'High',
    bg: 'bg-orange-50',
    text: 'text-orange-950',
    border: 'border-orange-300',
    Icon: AlertTriangle,
  },
  high: {
    code: 'P2',
    label: 'High',
    bg: 'bg-orange-50',
    text: 'text-orange-950',
    border: 'border-orange-300',
    Icon: AlertTriangle,
  },
  p3_medium: {
    code: 'P3',
    label: 'Medium',
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    border: 'border-amber-300',
    Icon: Clock,
  },
  medium: {
    code: 'P3',
    label: 'Medium',
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    border: 'border-amber-300',
    Icon: Clock,
  },
  p4_low: {
    code: 'P4',
    label: 'Low',
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    Icon: CheckCircle2,
  },
  low: {
    code: 'P4',
    label: 'Low',
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    Icon: CheckCircle2,
  },
};

export function PriorityIndicator({
  priority,
  score,
  showIcon = true,
  className = '',
}: PriorityIndicatorProps) {
  const normalized = priority.toLowerCase().replace(/[\s-]/g, '_');
  const config = priorityConfig[normalized] || {
    code: 'P?',
    label: priority,
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
      <span className="font-mono tracking-tight">{config.code}</span>
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono text-[11px] opacity-80 border-l border-current pl-1.5 ml-0.5">
          {score}/100
        </span>
      )}
    </span>
  );
}
