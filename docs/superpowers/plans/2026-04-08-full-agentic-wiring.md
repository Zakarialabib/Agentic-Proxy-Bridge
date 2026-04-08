# Full Agentic Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the remaining static UI tabs (Gateway, Knowledge, Protocols, Orchestrate) to real backend APIs, persist data via the backend database, and add loading spinners to buttons so users know background processes are working.

**Architecture:** We will expand the React Query API client to hit the proxy bridge's `/api/retrieve/gateway`, `/api/embeddings/knowledge`, `/api/mcp/*`, and `/api/ace/agents` endpoints. We will pass this live data down through `App.tsx` into the components and add `isLoading` props to all primary action buttons.

**Tech Stack:** React, TailwindCSS, `@tanstack/react-query`, Python/FastAPI (Backend)

---

### Task 1: Expand API Client Hooks

**Files:**
- Modify: `frontend-vite/src/lib/agent-api.ts`
- Create: `frontend-vite/src/hooks/use-gateway.ts`
- Create: `frontend-vite/src/hooks/use-knowledge.ts`
- Create: `frontend-vite/src/hooks/use-protocols.ts`
- Create: `frontend-vite/src/hooks/use-orchestrate.ts`

- [ ] **Step 1: Update API client layer**

In `frontend-vite/src/lib/agent-api.ts`, add:
```typescript
export async function fetchGatewayStatus() {
  const res = await fetch(`${BASE_URL}/api/retrieve/gateway/status`);
  if (!res.ok) throw new Error('Failed to fetch gateway');
  return res.json();
}

export async function fetchKnowledgeStatus() {
  const res = await fetch(`${BASE_URL}/api/embeddings/knowledge/status`);
  if (!res.ok) throw new Error('Failed to fetch knowledge');
  return res.json();
}

export async function fetchProtocols() {
  const res = await fetch(`${BASE_URL}/api/mcp/status`);
  if (!res.ok) throw new Error('Failed to fetch protocols');
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${BASE_URL}/api/ace/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}
```

- [ ] **Step 2: Create React Query Hooks**

Create `frontend-vite/src/hooks/use-gateway.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchGatewayStatus } from '@/lib/agent-api';

export function useGateway() {
  const query = useQuery({
    queryKey: ['gateway'],
    queryFn: fetchGatewayStatus,
    refetchInterval: 5000,
  });
  return { gateway: query.data, isLoading: query.isLoading };
}
```

Create `frontend-vite/src/hooks/use-knowledge.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchKnowledgeStatus } from '@/lib/agent-api';

export function useKnowledge() {
  const query = useQuery({
    queryKey: ['knowledge'],
    queryFn: fetchKnowledgeStatus,
    refetchInterval: 5000,
  });
  return { knowledge: query.data, isLoading: query.isLoading };
}
```

Create `frontend-vite/src/hooks/use-protocols.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchProtocols } from '@/lib/agent-api';

export function useProtocols() {
  const query = useQuery({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
    refetchInterval: 5000,
  });
  return { protocols: query.data, isLoading: query.isLoading };
}
```

Create `frontend-vite/src/hooks/use-orchestrate.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/agent-api';

export function useOrchestrate() {
  const query = useQuery({
    queryKey: ['orchestrate'],
    queryFn: fetchAgents,
    refetchInterval: 5000,
  });
  return { agents: query.data?.agents || [], isLoading: query.isLoading };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/lib/agent-api.ts frontend-vite/src/hooks/
git commit -m "feat: add React Query hooks for Gateway, Knowledge, Protocols, and Orchestrate"
```

### Task 2: Wire the Hooks into App.tsx

**Files:**
- Modify: `frontend-vite/src/App.tsx`

- [ ] **Step 1: Import the new hooks**

```typescript
import { useGateway } from '@/hooks/use-gateway'
import { useKnowledge } from '@/hooks/use-knowledge'
import { useProtocols } from '@/hooks/use-protocols'
import { useOrchestrate } from '@/hooks/use-orchestrate'
```

