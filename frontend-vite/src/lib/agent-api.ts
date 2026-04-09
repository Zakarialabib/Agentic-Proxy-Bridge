import { PROXY_BRIDGE_URL } from './config'

const BASE_URL = PROXY_BRIDGE_URL // Connect directly to Proxy Bridge


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

export async function fetchGatewayStatus() {
  try {
    const res = await fetch(`${BASE_URL}/api/retrieve/gateway/status`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchKnowledgeStatus() {
  try {
    const res = await fetch(`${BASE_URL}/api/embeddings/knowledge/status`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchProtocols() {
  try {
    const res = await fetch(`${BASE_URL}/api/mcp/status`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchAgents() {
  try {
    const res = await fetch(`${BASE_URL}/api/ace/agents`);
    if (!res.ok) return { agents: [] };
    return res.json();
  } catch { return { agents: [] }; }
}
