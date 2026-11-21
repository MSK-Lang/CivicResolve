import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchIssues, fetchHealth } from '../lib/api';
import type { CivicIssue, HealthCheckResponse } from '@civicresolve/shared';
import { IssueCard } from '../components/IssueCard';
import { LoadingState, ErrorState, EmptyState } from '../components/UIStates';
import { ShieldCheck, PlusCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function HomePage() {
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
        fetchHealth().catch(() => null)
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-sm" aria-labelledby="hero-title">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-civic-50 text-civic-800 border border-civic-200 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4 text-civic-600" aria-hidden="true" />
            <span>PromptWars GDG PSG iTech x H2S Civic Platform</span>
          </div>
          <h1 id="hero-title" className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Citizen-First Civic Issue Reporting and Municipal Triage
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Report civic hazards, road conditions, sanitation problems, and infrastructure faults.
            Every issue is evaluated with automated municipal triage to direct requests to the appropriate department.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/report"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-civic-700 text-white font-semibold hover:bg-civic-800 transition-colors focus-visible:ring-2 focus-visible:ring-civic-600 min-h-[44px]"
            >
              <PlusCircle className="w-5 h-5" aria-hidden="true" />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/health"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 transition-colors border border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-500 min-h-[44px]"
            >
              <span>View System Status</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Live System Indicator */}
        {health && (
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <div>
                <span className="font-semibold text-slate-900 block">Server Health</span>
                <span className="text-slate-600">{health.status} (uptime {Math.floor(health.uptime)}s)</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              {health.services.database === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              )}
              <div>
                <span className="font-semibold text-slate-900 block">Database</span>
                <span className="text-slate-600">{health.services.database.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              {health.services.gemini === 'ready' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              )}
              <div>
                <span className="font-semibold text-slate-900 block">Gemini Triage</span>
                <span className="text-slate-600">{health.services.gemini.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Reports Listing Section */}
      <section aria-labelledby="reports-title">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="reports-title" className="text-xl font-bold text-slate-900">
              Recent Civic Reports
            </h2>
            <p className="text-sm text-slate-500">
              Community submissions under review and in progress.
            </p>
          </div>
          <Link
            to="/report"
            className="text-sm font-semibold text-civic-700 hover:text-civic-900 p-1 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-civic-600 rounded"
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
            onAction={() => window.location.assign('/report')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
