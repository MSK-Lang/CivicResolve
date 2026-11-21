import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchIssueById } from '../lib/api';
import type { CivicIssue } from '@civicresolve/shared';
import { LoadingState, ErrorState } from '../components/UIStates';
import { ArrowLeft, MapPin, Calendar, Bot, CheckCircle, Clock } from 'lucide-react';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<CivicIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchIssueById(id)
      .then(setIssue)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingState label="Retrieving issue records..." />;
  }

  if (error || !issue) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <ErrorState
          title="Issue Not Found"
          message={error || 'Could not find the requested civic record.'}
          onRetry={() => navigate('/')}
        />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 p-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-civic-600 rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Return to Dashboard</span>
      </Link>

      {/* Main Issue Card */}
      <article className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
            {issue.category.replace('_', ' ')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
              Urgency: {issue.urgency}
            </span>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
              Status: {issue.status}
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{issue.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>{issue.location.address} {issue.location.neighborhood ? `(${issue.location.neighborhood})` : ''}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Logged on {new Date(issue.createdAt).toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Reference ID: {issue.id}</span>
          </span>
        </div>

        <div className="prose max-w-none text-slate-700 leading-relaxed mb-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Description</h2>
          <p className="whitespace-pre-wrap">{issue.description}</p>
        </div>

        {/* AI Triage Card */}
        {issue.aiTriage && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mt-6">
            <div className="flex items-center gap-2 text-civic-800 font-bold text-base mb-3">
              <Bot className="w-5 h-5 text-civic-600" aria-hidden="true" />
              <span>Municipal AI Triage Breakdown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Responsible Department</span>
                <span className="font-medium text-slate-900">{issue.aiTriage.assignedDepartment}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Confidence Score</span>
                <span className="font-medium text-slate-900">{Math.round(issue.aiTriage.confidenceScore * 100)}% Match</span>
              </div>
            </div>

            <div className="mb-4 text-sm">
              <span className="text-xs font-semibold text-slate-500 block">Triage Reasoning</span>
              <p className="text-slate-700 mt-0.5">{issue.aiTriage.reasoning}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-2">Dispatch Action Plan</span>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {issue.aiTriage.suggestedActionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
