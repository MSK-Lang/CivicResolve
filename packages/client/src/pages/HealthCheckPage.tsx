import { useState, useEffect } from 'react';
import { fetchHealth } from '../lib/api';
import type { HealthCheckResponse } from '@civicresolve/shared';
import { LoadingState, ErrorState } from '../components/UIStates';
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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Infrastructure Health</h1>
          <p className="text-sm text-slate-600">
            Real-time status of backend service connectors, database, and AI triage.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHealth}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold border border-slate-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <LoadingState label="Querying backend health endpoint (/healthz)..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadHealth} />
      ) : health ? (
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-civic-100 text-civic-700 flex items-center justify-center">
              <Activity className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">Overall Status</div>
              <div className="text-xl font-bold text-slate-900 capitalize flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{health.status}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Service Uptime</span>
              <span className="text-lg font-bold text-slate-900">{Math.floor(health.uptime)} seconds</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Environment</span>
              <span className="text-lg font-bold text-slate-900 uppercase">{health.environment}</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">App Version</span>
              <span className="text-lg font-bold text-slate-900">{health.version}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Connected Services</h2>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block text-sm">Firebase Firestore Database</span>
                  <span className="text-xs text-slate-500">Document persistence for civic issues</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.database === 'connected' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      In-Memory Mode (Pending creds)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block text-sm">Google Gemini AI Engine</span>
                  <span className="text-xs text-slate-500">Autonomous civic triage and urgency analysis</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.gemini === 'ready' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      Rule-Based Fallback (GEMINI_API_KEY pending)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block text-sm">Firebase Authentication</span>
                  <span className="text-xs text-slate-500">Token verification and role security</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {health.services.auth === 'ready' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Optional in Hackathon Mode
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
