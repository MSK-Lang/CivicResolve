import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchIssues, fetchHealth } from '../lib/api';
import type { CivicIssue, HealthCheckResponse } from '@civicresolve/shared';
import { IssueCard } from '../components/IssueCard';
import { ErrorState, EmptyState } from '../components/UIStates';
import { PageSkeleton } from '../components/ui/FeedbackStates';
import { Button } from '../components/ui';
import { Plus, ArrowRight } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedIssues, fetchedHealth] = await Promise.all([
        fetchIssues(),
        fetchHealth().catch(() => null),
      ]);
      setIssues(fetchedIssues);
      setHealth(fetchedHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to CivicResolve service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Compact Editorial Introduction - Separate Region */}
      <section className="space-y-3.5 max-w-2xl">
        <span className="text-xs font-mono tracking-widest uppercase text-ink-muted">
          Municipal Civic Register
        </span>
        <h1 className="text-3xl sm:text-4xl font-normal text-ink-primary font-serif tracking-tight leading-tight">
          Public infrastructure and neighborhood resolution register.
        </h1>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Report road damage, sanitation hazards, water leaks, or safety risks. Submissions are triaged with municipal priority algorithms and routed to city dispatch teams.
        </p>
        <div className="pt-1">
          <Button
            type="button"
            variant="action"
            size="md"
            onClick={() => navigate('/report')}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Report an Issue</span>
          </Button>
        </div>
      </section>

      {/* Reports Section */}
      <section aria-labelledby="reports-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="reports-heading" className="text-sm font-semibold uppercase tracking-wider text-ink-primary">
            Recent Reports {!loading && `(${issues.length})`}
          </h2>
          <Link
            to="/report"
            className="text-xs font-medium text-accent hover:text-accent-hover min-h-[44px] flex items-center"
          >
            + New submission
          </Link>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : issues.length === 0 ? (
          <EmptyState
            title="No Reports Filed"
            description="The civic registry is currently clear. Submit an infrastructure issue to begin municipal tracking."
            actionLabel="Report an Issue"
            onAction={() => navigate('/report')}
          />
        ) : (
          <div className="space-y-2.5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      {/* Secondary Quiet System Indicator */}
      {health && (
        <section className="pt-6 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>System {health.status}</span>
            </span>
            <span>·</span>
            <span>Uptime: {Math.floor(health.uptime)}s</span>
          </div>
          <Link
            to="/health"
            className="hover:text-ink-primary flex items-center gap-1 text-xs"
          >
            <span>Diagnostics</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </section>
      )}
    </main>
  );
}
