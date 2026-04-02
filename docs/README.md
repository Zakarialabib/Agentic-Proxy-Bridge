# Proxy Bridge Control Space Docs

This folder serves as the single source of truth for the project's documentation.

## Architecture

We have successfully migrated from a TypeScript (Bun/Next.js) stack to a high-performance **Python FastAPI + Vite React** architecture. This provides superior native asynchronous handling (`uvloop`) for heavy, concurrent LLM streaming and connection pooling.

- `webapp` (`http://localhost:3000`) -> Vite React frontend dashboard.
- `proxy bridge` (`http://localhost:3001`) -> Python FastAPI runtime exposing OpenAI-compatible endpoints.
- `LM Studio` (`http://localhost:1234`) -> Local inference runtime for LLMs and embeddings.

## Core API Surface

- `POST /v1/chat/completions` - Chat completions (intercepts Openclaw custom models & orchestrates tools)
- `POST /v1/embeddings` - Embeddings (with request coalescing & deduplication)
- `GET /v1/models` - Lists available models natively from LM Studio
- `POST /v1/agent/orchestrate` - Advanced agentic pipeline orchestrator

## How-to Guides & Workflows
- Read [user_guide.md](./user_guide.md) for a detailed walkthrough on setting up Agentic Scenarios, configuring Openclaw, and using the Control Space.
- Read [architecture_consolidated.md](./architecture_consolidated.md) for deep dives into the ReAct Tool Execution loop and Connection Pooling algorithms.

