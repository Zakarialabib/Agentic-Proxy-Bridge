# Tasks
- [x] Task 1: Initialize FastAPI Backend
  - [x] SubTask 1.1: Setup Python project with `uvloop`, `httpx`, `fastapi`, and `prometheus-client`.
  - [x] SubTask 1.2: Create FastAPI skeleton and Pydantic schemas (e.g., `AgentOrchestrateRequest`).
  - [x] SubTask 1.3: Implement basic `/v1/models` endpoint.
- [x] Task 2: Implement Connection Pooling and Streaming
  - [x] SubTask 2.1: Implement hierarchical connection pool using `httpx.AsyncClient`.
  - [x] SubTask 2.2: Implement backpressure-aware streaming generator middleware.
  - [x] SubTask 2.3: Build `/v1/chat/completions` endpoint with streaming.
- [x] Task 3: Implement Embedding Coalescer
  - [x] SubTask 3.1: Create hash-based deduplication and time-window batching logic.
  - [x] SubTask 3.2: Build `/v1/embeddings` endpoint.
- [x] Task 4: Agent Orchestration and Observability
  - [x] SubTask 4.1: Implement `/v1/agent/orchestrate` endpoint with `asyncio.TaskGroup`.
  - [x] SubTask 4.2: Integrate `prometheus-client` for connection pool and batch size metrics.
- [x] Task 5: Migrate Frontend to Vite
  - [x] SubTask 5.1: Initialize Vite React template.
  - [x] SubTask 5.2: Migrate existing React components, Tailwind config, and state management.
  - [x] SubTask 5.3: Update API client base URLs to point to Port 3001.
- [x] Task 6: Deployment Configuration
  - [x] SubTask 6.1: Create multi-stage Dockerfile for FastAPI backend.
  - [x] SubTask 6.2: Create deployment scripts for Vite frontend.

# Task Dependencies
- Task 2 depends on Task 1.
- Task 3 depends on Task 1.
- Task 4 depends on Task 2 and Task 3.
- Task 5 can run in parallel with Backend tasks.
- Task 6 depends on all previous tasks.
