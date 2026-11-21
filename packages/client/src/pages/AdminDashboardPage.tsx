import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  fetchAdminIssues,
  fetchAdminIssueById,
  updateAdminIssue,
  fetchAdminClusters,
  submitClusterDecision,
} from '../lib/api';
import type {
  CivicIssue,
  CivicIssueStatus,
  ReportAuditEvent,
  DuplicateCandidate,
} from '@civicresolve/shared';
import { Button, Input, Select, FormField, PriorityIndicator } from '../components/ui';
import {
  Lock,
  LogOut,
  RefreshCw,
  AlertTriangle,
  X,
  Layers,
  Filter,
} from 'lucide-react';

const GeographicIntelligenceMap = lazy(() =>
  import('../components/admin/GeographicIntelligenceMap').then(m => ({ default: m.GeographicIntelligenceMap }))
);

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'pothole', label: 'Pothole or Road Damage' },
  { value: 'sanitation', label: 'Waste & Sanitation' },
  { value: 'street_lighting', label: 'Broken Street Lighting' },
  { value: 'water_supply', label: 'Water Leakage' },
  { value: 'public_safety', label: 'Public Safety Hazard' },
  { value: 'traffic_signals', label: 'Faulty Traffic Signal' },
  { value: 'parks_recreation', label: 'Park Maintenance' },
  { value: 'other', label: 'Other Civic Concern' },
];

const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'P1_CRITICAL', label: 'P1 Critical' },
  { value: 'P2_HIGH', label: 'P2 High' },
  { value: 'P3_MEDIUM', label: 'P3 Medium' },
  { value: 'P4_LOW', label: 'P4 Low' },
];

