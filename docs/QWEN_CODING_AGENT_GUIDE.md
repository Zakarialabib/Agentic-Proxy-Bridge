# Qwen Coding-Agent Guide

This guide extracts the actionable parts of the architecture documents and adapts them for day-to-day implementation.

## 1) Target Outcome

Build a local-first coding agent where LM Studio serves Qwen models and the proxy bridge provides:

- OpenAI-compatible interfaces for clients.
- Strong tool calling and orchestration.
- Retrieval-grounded context for code tasks.
- Observable, debuggable inference behavior.

## 2) Baseline Model Topology

- `LLM`: Qwen3-4B (reasoning + tool planning).
- `Embedding`: Qwen3-Embedding-0.6B.
- `Reranker`: Qwen3-Reranker-0.6B.

For higher quality and larger VRAM:

- Upgrade embedding and reranker to 4B variants.

## 3) Context Engineering Pipeline (Coding)

Use a deterministic pipeline before calling chat completion:

1. Normalize input messages.
2. Extract coding intent (debug/refactor/explain/generate/test).
3. Build retrieval query from task + current file hints.
4. Retrieve candidate chunks (docs/code/tool outputs).
5. Rerank candidates.
6. Apply context budget policy (hard cap with stable truncation).
7. Compose final prompt block:
   - policy instructions
   - grounded context
   - user task
8. Call model and track usage + latency.

## 4) Tool-Calling Guardrails

- Pass tool schemas explicitly and preserve role semantics end-to-end.
- Require structured arguments (JSON) and validate before execution.
- Return tool outputs in bounded size; summarize large outputs.
- Record tool success/failure + duration for observability.
- Apply approval mode gates for risky operations.

## 5) Retrieval for Code Tasks

Prefer hybrid retrieval:

- Semantic recall from embeddings.
- Symbol-level precision from code-aware indexing (when available).
- Rerank with query-document scoring.

Use retrieval tiers by complexity:

- Simple ask: minimal retrieval.
- Multi-file ask: medium retrieval.
- Refactor/debug ask: high retrieval + rerank + tool outputs.

## 6) Webapp UX Requirements

For dashboard and chat pages, prioritize:

- Clear connection state for webapp/proxy/LM Studio.
- Active model and loaded models visibility.
- Inference quality metrics:
  - request latency
  - completion latency
  - tool-call success rate
  - fallback rate
- Error states with direct next actions (reconnect/load model/retry).

## 7) High-Impact Improvements Backlog

1. Replace heavy polling with websocket/event stream updates.
2. Add a compact "context used" panel (sources + token budget usage).
3. Add endpoint contract tests for chat/embeddings/rerank/orchestrate.
4. Add scenario tests for coding loops (tool call -> observation -> final answer).
5. Add fallback diagnostics when LM Studio is unavailable.

## 8) Operational Checklist

Before shipping:

- Run proxy tests (`bun test` in proxy bridge).
- Validate frontend build and type checks.
- Verify key endpoints manually:
  - `/api/proxy/v1/chat/completions`
  - `/api/proxy/v1/embeddings`
  - `/api/proxy/v1/rerank`
  - `/api/proxy/v1/agent/orchestrate`
- Validate dashboard behavior with proxy up/down transitions.
