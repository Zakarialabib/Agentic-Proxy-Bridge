# Frontend Agentic Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded `[]` and `null` props in `App.tsx` with dynamic, real-time agentic data fetched from the Python proxy bridge endpoints (Observability, Tools, Worklog).

**Architecture:** We will create specific React Query hooks in the frontend (`use-observability.ts`, `use-tools.ts`, `use-worklogs.ts`) to poll the backend APIs. `App.tsx` will then consume these hooks and pass the live data down to `ObservabilityPanel`, `ToolsPanel`, `OrchestratePanel`, and `WorklogPanel`.

**Tech Stack:** React, TailwindCSS, `@tanstack/react-query`, Axios/Fetch.

---

### Task 1: Create Data Fetching Hooks

**Files:**
- Create: `frontend-vite/src/hooks/use-observability.ts`
- Create: `frontend-vite/src/hooks/use-tools-data.ts`
- Create: `frontend-vite/src/hooks/use-worklogs.ts`
- Create: `frontend-vite/src/lib/agent-api.ts`

- [ ] **Step 1: Create the API client layer**

Create `frontend-vite/src/lib/agent-api.ts`:
```typescript
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
```

- [ ] **Step 2: Create React Query Hooks**

Create `frontend-vite/src/hooks/use-observability.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchObservabilityDashboard, fetchObservabilityHealth } from '@/lib/agent-api';

export function useObservability() {
  const dashboardQuery = useQuery({
    queryKey: ['observability-dashboard'],
    queryFn: fetchObservabilityDashboard,
    refetchInterval: 3000,
  });

  const healthQuery = useQuery({
    queryKey: ['observability-health'],
    queryFn: fetchObservabilityHealth,
    refetchInterval: 5000,
  });

  return {
    dashboard: dashboardQuery.data,
    health: healthQuery.data,
    isLoading: dashboardQuery.isLoading || healthQuery.isLoading,
  };
}
```

Create `frontend-vite/src/hooks/use-tools-data.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchToolsList } from '@/lib/agent-api';

export function useToolsData() {
  const toolsQuery = useQuery({
    queryKey: ['tools-list'],
    queryFn: fetchToolsList,
    refetchInterval: 10000,
  });

  return {
    tools: toolsQuery.data?.tools || [],
    total: toolsQuery.data?.total || 0,
    isLoading: toolsQuery.isLoading,
  };
}
```

Create `frontend-vite/src/hooks/use-worklogs.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchWorklogs } from '@/lib/agent-api';

export function useWorklogs() {
  const worklogQuery = useQuery({
    queryKey: ['worklogs'],
    queryFn: fetchWorklogs,
    refetchInterval: 5000,
  });

  return {
    worklogs: worklogQuery.data || [],
    isLoading: worklogQuery.isLoading,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/lib/agent-api.ts frontend-vite/src/hooks/use-*.ts
git commit -m "feat: add React Query hooks for agentic telemetry APIs"
```

### Task 2: Wire the Hooks into App.tsx

**Files:**
- Modify: `frontend-vite/src/App.tsx`

- [ ] **Step 1: Import the hooks**

```typescript
import { useObservability } from '@/hooks/use-observability'
import { useToolsData } from '@/hooks/use-tools-data'
import { useWorklogs } from '@/hooks/use-worklogs'
```

- [ ] **Step 2: Call the hooks inside App component**

Add these lines right after `const chatStore = useChatStore()`:
```typescript
  const { dashboard: obsDashboard, health: obsHealth } = useObservability()
  const { tools: agentTools } = useToolsData()
  const { worklogs } = useWorklogs()
```

- [ ] **Step 3: Replace hardcoded props in renderPanel**

In `renderPanel()`, update the components:

```typescript
      case 'worklog':
        return <ErrorBoundary><WorklogPanel entries={worklogs} /></ErrorBoundary>
```

```typescript
      case 'orchestrate':
        return <ErrorBoundary><OrchestratePanel tools={agentTools} agents={[]} /></ErrorBoundary>
```

```typescript
      case 'tools':
        return <ErrorBoundary><ToolsPanel tools={agentTools} /></ErrorBoundary>
```

```typescript
      case 'observability':
        return <ErrorBoundary><ObservabilityPanel
          vramTetris={[]} // Can map from /vram if needed later
          threeTimeHorizon={obsDashboard?.connectionPool || null}
          healthOrganism={obsHealth?.overall || null}
          confidencePoints={[]}
          presetLineage={[]}
          sessionNarrative={obsDashboard?.overall || null}
          negotiations={[]}
          failures={obsDashboard?.recommendations || []}
        /></ErrorBoundary>
```

- [ ] **Step 4: Commit**

```bash
git add frontend-vite/src/App.tsx
git commit -m "feat: wire dynamic agentic telemetry data to UI panels"
```

### Task 3: Fix TypeScript Interfaces in Panels (If Needed)

**Files:**
- Modify: `frontend-vite/src/components/features/WorklogPanel.tsx` (if interface mismatch)
- Modify: `frontend-vite/src/components/features/ToolsPanel.tsx` (if interface mismatch)

- [ ] **Step 1: Verify data shapes map correctly**

Run `cd frontend-vite && npm run build` to catch any immediate type mismatches caused by passing the dynamic arrays instead of `[]`. If the interfaces match, this task requires no code changes. If not, map the data in `App.tsx` to fit the component interfaces.

- [ ] **Step 2: Commit any type fixes**

```bash
git add frontend-vite/src/components/features/
git commit -m "fix: align panel interfaces with backend telemetry shapes"
```
