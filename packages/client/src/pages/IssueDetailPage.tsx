import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchIssueById } from '../lib/api';
import type { CivicIssue } from '@civicresolve/shared';
import {
  Button,
  Card,
  PageContainer,
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
  ShieldCheck,
  CheckCircle2,
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
      <PageContainer size="reading">
        <LoadingState label="Retrieving official municipal record..." />
      </PageContainer>
    );
  }

  if (error || !issue) {
    return (
      <PageContainer size="reading">
        <ErrorState
          title="Report Record Not Found"
          message={error || `Could not find an issue with identifier "${id}". Please check the reference ID and try again.`}
          onRetry={() => navigate('/')}
        />
      </PageContainer>
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
    hour: '2-digit',
    minute: '2-digit',
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
    <PageContainer size="reading">
      {/* Return navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink-primary mb-6 p-1 min-h-[44px] focus-visible:outline-2 focus-visible:outline-civic-800 rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Return to Dashboard</span>
      </Link>

      {/* Main Issue Card */}
      <Card className="space-y-6">
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-paper-subtle text-ink-primary border border-border-subtle uppercase tracking-wider font-mono">
            {issue.category.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-2">
            <PriorityIndicator priority={priorityLevel} score={issue.priorityScore?.totalScore} />
            <StatusIndicator status={issue.status} />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary font-serif tracking-tight leading-snug">
            {issue.title}
          </h1>

          {/* Reference ID Banner */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-paper-subtle p-2.5 rounded-md border border-border-subtle text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-ink-muted">Reference ID:</span>
              <span className="font-mono font-bold text-ink-primary select-all truncate">{issue.id}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 text-civic-800 hover:text-civic-950 font-semibold p-1 rounded focus-visible:outline-2 focus-visible:outline-civic-800 min-h-[36px]"
              aria-label="Copy report ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-civic-800" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-secondary py-2 border-y border-border-subtle">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-ink-primary block">Location</span>
              <span>{issue.location.address}</span>
              {issue.location.neighborhood && (
                <span className="block text-ink-muted">Ward: {issue.location.neighborhood}</span>
              )}
              {typeof issue.location.latitude === 'number' && typeof issue.location.longitude === 'number' && (
                <span className="font-mono text-[11px] text-ink-muted block mt-0.5">
                  GPS: {issue.location.latitude.toFixed(3)}, {issue.location.longitude.toFixed(3)} (Coarsened)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-ink-primary block">Submission Timestamp</span>
              <span>{formattedDate}</span>
              {issue.priorityScore?.slaHours && (
                <span className="font-mono text-[11px] text-terracotta-700 block mt-0.5 font-semibold">
                  Target SLA: {issue.priorityScore.slaHours} hours
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attached Photo Evidence */}
        {imageUrl && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Attached Photographic Evidence
            </h2>
            <div className="rounded-lg overflow-hidden border border-border-strong bg-slate-900 max-h-80 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={`Photo evidence for report: ${issue.title}`}
                className="max-h-80 w-auto object-contain"
                loading="eager"
              />
            </div>
          </div>
        )}

        {/* Description Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Report Description
          </h2>
          <div className="bg-paper-subtle p-4 rounded-md border border-border-subtle text-sm text-ink-primary leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </div>
        </div>

        {/* Priority Engine Scorecard Breakdown */}
        {issue.priorityScore && (
          <div className="border border-border-subtle rounded-lg p-4 bg-paper-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-civic-800" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink-primary">
                  Deterministic Priority Breakdown
                </h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-civic-50 text-civic-900 border border-civic-300">
                Total: {issue.priorityScore.totalScore}/100
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-paper-subtle p-2.5 rounded border border-border-subtle">
                <span className="text-ink-muted block text-[11px]">Severity</span>
                <span className="font-mono font-bold text-ink-primary">
                  {issue.priorityScore.breakdown.severityPoints} pts
                </span>
              </div>
              <div className="bg-paper-subtle p-2.5 rounded border border-border-subtle">
                <span className="text-ink-muted block text-[11px]">Safety Risk</span>
                <span className="font-mono font-bold text-ink-primary">
                  {issue.priorityScore.breakdown.safetyRiskPoints} pts
                </span>
              </div>
              <div className="bg-paper-subtle p-2.5 rounded border border-border-subtle">
                <span className="text-ink-muted block text-[11px]">Public Impact</span>
                <span className="font-mono font-bold text-ink-primary">
                  {issue.priorityScore.breakdown.publicImpactPoints} pts
                </span>
              </div>
              <div className="bg-paper-subtle p-2.5 rounded border border-border-subtle">
                <span className="text-ink-muted block text-[11px]">Context Zone</span>
                <span className="font-mono font-bold text-ink-primary">
                  {issue.priorityScore.breakdown.locationContextPoints} pts
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed pt-1">
              {issue.priorityScore.explanation}
            </p>
          </div>
        )}

        {/* Triage & Department Routing Card */}
        {triage && (
          <div className="border border-border-subtle rounded-lg p-4 bg-paper-subtle space-y-3">
            <div className="flex items-center gap-2 text-civic-800 font-bold text-sm">
              <Cpu className="w-4 h-4 text-civic-800" aria-hidden="true" />
              <span>Municipal Automated Triage Assessment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-ink-muted block">Assigned Department</span>
                <span className="font-semibold text-ink-primary text-sm flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-civic-800" aria-hidden="true" />
                  <span>{departmentName}</span>
                </span>
              </div>
              <div>
                <span className="text-ink-muted block">Triage Confidence</span>
                <span className="font-semibold text-ink-primary text-sm mt-0.5 block">
                  {getConfidencePercentage()}% Confidence
                </span>
              </div>
            </div>

            <div className="text-xs pt-1">
              <span className="text-ink-muted block mb-1">Reasoning</span>
              <p className="text-ink-secondary leading-relaxed bg-paper-card p-3 rounded border border-border-subtle">
                {triage.reasoning}
              </p>
            </div>

            {triage.suggestedActionItems && triage.suggestedActionItems.length > 0 && (
              <div className="text-xs pt-1">
                <span className="text-ink-muted block mb-1.5 font-semibold">Recommended Dispatch Actions</span>
                <ul className="space-y-1.5">
                  {triage.suggestedActionItems.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-ink-primary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Citizen Resolution Timeline */}
        <div className="border-t border-border-subtle pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">
            Incident Resolution Lifecycle
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-civic-50 text-civic-800 border border-civic-300 flex items-center justify-center shrink-0 mt-0.5 font-mono font-bold text-[11px]">
                1
              </div>
              <div>
                <span className="font-semibold text-ink-primary block text-sm">Complaint Received</span>
                <span className="text-ink-secondary">
                  Logged in immutable public register on {formattedDate}.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-civic-50 text-civic-800 border border-civic-300 flex items-center justify-center shrink-0 mt-0.5 font-mono font-bold text-[11px]">
                2
              </div>
              <div>
                <span className="font-semibold text-ink-primary block text-sm">Automated Triage Evaluation</span>
                <span className="text-ink-secondary">
                  Classified into municipal category with deterministic priority score.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-mono font-bold text-[11px] ${
                issue.status === 'in_progress' || issue.status === 'resolved'
                  ? 'bg-civic-50 text-civic-800 border border-civic-300'
                  : 'bg-paper-subtle text-ink-muted border border-border-subtle'
              }`}>
                3
              </div>
              <div>
                <span className="font-semibold text-ink-primary block text-sm">
                  {issue.status === 'in_progress' ? 'Field Crew Dispatched (In Progress)' : 'Department Dispatch'}
                </span>
                <span className="text-ink-secondary">
                  {issue.status === 'in_progress'
                    ? 'Municipal maintenance crew assigned to site.'
                    : `Queued for assignment by ${departmentName}.`}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-mono font-bold text-[11px] ${
                issue.status === 'resolved'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-paper-subtle text-ink-muted border border-border-subtle'
              }`}>
                4
              </div>
              <div>
                <span className="font-semibold text-ink-primary block text-sm">
                  {issue.status === 'resolved' ? 'Resolved and Verified' : 'Resolution and Verification'}
                </span>
                <span className="text-ink-secondary">
                  {issue.status === 'resolved'
                    ? 'Maintenance completed and verified by municipal inspection.'
                    : 'Pending field completion and verification.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto"
          >
            Back to Public Issue Feed
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
