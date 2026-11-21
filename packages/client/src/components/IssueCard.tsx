import { Link } from 'react-router-dom';
import type { CivicIssue } from '@civicresolve/shared';
import { MapPin, Calendar, ArrowRight, Bot } from 'lucide-react';

interface IssueCardProps {
  issue: CivicIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const urgencyStyles: Record<string, string> = {
    critical: 'bg-rose-100 text-rose-900 border-rose-300',
    high: 'bg-amber-100 text-amber-900 border-amber-300',
    medium: 'bg-sky-100 text-sky-900 border-sky-300',
    low: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  };

  const statusStyles: Record<string, string> = {
    submitted: 'bg-slate-100 text-slate-800 border-slate-300',
    triaged: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    in_progress: 'bg-blue-100 text-blue-900 border-blue-300',
    resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    closed: 'bg-slate-200 text-slate-700 border-slate-400'
  };

  const formattedDate = new Date(issue.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <article className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Badges row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
            {issue.category.replace('_', ' ')}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                urgencyStyles[issue.urgency] || 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              Urgency: {issue.urgency}
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                statusStyles[issue.status] || 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              Status: {issue.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
          <Link
            to={`/issues/${issue.id}`}
            className="hover:text-civic-700 focus-visible:ring-2 focus-visible:ring-civic-600 rounded"
          >
            {issue.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {issue.description}
        </p>

        {/* AI Triage preview tag if available */}
        {issue.aiTriage && (
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-xs text-slate-700 flex items-start gap-2">
            <Bot className="w-4 h-4 text-civic-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-900">Assigned Department: </span>
              <span>{issue.aiTriage.assignedDepartment}</span>
            </div>
          </div>
        )}
      </div>

      {/* Meta and Action link */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{issue.location.address}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <Link
          to={`/issues/${issue.id}`}
          className="inline-flex items-center gap-1 font-semibold text-civic-700 hover:text-civic-900 p-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-civic-600 rounded"
          aria-label={`View full details for issue: ${issue.title}`}
        >
          <span>View details</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
