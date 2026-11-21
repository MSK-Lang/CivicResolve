import type { CivicIssue, CreateIssueInput, HealthCheckResponse } from '@civicresolve/shared';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch('/api/health').catch(() => fetch('/healthz'));
  if (!res.ok) {
    const fallback = await fetch('/healthz');
    if (!fallback.ok) {
      throw new Error(`Health check failed with status ${fallback.status}`);
    }
    return fallback.json();
  }
  return res.json();
}

export async function fetchIssues(): Promise<CivicIssue[]> {
  const res = await fetch(`${API_BASE}/issues`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch issues: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchIssueById(id: string): Promise<CivicIssue> {
  const res = await fetch(`${API_BASE}/issues/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Issue not found');
  }
  const json = await res.json();
  return json.data;
}

export async function createIssue(input: CreateIssueInput, idempotencyKey?: string): Promise<CivicIssue> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create issue');
  }

  const json = await res.json();
  return json.data;
}

export async function fetchAdminIssues(
  token: string,
  params?: { limit?: number; offset?: number; category?: string; status?: string }
): Promise<{ issues: CivicIssue[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.category) query.set('category', params.category);
  if (params?.status) query.set('status', params.status);

  const res = await fetch(`${API_BASE}/admin/issues?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Admin request failed: ${res.statusText}`);
  }

  const json = await res.json();
  return {
    issues: json.data || [],
    total: json.pagination?.total ?? (json.data?.length || 0)
  };
}

export async function fetchAdminIssueById(token: string, id: string): Promise<CivicIssue> {
  const res = await fetch(`${API_BASE}/admin/issues/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch report');
  }

  const json = await res.json();
  return json.data;
}

export async function updateAdminIssue(
  token: string,
  id: string,
  updates: { status?: string; urgency?: string; notes?: string }
): Promise<CivicIssue> {
  const res = await fetch(`${API_BASE}/admin/issues/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update report');
  }

  const json = await res.json();
  return json.data;
}

export async function fetchAdminClusters(token?: string): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/clusters`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch clusters: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function submitClusterDecision(
  token: string,
  clusterId: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/clusters/${encodeURIComponent(clusterId)}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ decision, notes })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to submit cluster decision');
  }

  return res.json();
}
