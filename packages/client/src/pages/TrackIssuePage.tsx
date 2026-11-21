import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchIssueById } from '../lib/api';
import type { CivicIssue } from '@civicresolve/shared';
import {
  Button,
  PriorityIndicator,
  StatusIndicator,
  ErrorState,
} from '../components/ui';
import { PageSkeleton } from '../components/ui/FeedbackStates';
import {
  Search,
  Copy,
  Check,
  MapPin,
  Building2,
  Clock,
  ArrowLeft,
  Cpu,
  History,
} from 'lucide-react';

export function TrackIssuePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(id || '');
  const [issue, setIssue] = useState<CivicIssue | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Synchronize when route param changes
  useEffect(() => {
    if (id) {
      setSearchId(id);
      setLoading(true);
      setError(null);
      fetchIssueById(id.trim())
        .then((data) => {
          setIssue(data);
          setError(null);
        })
        .catch((err) => {
          setIssue(null);
          setError(err instanceof Error ? err.message : `Report with reference "${id}" could not be found.`);
        })
        .finally(() => setLoading(false));
    } else {
      setIssue(null);
      setLoading(false);
      setError(null);
    }
  }, [id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchId.trim();
    if (!clean) return;
    navigate(`/track/${encodeURIComponent(clean)}`);
  };

  const handleCopyId = () => {
    if (!issue) return;
    navigator.clipboard.writeText(issue.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Indian date formatter helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Safe confidence percentage
  const getConfidencePercentage = (): number => {
    const triage = issue?.triageEvaluation || issue?.aiTriage;
    if (!triage) return 85;
    if ('confidence' in triage && typeof triage.confidence === 'number') {
      return Math.round(triage.confidence * 100);
    }
    if ('confidenceScore' in triage && typeof triage.confidenceScore === 'number') {
      return Math.round(triage.confidenceScore * 100);
    }
    return 85;
  };

  // Audit history helper to find timestamps for specific lifecycle events
  const findAuditTimestamp = (eventTypes: string[]): string | undefined => {
    if (!issue?.auditHistory || issue.auditHistory.length === 0) return undefined;
    const match = issue.auditHistory.find((ev) => eventTypes.includes(ev.eventType));
    return match ? match.timestamp : undefined;
  };

  const getActorLabel = (actorType?: string): string => {
    switch (actorType) {
      case 'citizen':
        return 'Citizen Report';
      case 'ai_agent':
        return 'Gemini AI Triage';
      case 'system':
        return 'Civic System Core';
      case 'admin':
        return 'Municipal Officer';
      default:
        return 'System Operator';
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Page Navigation & Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Return to Dashboard</span>
        </Link>
        <Link
          to="/report"
          className="text-xs text-accent hover:text-accent-hover font-medium min-h-[44px] flex items-center"
        >
          Submit New Complaint
        </Link>
      </div>

      {/* Header and Lookup Search Bar */}
      <section className="bg-surface rounded border border-border p-6 sm:p-8 space-y-4 shadow-subtle">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink-primary tracking-tight">
            Track Civic Complaint
          </h1>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Enter your municipal reference identifier to view live dispatch, department triage, and resolution progress.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="track-search-input" className="sr-only">
              Report Reference ID
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              id="track-search-input"
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="e.g. 8dd9513c-8f2a-4dda-a978-ca9d21c01bf9"
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-canvas border border-border rounded text-ink-primary placeholder:text-ink-muted placeholder:font-sans focus:outline-none focus:border-accent min-h-[44px]"
              required
            />
          </div>
          <Button
            type="submit"
            variant="action"
            size="md"
            disabled={!searchId.trim() || loading}
            className="shrink-0"
          >
            <Search className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Track Status</span>
          </Button>
        </form>
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <section aria-label="Loading report details" className="space-y-6">
          <PageSkeleton />
        </section>
      )}

      {/* Error / Record Not Found State */}
      {!loading && error && (
        <section aria-label="Error looking up report">
          <div className="bg-surface rounded border border-border p-6 sm:p-8 space-y-4">
            <ErrorState
              title="Report Reference Not Found"
              message={error}
              onRetry={() => {
                setSearchId('');
                navigate('/track');
              }}
            />
            <div className="text-xs text-ink-secondary border-t border-border pt-4 mt-4 space-y-2">
              <p className="font-medium text-ink-primary">Need assistance finding your reference ID?</p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li>Check your browser submission receipt confirmation screen.</li>
                <li>Verify you have pasted the full UUID without trailing spaces.</li>
                <li>You may also submit a new report if your previous ticket was not cataloged.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Initial Landing State (No ID provided in URL) */}
      {!loading && !error && !issue && (
        <section className="bg-surface rounded border border-border p-8 text-center space-y-4 text-xs text-ink-secondary">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-subtle border border-border flex items-center justify-center text-ink-muted">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-serif font-normal text-ink-primary">
              Ready to Track Municipal Progress
            </h2>
            <p className="text-ink-muted leading-relaxed">
              Every complaint registered on CivicResolve is assigned a unique tracking identifier. Paste your reference above to inspect live municipal records.
            </p>
          </div>
        </section>
      )}

      {/* Loaded Issue Details */}
      {!loading && !error && issue && (
        <article className="space-y-6">
          {/* Main Card */}
          <div className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6 shadow-subtle">
            {/* Header Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted bg-surface-subtle px-2 py-0.5 rounded border border-border">
                  {issue.category.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-ink-muted font-mono">
                  Filed {formatDate(issue.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PriorityIndicator
                  priority={issue.priorityScore?.priorityLevel || issue.urgency}
                  score={issue.priorityScore?.totalScore}
                />
                <StatusIndicator status={issue.status} />
              </div>
            </div>

            {/* Title & Copyable Reference */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-normal text-ink-primary font-serif tracking-tight leading-snug">
                {issue.title}
              </h2>
              <div className="flex items-center justify-between gap-2 text-xs text-ink-muted pt-1">
                <span className="font-mono text-[11px] select-all truncate">
                  Ref: {issue.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-accent hover:text-accent-hover text-xs font-medium flex items-center gap-1 min-h-[36px] px-2 py-1 rounded hover:bg-surface-subtle transition-colors"
                  aria-label="Copy report identifier"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            {/* Location & Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-secondary py-4 border-y border-border">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-0.5">
                  <span className="text-ink-primary font-medium block">Approximate Location</span>
                  <span>{issue.location.address}</span>
                  {issue.location.neighborhood && (
                    <span className="text-ink-muted block">{issue.location.neighborhood}</span>
                  )}
                  <span className="text-[10px] text-ink-muted italic block pt-0.5">
                    (Coordinates coarsened ~100m for privacy protection)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-0.5">
                  <span className="text-ink-primary font-medium block">Assigned Department</span>
                  <span>
                    {issue.triageEvaluation?.assignedDepartment ||
                      issue.aiTriage?.assignedDepartment ||
                      'Municipal Operations Dispatch'}
                  </span>
                  {issue.priorityScore?.slaHours && (
                    <span className="text-accent text-[11px] font-medium block pt-0.5">
                      Target resolution SLA: {issue.priorityScore.slaHours} hours
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Attached Photo Evidence */}
            {(issue.image?.url || issue.imageUrl) && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                  Attached Photographic Evidence
                </span>
                <div className="rounded border border-border bg-surface-subtle p-2 max-h-80 flex items-center justify-center overflow-hidden">
                  <img
                    src={issue.image?.url || issue.imageUrl}
                    alt={`Photographic evidence attached to ${issue.title}`}
                    className="max-h-72 w-auto object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                Citizen Complaint Description
              </span>
              <p className="text-xs sm:text-sm text-ink-primary leading-relaxed whitespace-pre-wrap bg-surface-subtle/40 p-4 rounded border border-border/60">
                {issue.description}
              </p>
            </div>

            {/* Automated Triage Evaluation */}
            {(issue.triageEvaluation || issue.aiTriage) && (
              <div className="rounded border border-border p-4 sm:p-5 bg-surface-subtle/50 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 text-ink-primary font-medium">
                    <Cpu className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                    <span>Municipal Triage Assessment</span>
                  </div>
                  <span className="text-[11px] text-ink-muted font-mono">
                    {getConfidencePercentage()}% Evaluated Confidence
                  </span>
                </div>

                <p className="text-ink-secondary leading-relaxed">
                  {issue.triageEvaluation?.reasoning || issue.aiTriage?.reasoning}
                </p>

                {((issue.triageEvaluation?.suggestedActionItems &&
                  issue.triageEvaluation.suggestedActionItems.length > 0) ||
                  (issue.aiTriage?.suggestedActionItems &&
                    issue.aiTriage.suggestedActionItems.length > 0)) && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <span className="text-[11px] font-medium text-ink-primary block">
                      Recommended Action Items:
                    </span>
                    <ul className="list-disc pl-5 space-y-1 text-ink-muted text-[11px]">
                      {(issue.triageEvaluation?.suggestedActionItems ||
                        issue.aiTriage?.suggestedActionItems ||
                        []
                      ).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resolution Timeline Card */}
          <section
            aria-label="Resolution timeline"
            className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6 shadow-subtle"
          >
            <div className="space-y-1 border-b border-border pb-4">
              <h3 className="font-serif text-xl font-normal text-ink-primary tracking-tight">
                Resolution Timeline
              </h3>
              <p className="text-xs text-ink-secondary">
                Chronological stages verified from official municipal dispatch and audit logs.
              </p>
            </div>

            {/* 4-Stage Verified Timeline */}
            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {/* Stage 1: Submitted */}
              <div className="relative">
                <div className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white ring-4 ring-surface">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium text-ink-primary">
                      1. Complaint Submitted
                    </span>
                    <span className="text-[11px] font-mono text-ink-muted">
                      {formatDate(
                        findAuditTimestamp(['report_submitted']) || issue.createdAt
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Citizen report registered in municipal log and queued for dispatch.
                  </p>
                </div>
              </div>

              {/* Stage 2: Triaged */}
              {(() => {
                const isTriaged =
                  issue.status !== 'submitted' ||
                  Boolean(issue.triageEvaluation) ||
                  Boolean(issue.aiTriage);
                const triageTimestamp =
                  findAuditTimestamp(['triage_completed', 'triage_fallback']) ||
                  issue.triageEvaluation?.evaluatedAt;

                return (
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0 w-4 h-4 rounded-full flex items-center justify-center ring-4 ring-surface ${
                        isTriaged
                          ? 'bg-accent text-white'
                          : 'bg-surface-subtle border border-border text-ink-muted'
                      }`}
                    >
                      {isTriaged ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-ink-primary">
                          2. Department Triage & Priority
                        </span>
                        {triageTimestamp ? (
                          <span className="text-[11px] font-mono text-ink-muted">
                            {formatDate(triageTimestamp)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-ink-muted italic">
                            Awaiting triage
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed">
                        {isTriaged
                          ? `Categorized under ${issue.category.replace(/_/g, ' ')} and routed to ${
                              issue.triageEvaluation?.assignedDepartment ||
                              issue.aiTriage?.assignedDepartment ||
                              'assigned department'
                            }.`
                          : 'Automated municipal assessment and department allocation pending.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Stage 3: In Progress / Dispatched */}
              {(() => {
                const isInProgress =
                  issue.status === 'in_progress' ||
                  issue.status === 'resolved' ||
                  issue.status === 'closed';
                const inProgressTimestamp =
                  findAuditTimestamp(['status_updated']) ||
                  (issue.status === 'in_progress' ? issue.updatedAt : undefined);

                return (
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0 w-4 h-4 rounded-full flex items-center justify-center ring-4 ring-surface ${
                        isInProgress
                          ? 'bg-accent text-white'
                          : 'bg-surface-subtle border border-border text-ink-muted'
                      }`}
                    >
                      {isInProgress ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-ink-primary">
                          3. Municipal Crew In Progress
                        </span>
                        {inProgressTimestamp ? (
                          <span className="text-[11px] font-mono text-ink-muted">
                            {formatDate(inProgressTimestamp)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-ink-muted italic">
                            Pending dispatch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed">
                        {isInProgress
                          ? 'Field work orders assigned to departmental operations crew.'
                          : 'Awaiting crew dispatch and field scheduling.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Stage 4: Resolved */}
              {(() => {
                const isResolved = issue.status === 'resolved' || issue.status === 'closed';
                const resolvedTimestamp = isResolved
                  ? findAuditTimestamp(['status_updated']) || issue.updatedAt
                  : undefined;

                return (
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0 w-4 h-4 rounded-full flex items-center justify-center ring-4 ring-surface ${
                        isResolved
                          ? 'bg-[#306B48] text-white'
                          : 'bg-surface-subtle border border-border text-ink-muted'
                      }`}
                    >
                      {isResolved ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-ink-primary">
                          4. Resolution and Closure
                        </span>
                        {resolvedTimestamp ? (
                          <span className="text-[11px] font-mono text-ink-muted">
                            {formatDate(resolvedTimestamp)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-ink-muted italic">
                            Pending resolution
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed">
                        {isResolved
                          ? 'Site inspection complete and issue marked resolved by municipal supervisor.'
                          : 'Pending field completion and administrative sign-off.'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Optional Collapsible Audit Trail */}
            {issue.auditHistory && issue.auditHistory.length > 0 && (
              <div className="border-t border-border pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAuditTrail(!showAuditTrail)}
                  className="flex items-center justify-between w-full text-xs text-ink-secondary hover:text-ink-primary py-1 focus:outline-none min-h-[44px]"
                  aria-expanded={showAuditTrail}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <History className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                    <span>Official Audit Trail ({issue.auditHistory.length} events)</span>
                  </span>
                  <span className="text-accent text-[11px]">
                    {showAuditTrail ? 'Hide Log' : 'View Verified Log'}
                  </span>
                </button>

                {showAuditTrail && (
                  <div className="space-y-2 pt-2 animate-fade-in">
                    {issue.auditHistory.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-3 bg-surface-subtle rounded border border-border/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                          <span className="font-mono text-ink-muted">
                            {formatDate(ev.timestamp)}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border text-ink-secondary">
                            {getActorLabel(ev.actor?.type)}
                          </span>
                        </div>
                        <p className="text-ink-primary text-xs leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </article>
      )}
    </main>
  );
}
