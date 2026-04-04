# Proxy Bridge Control Space Documentation

This folder serves as the single source of truth for the project's documentation.

## Architecture

The project uses a **Python FastAPI + Vite React** architecture for high-performance LLM proxying and control.

```
Vite React Web (http://localhost:5173)
  -> Vite Dev Proxy -> Python FastAPI Proxy (http://localhost:3001)
  -> LM Studio (http://localhost:1234)
```

- **Webapp** (`http://localhost:5173`) - Vite React frontend dashboard
- **Proxy Bridge** (`http://localhost:3001`) - Python FastAPI runtime exposing OpenAI-compatible endpoints
- **LM Studio** (`http://localhost:1234`) - Local inference runtime for LLMs and embeddings

## Documentation Map

### Getting Started
| Document | Description |
|----------|-------------|
| [User Guide](./user_guide.md) | Step-by-step workflows for all features: scenarios, embeddings, context engineering, model management, presets, and more |
| [API Reference](./api_reference.md) | Complete API endpoint documentation with request/response schemas and examples |

### Configuration & Optimization
| Document | Description |
|----------|-------------|
| [Model Configuration Guide](./model_configuration_guide.md) | Model-specific recommendations, parameter tuning, scenario-based configs |
| [Model Capabilities](./model_capabilities.md) | Model capability matrix: chat, code, tools, embeddings support |
| [Scenario Presets](./scenario_presets.md) | Pre-configured scenario templates for common use cases |
| [Performance Tuning](./performance_tuning.md) | Hardware-specific optimizations, memory management, network tuning |

### Architecture & Testing
| Document | Description |
|----------|-------------|
| [Architecture](./architecture_consolidated.md) | Deep dive into system architecture, ReAct loop, connection pooling |
| [Testing Guide](./testing_guide.md) | CLI testing suite documentation, step-by-step test execution |

## Core API Surface

### OpenAI-Compatible Endpoints
- `POST /v1/chat/completions` - Chat completions with streaming and tool orchestration
- `POST /v1/completions` - Legacy completions endpoint
- `POST /v1/embeddings` - Embeddings with request coalescing and deduplication
- `GET /v1/models` - Lists available models natively from LM Studio

### Bridge Management Endpoints
- `GET /health` - Bridge and LM Studio connectivity check
- `GET /status` - Frontend-compatible system status
- `GET /api/status` - Full system status with hardware info
- `GET /api/v1/models/loaded` - List currently loaded models
- `POST /api/v1/models/load` - Load a model by ID
- `POST /api/v1/models/unload` - Unload a model by ID

### Feature Endpoints
- `POST /v1/agent/orchestrate` - Advanced agentic pipeline orchestrator
- `GET /api/hardware/profile` - System hardware profile
- `GET /api/presets/list` - List all presets
- `POST /api/retrieve/query` - Query knowledge base (RAG)
- `GET /api/observability/health` - Tool health cluster
- `GET /api/mcp/servers` - List MCP servers
- `GET /api/ace/agents` - List ACE agents

## Quick Links

- [Root README](../README.md) - Project overview and quick start
- [CLI Documentation](../proxy-bridge-python/cli/README.md) - CLI testing tool reference
- [CLI Testing Guide](../proxy-bridge-python/cli/TESTING.md) - Step-by-step testing instructions
- [Frontend Source](../frontend-vite/src/) - React components and stores
- [Backend Source](../proxy-bridge-python/app/) - FastAPI routers and adapters
