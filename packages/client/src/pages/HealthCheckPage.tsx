import { useState, useEffect } from 'react';
import { fetchHealth } from '../lib/api';
import type { HealthCheckResponse } from '@civicresolve/shared';
import { ErrorState } from '../components/UIStates';
import { PageSkeleton } from '../components/ui/FeedbackStates';
import { Button, PageContainer, Card } from '../components/ui';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export function HealthCheckPage() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = () => {
    setLoading(true);
    setError(null);
    fetchHealth()
      .then(setHealth)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <PageContainer size="reading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-serif tracking-tight">
            System Infrastructure Health
          </h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            Real-time status of backend service connectors, database, and AI triage.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadHealth}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Refresh</span>
        </Button>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={loadHealth} />
      ) : health ? (
        <Card className="space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-border-subtle">
            <div className="w-12 h-12 rounded-full bg-civic-50 text-civic-800 border border-civic-200 flex items-center justify-center">
              <Activity className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Overall Status</div>
              <div className="text-xl font-bold text-ink-primary capitalize flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                <span>{health.status}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-md bg-paper-subtle border border-border-subtle">
              <span className="text-xs font-semibold text-ink-muted block">Service Uptime</span>
              <span className="text-base font-mono font-bold text-ink-primary">{Math.floor(health.uptime)}s</span>
            </div>
            <div className="p-3.5 rounded-md bg-paper-subtle border border-border-subtle">
              <span className="text-xs font-semibold text-ink-muted block">Environment</span>
              <span className="text-base font-mono font-bold text-ink-primary uppercase">{health.environment}</span>
            </div>
            <div className="p-3.5 rounded-md bg-paper-subtle border border-border-subtle">
              <span className="text-xs font-semibold text-ink-muted block">App Version</span>
              <span className="text-base font-mono font-bold text-ink-primary">{health.version}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Connected Services</h2>

            <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden bg-paper-card">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink-primary block text-sm">Firebase Firestore Database</span>
                  <span className="text-xs text-ink-secondary">Document persistence for civic issues</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.database === 'connected' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-terracotta-700 bg-terracotta-50 px-2.5 py-1 rounded-md border border-terracotta-200">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      In-Memory Mode (Pending creds)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink-primary block text-sm">Google Gemini AI Engine</span>
                  <span className="text-xs text-ink-secondary">Autonomous civic triage and urgency analysis</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.gemini === 'ready' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-terracotta-700 bg-terracotta-50 px-2.5 py-1 rounded-md border border-terracotta-200">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      Rule-Based Fallback (GEMINI_API_KEY pending)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink-primary block text-sm">Firebase Authentication</span>
                  <span className="text-xs text-ink-secondary">Token verification and role security</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.auth === 'ready' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-muted bg-paper-subtle px-2.5 py-1 rounded-md border border-border-subtle">
                      Optional in Hackathon Mode
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </PageContainer>
  );
}
