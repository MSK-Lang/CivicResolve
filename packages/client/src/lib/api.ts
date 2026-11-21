import type { CivicIssue, CreateIssueInput, HealthCheckResponse } from '@civicresolve/shared';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch('/healthz');
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
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
    throw new Error(errorData.message || `Issue not found`);
  }
  const json = await res.json();
  return json.data;
}

export async function createIssue(input: CreateIssueInput): Promise<CivicIssue> {
  const res = await fetch(`${API_BASE}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create issue`);
  }

  const json = await res.json();
  return json.data;
}
