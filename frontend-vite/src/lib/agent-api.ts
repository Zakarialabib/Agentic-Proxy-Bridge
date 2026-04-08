const BASE_URL = ''; // Proxy via vite

export async function fetchObservabilityDashboard() {
  const res = await fetch(`${BASE_URL}/api/observability/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchObservabilityHealth() {
  const res = await fetch(`${BASE_URL}/api/observability/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchToolsList() {
  const res = await fetch(`${BASE_URL}/api/tools/list`);
  if (!res.ok) throw new Error('Failed to fetch tools');
  return res.json();
}

export async function fetchWorklogs() {
  const res = await fetch(`${BASE_URL}/api/worklog/`);
  if (!res.ok) throw new Error('Failed to fetch worklogs');
  return res.json();
}