export function AdminDashboardPage() {
  // Authentication State
  const [token, setToken] = useState<string>(() => sessionStorage.getItem('civicresolve_admin_token') || '');
  const [authInput, setAuthInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(false);

  // Data State
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [clusters, setClusters] = useState<DuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtering State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Inspection & Action Modal State
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [actionStatus, setActionStatus] = useState<CivicIssueStatus>('in_progress');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  // Cluster Decision State
  const [clusterNotes, setClusterNotes] = useState<Record<string, string>>({});
  const [clusterDecisionLoading, setClusterDecisionLoading] = useState<Record<string, boolean>>({});

  // Verify token on mount or input
  useEffect(() => {
    if (token) {
      verifyAndLoad(token);
    }
  }, []);

  const verifyAndLoad = async (authToken: string) => {
    setIsVerifyingAuth(true);
    setAuthError(null);
    try {
      // Test admin credentials against /api/admin/issues
      const result = await fetchAdminIssues(authToken, { limit: 100 });
      sessionStorage.setItem('civicresolve_admin_token', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      setIssues(result.issues);
      setTotalCount(result.total);

      // Load clusters in parallel
      fetchAdminClusters(authToken)
        .then(c => setClusters(c))
        .catch(() => setClusters([]));
    } catch (err) {
      setIsAuthenticated(false);
      sessionStorage.removeItem('civicresolve_admin_token');
      setAuthError(err instanceof Error ? err.message : 'Invalid administrative authorization token.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInput.trim()) {
      setAuthError('Please enter an administrative Bearer token.');
      return;
    }
    verifyAndLoad(authInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('civicresolve_admin_token');
    setToken('');
    setAuthInput('');
    setIsAuthenticated(false);
    setIssues([]);
    setSelectedIssue(null);
  };

  const reloadData = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchAdminIssues(token, {
        limit: 100,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setIssues(result.issues);
      setTotalCount(result.total);

      const clusterData = await fetchAdminClusters(token).catch(() => []);
      setClusters(clusterData);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to retrieve reports.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open issue detail modal
  const handleOpenDetail = async (issue: CivicIssue) => {
    setSelectedIssue(issue);
    setActionStatus(issue.status);
    setActionNotes('');
    setUpdateFeedback(null);

    // Fetch full unredacted report detail from admin endpoint
    try {
      const full = await fetchAdminIssueById(token, issue.id);
      setSelectedIssue(full);
      setActionStatus(full.status);
    } catch {
      // Retain already loaded issue representation
    }
  };

  // Submit admin status update
  const handleSaveStatusUpdate = async () => {
    if (!selectedIssue || !token) return;
    setIsUpdating(true);
    setUpdateFeedback(null);
    try {
      const updated = await updateAdminIssue(token, selectedIssue.id, {
        status: actionStatus,
        notes: actionNotes.trim() || undefined,
      });
      setSelectedIssue(updated);
      setUpdateFeedback('Report status updated successfully.');
      // Refresh list
      await reloadData();
    } catch (err) {
      setUpdateFeedback(`Error updating report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit GeoCluster suggestion decision
  const handleClusterDecision = async (clusterId: string, decision: 'approved' | 'rejected') => {
    if (!token) return;
    setClusterDecisionLoading(prev => ({ ...prev, [clusterId]: true }));
    try {
      const notes = clusterNotes[clusterId];
      await submitClusterDecision(token, clusterId, decision, notes);
      // Remove or refresh clusters
      const updatedClusters = await fetchAdminClusters(token).catch(() => []);
      setClusters(updatedClusters);
    } catch (err) {
      alert(`Cluster decision error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClusterDecisionLoading(prev => ({ ...prev, [clusterId]: false }));
    }
  };

  // Memoized client-side priority filter (backend list endpoint filters category & status)
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (priorityFilter !== 'all') {
        const pLevel = issue.priorityScore?.priorityLevel;
        if (pLevel !== priorityFilter) return false;
      }
      return true;
    });
  }, [issues, categoryFilter, statusFilter, priorityFilter]);

  // Memoized genuine real-data metrics in a single O(N) pass
  const { pendingReviewCount, highPriorityCount, resolvedCount } = useMemo(() => {
    let pending = 0;
    let high = 0;
    let resolved = 0;

    for (const i of issues) {
      if (i.status === 'submitted' || i.status === 'needs_review' || i.status === 'triaged') {
        pending++;
      }
      if (
        i.priorityScore?.priorityLevel === 'P1_CRITICAL' ||
        i.priorityScore?.priorityLevel === 'P2_HIGH' ||
        i.urgency === 'high' ||
        i.urgency === 'critical'
      ) {
        high++;
      }
      if (i.status === 'resolved' || i.status === 'closed') {
        resolved++;
      }
    }

    return { pendingReviewCount: pending, highPriorityCount: high, resolvedCount: resolved };
  }, [issues]);

  // Render Login Gate for Unauthenticated Visitors
  if (!isAuthenticated) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 animate-fade-in">
        <div className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-2">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-normal text-ink-primary tracking-tight">
              Municipal Operations Portal
            </h1>
            <p className="text-xs text-ink-secondary">
              Authorized municipal administrators only. Secure Bearer token validation enforced.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <FormField
              id="admin-token"
              label="Admin Authorization Token"
            >
              <Input
                type="password"
                value={authInput}
                onChange={e => setAuthInput(e.target.value)}
                placeholder="Enter Bearer token..."
                autoComplete="off"
                disabled={isVerifyingAuth}
              />
            </FormField>

            <Button
              type="submit"
              variant="action"
              size="md"
              className="w-full !bg-[#765448] !text-white hover:!bg-[#5E4238] font-semibold"
              isLoading={isVerifyingAuth}
            >
              Authenticate & Enter
            </Button>

            <div className="pt-2 border-t border-border/70 text-center">
              <button
                type="button"
                onClick={() => setAuthInput('admin-jwt-valid')}
                className="text-xs text-accent hover:underline focus:outline-none"
              >
                Use Authorized Demo Token (admin-jwt-valid)
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Render Admin Dashboard
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
              City Administration
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-100 text-emerald-800 rounded font-semibold">
              Authorized Session
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal font-serif text-ink-primary tracking-tight mt-1">
            Municipal Operations Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={reloadData}
            isLoading={isLoading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metric Cards (Real Firestore Counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded border border-border p-4 space-y-1">
          <span className="text-xs font-medium text-ink-secondary">Total Reports</span>
          <div className="text-2xl font-serif font-normal text-ink-primary">{totalCount}</div>
          <span className="text-[11px] text-ink-muted">Registered in Firestore</span>
        </div>

        <div className="bg-surface rounded border border-border p-4 space-y-1">
          <span className="text-xs font-medium text-amber-700">Pending Review</span>
          <div className="text-2xl font-serif font-normal text-amber-800">{pendingReviewCount}</div>
          <span className="text-[11px] text-ink-muted">Awaiting supervisor dispatch</span>
        </div>

        <div className="bg-surface rounded border border-border p-4 space-y-1">
          <span className="text-xs font-medium text-red-700">High-Priority Reports</span>
          <div className="text-2xl font-serif font-normal text-red-800">{highPriorityCount}</div>
          <span className="text-[11px] text-ink-muted">P1 Critical & P2 High SLA</span>
        </div>

        <div className="bg-surface rounded border border-border p-4 space-y-1">
          <span className="text-xs font-medium text-emerald-700">Resolved Reports</span>
          <div className="text-2xl font-serif font-normal text-emerald-800">{resolvedCount}</div>
          <span className="text-[11px] text-ink-muted">Successfully closed out</span>
        </div>
      </div>

      {/* Geographic Intelligence Map Panel */}
      <Suspense
        fallback={
          <div className="h-64 bg-surface rounded border border-border flex items-center justify-center p-6 text-xs text-ink-muted animate-pulse">
            Loading Geographic Intelligence Map...
          </div>
        }
      >
        <GeographicIntelligenceMap
          issues={issues}
          clusters={clusters}
          onSelectIssue={handleOpenDetail}
          initialCategory={categoryFilter}
          initialStatus={statusFilter}
          initialPriority={priorityFilter}
        />
      </Suspense>

      {/* GeoCluster Duplicates Review Section */}
      {clusters.length > 0 && (
        <section className="bg-surface rounded border border-border p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-primary">
                GeoCluster Duplicate Suggestions ({clusters.length})
              </h2>
            </div>
            <span className="text-xs text-ink-muted">Deterministic 500m Haversine Radius</span>
          </div>

          <div className="space-y-3">
            {clusters.map((cluster) => (
              <div
                key={cluster.id}
                className="p-3.5 bg-canvas/60 rounded border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-accent">
                      {cluster.primaryReport?.category || cluster.category || 'Hazard'}
                    </span>
                    <span className="text-xs text-ink-muted">·</span>
                    <span className="text-xs text-ink-secondary">
                      Distance: {cluster.distanceMeters}m
                    </span>
                  </div>
                  <div className="text-sm text-ink-primary font-medium">
                    Primary: &quot;{cluster.primaryReport?.title}&quot; vs Candidate: &quot;{cluster.duplicateReport?.title}&quot;
                  </div>
                  <div className="text-xs text-ink-muted">
                    Location: {cluster.primaryReport?.address || 'Municipal area'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    placeholder="Decision note..."
                    value={clusterNotes[cluster.id] || ''}
                    onChange={e => setClusterNotes({ ...clusterNotes, [cluster.id]: e.target.value })}
                    className="text-xs max-w-[180px]"
                  />
                  <Button
                    type="button"
                    variant="action"
                    size="sm"
                    onClick={() => handleClusterDecision(cluster.id, 'approved')}
                    isLoading={clusterDecisionLoading[cluster.id]}
                    className="text-xs !bg-emerald-700 !text-white hover:!bg-emerald-800"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleClusterDecision(cluster.id, 'rejected')}
                    isLoading={clusterDecisionLoading[cluster.id]}
                    className="text-xs"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reports Table & Filter Bar */}
      <section className="bg-surface rounded border border-border overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-muted" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-primary">
              All Municipal Reports ({filteredIssues.length})
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs min-w-[130px]"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs min-w-[150px]"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>

            <Select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="text-xs min-w-[130px]"
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-ink-muted space-y-2">
            <span className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin inline-block" />
            <p>Loading administrative reports from Firestore...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-xs text-ink-muted space-y-1">
            <p className="font-medium text-ink-secondary">No reports match the selected filters.</p>
            <p>Try resetting status or category filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-ink-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-medium">Title</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Priority</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Location</th>
                  <th className="py-2.5 px-3 font-medium">Submitted</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredIssues.map((issue) => {
                  const priorityLevel = issue.priorityScore?.priorityLevel || 'P3_MEDIUM';
                  const dateStr = new Date(issue.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-canvas/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(issue)}
                    >
                      <td className="py-3 px-3 font-medium text-ink-primary max-w-[200px] truncate">
                        {issue.title}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        <span className="capitalize">{issue.category.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-3">
                        <PriorityIndicator
                          priority={priorityLevel}
                          score={issue.priorityScore?.totalScore}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono capitalize bg-surface-subtle text-ink-primary border border-border">
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-ink-secondary max-w-[180px] truncate">
                        {issue.location.address}
                      </td>
                      <td className="py-3 px-3 text-ink-muted whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(issue);
                          }}
                          className="text-xs text-accent hover:underline py-1 px-2 min-h-0"
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Report Detail & Action Modal */}
      {selectedIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-surface rounded border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                  Report ID: {selectedIssue.id}
                </span>
                <h3 className="font-serif text-xl font-normal text-ink-primary">
                  {selectedIssue.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="text-ink-muted hover:text-ink-primary p-1 rounded"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description & Location */}
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-ink-primary block mb-1">Description</span>
                <p className="text-ink-secondary leading-relaxed bg-canvas/60 p-3 rounded border border-border/80">
                  {selectedIssue.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-ink-primary block mb-1">Location Details</span>
                  <div className="text-ink-secondary space-y-0.5">
                    <p>Address: {selectedIssue.location.address}</p>
                    {selectedIssue.location.neighborhood && (
                      <p>Neighborhood: {selectedIssue.location.neighborhood}</p>
                    )}
                    {typeof selectedIssue.location.latitude === 'number' && (
                      <p className="font-mono text-[11px]">
                        GPS: {selectedIssue.location.latitude}, {selectedIssue.location.longitude}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-ink-primary block mb-1">
                    Reporter Contact (Administrative PII)
                  </span>
                  <div className="text-ink-secondary space-y-0.5">
                    <p>Name: {selectedIssue.reporterName || 'Anonymous Citizen'}</p>
                    <p>Email: {selectedIssue.reporterEmail || 'Not provided'}</p>
                    <p>Phone: {selectedIssue.reporterPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Image Evidence if present */}
              {selectedIssue.image?.url && (
                <div>
                  <span className="font-semibold text-ink-primary block mb-1">Submitted Evidence</span>
                  <img
                    src={selectedIssue.image.url}
                    alt="Evidence photograph"
                    className="max-h-48 rounded border border-border object-cover"
                  />
                </div>
              )}

              {/* Audit History Trail */}
              {selectedIssue.auditHistory && selectedIssue.auditHistory.length > 0 && (
                <div>
                  <span className="font-semibold text-ink-primary block mb-1">Audit History Trail</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto bg-canvas/40 p-2.5 rounded border border-border/70">
                    {selectedIssue.auditHistory.map((event: ReportAuditEvent) => (
                      <div key={event.id} className="text-[11px] text-ink-secondary border-b border-border/40 pb-1 last:border-0">
                        <span className="font-mono text-ink-muted">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>{' '}
                        <span className="font-medium text-ink-primary">[{event.actor.type}]</span>{' '}
                        <span>{event.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Action Area */}
            <div className="bg-canvas/80 p-4 rounded border border-border space-y-3">
              <h4 className="text-xs font-semibold text-ink-primary uppercase tracking-wider">
                Administrative Actions
              </h4>

              {updateFeedback && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  {updateFeedback}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="action-status" label="Update Lifecycle Status">
                  <Select
                    value={actionStatus}
                    onChange={e => setActionStatus(e.target.value as CivicIssueStatus)}
                    className="text-xs"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="triaged">Triaged</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Select>
                </FormField>

                <FormField id="action-notes" label="Administrative Notes">
                  <Input
                    placeholder="e.g. Dispatched road repair team..."
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    className="text-xs"
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIssue(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="action"
                  size="sm"
                  onClick={handleSaveStatusUpdate}
                  isLoading={isUpdating}
                  className="text-xs !bg-[#765448] !text-white hover:!bg-[#5E4238]"
                >
                  Save Status & Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
