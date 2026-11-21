import { Link } from 'react-router-dom';
import type { CivicIssue } from '@civicresolve/shared';
import { MapPin, ArrowRight } from 'lucide-react';
import { PriorityIndicator } from './ui/PriorityIndicator';
import { StatusIndicator } from './ui/StatusIndicator';

interface IssueCardProps {
  issue: CivicIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const formattedDate = new Date(issue.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="group bg-surface rounded border border-border p-4 hover:border-ink-secondary/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              {issue.category.replace(/_/g, ' ')}
            </span>
            <span className="text-border text-xs">·</span>
            <PriorityIndicator priority={issue.urgency} />
            <StatusIndicator status={issue.status} />
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-ink-primary leading-snug truncate">
            <Link
              to={`/issues/${issue.id}`}
              className="hover:text-accent focus-visible:outline-2 focus-visible:outline-accent rounded"
            >
              {issue.title}
            </Link>
          </h3>

          {/* Description */}
          <p className="text-xs text-ink-secondary line-clamp-1 leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* Right side: Location, Date & Action */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 text-xs text-ink-muted">
          <span className="flex items-center gap-1 truncate max-w-[160px]">
            <MapPin className="w-3 h-3 text-ink-muted" aria-hidden="true" />
            <span className="truncate">{issue.location.address}</span>
          </span>
          <div className="flex items-center gap-3">
            <span>{formattedDate}</span>
            <Link
              to={`/issues/${issue.id}`}
              className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover font-medium p-1 min-h-[44px] focus-visible:outline-2 focus-visible:outline-accent rounded"
              aria-label={`View details for ${issue.title}`}
            >
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