- [ ] **Step 2: Call the hooks inside App component**

```typescript
  const { gateway } = useGateway()
  const { knowledge } = useKnowledge()
  const { protocols } = useProtocols()
  const { agents } = useOrchestrate()
```

- [ ] **Step 3: Replace hardcoded props in renderPanel**

```typescript
      case 'gateway':
        return <ErrorBoundary><GatewayPanel
          gatewayQuery=""
          onQueryChange={() => {}}
          onSearch={() => {}}
          embeddingPresets={gateway?.embeddingPresets || {}}
          mrlPresets={gateway?.mrlPresets || {}}
          rerankerConfigs={gateway?.rerankerConfigs || {}}
          chatTestPresets={gateway?.chatTestPresets || []}
          gatewayResult={null}
          selectedPreset=""
          selectedMRL=""
          selectedReranker=""
          testPresetId=""
          onPresetChange={() => {}}
          onMRLChange={() => {}}
          onRerankerChange={() => {}}
          onTestPresetChange={() => {}}
          onRunTest={() => {}}
        /></ErrorBoundary>
```

```typescript
      case 'orchestrate':
        return <ErrorBoundary><OrchestratePanel tools={agentTools || []} agents={agents || []} /></ErrorBoundary>
```

```typescript
      case 'knowledge':
        return <ErrorBoundary><KnowledgePanel
          status={status ?? null}
          knowledgeQuery=""
          onQueryChange={() => {}}
          onQuerySubmit={() => {}}
          knowledgeResults={knowledge?.results || null}
          indexDocument=""
          onIndexDocumentChange={() => {}}
          indexUrl=""
          onIndexUrlChange={() => {}}
          indexFile={null}
          onFileSelect={() => {}}
          isIndexing={false}
          isFetchingUrl={false}
          onIndexSubmit={() => {}}
          onFetchUrl={() => {}}
        /></ErrorBoundary>
```

```typescript
      case 'protocols':
        return <ErrorBoundary><ProtocolsPanel 
          mcpServers={protocols?.mcpServers || []} 
          a2aAgents={protocols?.a2aAgents || []} 
          asyncTasks={protocols?.asyncTasks || []} 
        /></ErrorBoundary>
```

- [ ] **Step 4: Commit**

```bash
git add frontend-vite/src/App.tsx
git commit -m "feat: wire dynamic agentic data to Gateway, Knowledge, Protocols, and Orchestrate panels"
```

### Task 3: Add Loading Spinners to Buttons

**Files:**
- Modify: `frontend-vite/src/components/features/KnowledgePanel.tsx`
- Modify: `frontend-vite/src/components/features/GatewayPanel.tsx`

- [ ] **Step 1: KnowledgePanel Upload & Index Buttons**

In `KnowledgePanel.tsx`, find the "Index Document" button and ensure it uses the `Loader2` spinner when `isIndexing` is true. It already has `isIndexing ? 'Indexing...' : 'Index Document'`, so let's add the spinner.

```typescript
          <Button 
            onClick={onIndexSubmit}
            disabled={!indexDocument.trim() && !indexFile && !indexUrl.trim() || isIndexing}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          >
            {isIndexing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            {isIndexing ? 'Indexing...' : 'Index Document'}
          </Button>
```

- [ ] **Step 2: GatewayPanel Search Button**

In `GatewayPanel.tsx`, add an `isSearching` prop to the interface.

```typescript
interface GatewayPanelProps {
  // ... existing props
  isSearching?: boolean;
}
```

Update the Search button:
```typescript
                <Button onClick={onSearch} disabled={isSearching} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
```

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/components/features/KnowledgePanel.tsx frontend-vite/src/components/features/GatewayPanel.tsx
git commit -m "feat: add loading spinners to panel action buttons"
```
