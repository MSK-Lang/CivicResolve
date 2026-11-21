import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchIssues, fetchHealth } from '../lib/api';
import type { CivicIssue, HealthCheckResponse } from '@civicresolve/shared';
import { IssueCard } from '../components/IssueCard';
import { LoadingState, ErrorState, EmptyState } from '../components/UIStates';
import { Button, PageContainer, Card } from '../components/ui';
import { ShieldCheck, PlusCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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
    <PageContainer size="standard">
      {/* Hero Section */}
      <Card className="p-6 sm:p-10 mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-civic-50 text-civic-900 border border-civic-200 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4 text-civic-800" aria-hidden="true" />
            <span>PromptWars GDG PSG iTech x H2S Civic Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-primary font-serif tracking-tight leading-tight">
            Citizen-First Civic Issue Reporting and Municipal Triage
          </h1>
          <p className="mt-3 text-base sm:text-lg text-ink-secondary leading-relaxed">
            Report civic hazards, road conditions, sanitation problems, and infrastructure faults.
            Every issue is evaluated with automated municipal triage to direct requests to the appropriate department.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="action"
              size="lg"
              onClick={() => navigate('/report')}
            >
              <PlusCircle className="w-5 h-5" aria-hidden="true" />
              <span>Report an Issue</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => navigate('/health')}
            >
              <span>View System Status</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Live System Telemetry */}
        {health && (
          <div className="mt-8 pt-6 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-md bg-paper-subtle border border-border-subtle text-xs">
              <CheckCircle2 className="w-4 h-4 text-civic-800 shrink-0" aria-hidden="true" />
              <div>
                <span className="font-semibold text-ink-primary block">Server Health</span>
                <span className="text-ink-secondary">{health.status} (uptime {Math.floor(health.uptime)}s)</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-md bg-paper-subtle border border-border-subtle text-xs">
              {health.services.database === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-civic-800 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-terracotta-700 shrink-0" aria-hidden="true" />
              )}
              <div>
                <span className="font-semibold text-ink-primary block">Database</span>
                <span className="text-ink-secondary">{health.services.database.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-md bg-paper-subtle border border-border-subtle text-xs">
              {health.services.gemini === 'ready' ? (
                <CheckCircle2 className="w-4 h-4 text-civic-800 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-terracotta-700 shrink-0" aria-hidden="true" />
              )}
              <div>
                <span className="font-semibold text-ink-primary block">Gemini Triage</span>
                <span className="text-ink-secondary">{health.services.gemini.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Reports Listing Section */}
      <section aria-labelledby="reports-title">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="reports-title" className="text-xl sm:text-2xl font-bold text-ink-primary font-serif tracking-tight">
              Recent Civic Reports
            </h2>
            <p className="text-sm text-ink-secondary">
              Community submissions evaluated and scheduled for field resolution.
            </p>
          </div>
          <Link
            to="/report"
            className="text-sm font-semibold text-civic-800 hover:text-civic-950 p-1 min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-civic-800 rounded"
          >
            + New Report
          </Link>
        </div>

        {loading ? (
          <LoadingState label="Loading registered civic reports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : issues.length === 0 ? (
          <EmptyState
            title="No Civic Reports Filed Yet"
            description="Your community dashboard is currently clean. Report an infrastructure issue or safety hazard to get it evaluated by municipal services."
            actionLabel="File the First Report"
            onAction={() => navigate('/report')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
