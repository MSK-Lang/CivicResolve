import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchIssueById } from '../lib/api';
import type { CivicIssue } from '@civicresolve/shared';
import {
  Button,
  PriorityIndicator,
  StatusIndicator,
  LoadingState,
  ErrorState,
} from '../components/ui';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<CivicIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchIssueById(id)
      .then(setIssue)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyId = () => {
    if (!issue) return;
    navigator.clipboard.writeText(issue.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <LoadingState label="Retrieving issue record..." />
      </main>
    );
  }

  if (error || !issue) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <ErrorState
          title="Record Not Found"
          message={error || `Could not find an issue with identifier "${id}".`}
          onRetry={() => navigate('/')}
        />
      </main>
    );
  }

  const priorityLevel = issue.priorityScore?.priorityLevel || issue.urgency;
  const imageUrl = issue.image?.url || issue.imageUrl;
  const triage = issue.triageEvaluation || issue.aiTriage;
  const departmentName =
    issue.triageEvaluation?.assignedDepartment ||
    issue.aiTriage?.assignedDepartment ||
    'Municipal Operations Dispatch';

  const formattedDate = new Date(issue.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getConfidencePercentage = (): number => {
    if (!triage) return 85;
    if ('confidence' in triage && typeof triage.confidence === 'number') {
      return Math.round(triage.confidence * 100);
    }
    if ('confidenceScore' in triage && typeof triage.confidenceScore === 'number') {
      return Math.round(triage.confidenceScore * 100);
    }
    return 85;
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary mb-2 min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Return to Dashboard</span>
      </Link>

      <article className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6">
        {/* Header Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            {issue.category.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-2">
            <PriorityIndicator priority={priorityLevel} score={issue.priorityScore?.totalScore} />
            <StatusIndicator status={issue.status} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-normal text-ink-primary font-serif tracking-tight leading-snug">
            {issue.title}
          </h1>

          <div className="flex items-center justify-between gap-2 text-xs text-ink-muted pt-1">
            <span className="font-mono text-[11px] select-all truncate">Ref: {issue.id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-accent hover:text-accent-hover text-xs font-medium flex items-center gap-1 min-h-[36px]"
            >
              {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-secondary py-3 border-y border-border">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
            <div>
              <span className="text-ink-primary font-medium block">Location</span>
              <span>{issue.location.address}</span>
              {issue.location.neighborhood && <span className="text-ink-muted block">{issue.location.neighborhood}</span>}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
            <div>
              <span className="text-ink-primary font-medium block">Filed On</span>
              <span>{formattedDate}</span>
              {issue.priorityScore?.slaHours && (
                <span className="text-accent text-[11px] block mt-0.5 font-medium">
                  {issue.priorityScore.slaHours}h target SLA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attached Photo Evidence */}
        {imageUrl && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
              Attached Photographic Evidence
            </span>
            <div className="rounded overflow-hidden border border-border bg-surface-subtle max-h-72 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={`Photo evidence for ${issue.title}`}
                className="max-h-72 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
            Description
          </span>
          <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>

        {/* Triage & Department Routing */}
        {triage && (
          <div className="rounded border border-border p-4 bg-surface-subtle/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ink-primary font-medium">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                <span>Municipal Triage</span>
              </div>
              <span className="text-ink-muted">{getConfidencePercentage()}% Confidence</span>
            </div>

            <div className="flex items-center gap-2 text-ink-primary">
              <Building2 className="w-3.5 h-3.5 text-ink-muted" />
              <span className="font-medium">Assigned: {departmentName}</span>
            </div>

            <p className="text-ink-secondary leading-relaxed pt-1 border-t border-border/60">
              {triage.reasoning}
            </p>
          </div>
        )}

        <div className="pt-2 flex justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
        </div>
      </article>
    </main>
  );
}
