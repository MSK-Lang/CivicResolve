import { Link } from 'react-router-dom';
import type { CivicIssue } from '@civicresolve/shared';
import { MapPin, Calendar, ArrowRight, Building2 } from 'lucide-react';
import { PriorityIndicator } from './ui/PriorityIndicator';
import { StatusIndicator } from './ui/StatusIndicator';

interface IssueCardProps {
  issue: CivicIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const formattedDate = new Date(issue.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="bg-paper-card rounded-lg border border-border-subtle p-5 shadow-tactile hover:border-border-strong transition-colors flex flex-col justify-between motion-reduce:transition-none">
      <div>
        {/* Badges row with WCAG AA compliant indicators */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-paper-subtle text-ink-primary border border-border-subtle uppercase tracking-wider font-mono">
            {issue.category.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-2">
            <PriorityIndicator priority={issue.urgency} />
            <StatusIndicator status={issue.status} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-ink-primary mb-2 leading-snug">
          <Link
            to={`/issues/${issue.id}`}
            className="hover:text-civic-800 focus-visible:outline-2 focus-visible:outline-civic-800 rounded"
          >
            {issue.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-sm text-ink-secondary line-clamp-2 mb-4 leading-relaxed">
          {issue.description}
        </p>

        {/* AI Triage preview tag if available */}
        {issue.aiTriage && (
          <div className="bg-paper-subtle border border-border-subtle rounded-md p-2.5 mb-4 text-xs text-ink-secondary flex items-start gap-2">
            <Building2 className="w-4 h-4 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-ink-primary">Assigned Department: </span>
              <span>{issue.aiTriage.assignedDepartment}</span>
            </div>
          </div>
        )}
      </div>

      {/* Meta and Action link */}
      <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-ink-secondary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{issue.location.address}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <Link
          to={`/issues/${issue.id}`}
          className="inline-flex items-center gap-1 font-semibold text-civic-800 hover:text-civic-950 p-1 min-h-[44px] focus-visible:outline-2 focus-visible:outline-civic-800 rounded"
          aria-label={`View full details for issue: ${issue.title}`}
        >
          <span>View details</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
