# LM Studio Proxy Bridge Docs

This folder is the single source of project documentation.

## Start Here

- Read [plan.md](./plan.md) for the current implementation roadmap and Phase 8 details.
- Read [ARCHITECTURE_STRATEGY.md](./ARCHITECTURE_STRATEGY.md) for the long-form design rationale.
- Read [PROS_CONS.md](./PROS_CONS.md) for trade-off decisions and constraints.
- Read [FUTURE_FEATURES.md](./FUTURE_FEATURES.md) for backlog and priority ideas.
- Read [WORKLOG.md](./WORKLOG.md) for implementation history.

## System Shape

- `webapp` (`http://localhost:3000`) -> Next.js frontend and API proxy routes.
- `proxy bridge` (`http://localhost:3001`) -> Bun runtime with OpenAI-compatible and internal endpoints.
- `LM Studio` (`http://localhost:1234`) -> local inference runtime for LLM, embeddings, and reranker models.

## Core API Surface

- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- `POST /v1/rerank`
- `GET /v1/models`
- `POST /v1/agent/orchestrate`

Internal project endpoints are exposed under `/api/proxy/*`.

## Recommended Qwen Stack

- Chat/reasoning: `Qwen3-4B` (or larger when VRAM allows).
- Embeddings: `Qwen3-Embedding-0.6B`.
- Reranking: `Qwen3-Reranker-0.6B`.
- Upgrade path: use 4B embedding/reranker variants when >=16GB VRAM is available.

## Coding-Agent Priorities

- Keep OpenAI contract fidelity (roles, tools, finish reasons, usage).
- Ground responses with retrieval context (embeddings + rerank + file/tool outputs).
- Prefer deterministic context-budgeting and tool invocation policy over ad-hoc prompt growth.
- Keep dashboard signals actionable: model status, latency, tool-call success, fallback events.

---

# Phase 8: Streaming & Stability Integration

**Status:** In Progress  
**Date:** March 31, 2026

## Services Implemented

| Service | File | Purpose | Status |
|---------|------|---------|--------|
| Streaming Latency Optimizer | `services/streaming-latency-optimizer.ts` | Chunked streaming with backpressure | ✅ Ready |
| LM Studio Connection Pool | `services/lm-studio-connection-pool.ts` | Concurrent request management | ✅ Ready |
| Embedding Request Coalescer | `services/embedding-request-coalescer.ts` | Request batching & deduplication | ✅ Ready |

## Implementation Phases

### Phase 8.1: Code Integration
- [x] Add service imports to `index.ts`
- [x] Initialize connection pool on startup
- [x] Initialize embedding coalescer on startup
- [ ] Wire up connection pool to chat/completion endpoints
- [ ] Wire up embedding coalescer to embedding endpoint
- [x] Add event listeners for monitoring

### Phase 8.2: Testing
- [ ] Unit tests for each service
- [ ] Integration test with all three services
- [ ] Load test with 50+ concurrent requests
- [ ] LM Studio crash prevention test
- [ ] Embedding deduplication test
- [ ] Memory pressure test

### Phase 8.3: Monitoring & Metrics
- [x] Connection pool metrics collection (`/api/proxy/stats/phase8`)
- [x] Embedding coalescer metrics
- [ ] Prometheus integration
- [ ] Monitoring dashboard

### Phase 8.4: Configuration Tuning
- [ ] Benchmark with default config
- [ ] Identify bottlenecks
- [ ] Tune maxConnections based on LM Studio
- [ ] Optimize batch size and timeout
- [ ] Optimize chunk size and flush interval

### Phase 8.5: Documentation
- [x] Integration guide (`docs/plan.md`)
- [ ] Monitoring guide
- [ ] Troubleshooting guide
- [ ] Performance tuning guide
- [ ] Update API documentation

## Configuration Defaults

### Connection Pool
```typescript
{
  maxConnections: 10,
  maxQueueSize: 100,
  requestTimeout: 30000,
  healthCheckInterval: 5000,
  retryAttempts: 3,
  retryBackoffMs: 1000
}
```

### Embedding Coalescer
```typescript
{
  batchSize: 128,
  batchTimeoutMs: 100,
  deduplicateInterval: 60000,
  maxConcurrentBatches: 3
}
```

### Streaming Optimizer
```typescript
{
  highWaterMark: 64 * 1024,
  lowWaterMark: 16 * 1024,
  chunkSize: 4 * 1024,
  flushInterval: 16
}
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| P99 Latency | <100ms | ~150-200ms |
| Memory Peak | 30% reduction | Baseline |
| LM Studio Crashes | 0 | Variable |
| Embedding Requests | -50-70% | Baseline |
| Concurrent Limit | 50+ | ~10 |
