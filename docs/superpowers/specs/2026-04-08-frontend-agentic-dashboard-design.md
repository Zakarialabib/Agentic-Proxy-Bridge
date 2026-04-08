# Frontend Agentic Dashboard Design

## Goal
Transform the static, hardcoded React UI panels (`ObservabilityPanel`, `OrchestratePanel`, `ProtocolsPanel`, `WorklogPanel`, `ToolsPanel`, `GatewayPanel`, `KnowledgePanel`) into a dynamic, data-driven "Agent OS Dashboard" that consumes real-time telemetry and state from the Python proxy bridge.

## Architecture & Data Flow
1. **Backend Integration**: 
   - We already have a suite of endpoints under `/api/observability/*`, `/api/tools/*`, and `/api/worklog/*` in the Python backend.
   - We need to extend the frontend's `use-system-status.ts` (or create dedicated React Query hooks) to fetch data from these real endpoints instead of passing `[]` or `null` from `App.tsx`.
2. **Frontend State Management**:
   - Utilize `@tanstack/react-query` to poll/fetch data for the dashboard components.
   - Update `App.tsx` to pass the fetched data down to the respective panels.
3. **Component Updates**:
   - **ObservabilityPanel**: Hook into `/api/observability/dashboard`, `/api/observability/health`, and `/api/observability/vram`.
   - **ToolsPanel & OrchestratePanel**: Hook into `/api/tools/list` and `/api/tools/stats`.
   - **WorklogPanel**: Hook into `/api/worklog/`.
   - **ProtocolsPanel**: Hook into `/api/observability/health` or system status for MCP/A2A connections.

## Components to Modify
- `frontend-vite/src/hooks/use-system-status.ts`: Add queries for Observability, Tools, and Worklogs.
- `frontend-vite/src/App.tsx`: Destructure the new query data and pass it to the panels instead of hardcoded arrays.
- `frontend-vite/src/components/features/ObservabilityPanel.tsx`: Ensure it accepts the new payload structure.
- `frontend-vite/src/components/features/ToolsPanel.tsx`: Render dynamic tool definitions from the registry.
- `frontend-vite/src/components/features/WorklogPanel.tsx`: Render actual DB worklogs.

## Trade-offs
- **Polling vs. WebSockets**: For now, we will use React Query polling (every 3-5 seconds) for dashboard metrics to keep architectural complexity low, as we already have `getPollingPolicy` set up. We can upgrade to WebSockets later if real-time sub-second latency is required.

## Testing
- Verify that opening the Dashboard, Observability, and Tools tabs triggers network requests to the backend.
- Ensure the UI renders the JSON responses correctly without throwing undefined errors.