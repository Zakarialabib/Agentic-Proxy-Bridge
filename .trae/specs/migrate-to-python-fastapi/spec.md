# LM Studio Proxy Bridge Migration Spec

## Why
The current Bun/Next.js architecture for the LM Studio Proxy Bridge needs to migrate to Python (FastAPI) and Vite (React) to leverage Python's mature async ecosystem, better handle I/O-heavy streaming workloads, and decouple the frontend build tool for faster development.

## What Changes
- **BREAKING**: Replace Bun/TypeScript proxy bridge backend with Python FastAPI.
- **BREAKING**: Migrate Next.js frontend to Vite + React.
- Implement event loop architecture using `uvloop` and Uvicorn.
- Replace LMStudioConnectionPool with `httpx.AsyncClient` hierarchical pool.
- Migrate StreamingLatencyOptimizer to a generator-based middleware for streaming backpressure.
- Migrate EmbeddingRequestCoalescer to Python using `asyncio.Lock` and `Future` for request deduplication and batching.
- Implement `asyncio.TaskGroup` for structured concurrency.
- Replace custom Prometheus metrics with `prometheus-client`.

## Impact
- Affected specs: Proxy Bridge (Port 3001), Frontend (Port 3000)
- Affected code: `mini-services/proxy-bridge/`, `frontend/`

## ADDED Requirements
### Requirement: FastAPI Proxy Bridge
The system SHALL provide an ASGI application using FastAPI and uvloop that implements the OpenAI-compatible API contract.

#### Scenario: Success case
- **WHEN** client sends a streaming chat completion request
- **THEN** FastAPI streams back chunks using backpressure-aware priority queuing and connection pooling.

## MODIFIED Requirements
### Requirement: React Frontend
The system SHALL serve the React frontend using Vite instead of Next.js, preserving existing state management and UI components while changing the API base URL to point to the new FastAPI backend on Port 3001.

## REMOVED Requirements
### Requirement: Bun Next.js Backend
**Reason**: Python's mature async ecosystem and native generator chaining provide better maintainability and performance for this specific AI proxy workload.
**Migration**: Replace entirely with FastAPI and Vite.
