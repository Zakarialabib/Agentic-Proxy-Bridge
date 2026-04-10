# Agentic Proxy Bridge Control Space

A powerful, high-performance middleware stack connecting your local LM Studio instance to an agentic "Control Space" featuring dynamic context engineering, embedding pipelines, tool orchestration, and hardware-adaptive presets.

## Architecture

```text
Vite React Web (http://localhost:5173)
  -> Vite Dev Proxy -> Python FastAPI Proxy (http://localhost:3001)
  -> LM Studio (http://localhost:1234)
```

### Stack
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Zustand + TanStack Query
- **Backend**: Python FastAPI with httpx async client
- **Database**: SQLite via SQLModel

### Why Python + FastAPI?
- **Native Async & uvloop**: 2-4x faster than standard event loops, crucial for handling high-throughput SSE (Server-Sent Events) from LLMs.
- **Hierarchical Connection Pooling**: httpx.AsyncClient manages concurrent requests efficiently.
- **Embedding Coalescer**: Native asyncio.Lock and Future batching deduplicates and coalesces identical text embeddings, drastically reducing GPU load.

---

## Features & Workflows

The web dashboard is split into focused panels designed to give you absolute control over how prompts and data flow into your local LLMs.

### 1. Dashboard
System overview with connection status, VRAM budget, active models, and hardware metrics.

### 2. Control Space (Chat Interface)
A deeply customizable chat interface with real-time streaming, model selection, and parameter tuning.
- **Model Selection**: Select and load/unload models directly from the sidebar
- **Agentic Scenarios**: One-click UI cards that reconfigure the model's System Prompt, compute parameters, and available Tools.
- **Context Window Management**: The Python proxy automatically enforces a sliding context window by evicting oldest messages while preserving your System Prompt.

### 3. Prompt & Embedding Analyzer (Gateway)
Test how the proxy interprets and transforms your queries before they hit the LLM.
- **Intent Routing**: View confidence scores as the proxy classifies your raw input.
- **MRL (Matryoshka Representation Learning)**: Select embedding dimensionalities dynamically.
- **Preset Management**: Create, edit, apply, and delete model presets with AI generation.
- **Hardware Profile**: System hardware analysis and model recommendations.

### 4. Context Base (Knowledge)
Feed the proxy's active knowledge topology for Retrieval-Augmented Generation (RAG).
- Ingest raw text, markdown, or code files directly into the vectorized database.
- Explore existing concepts, entities, and relationships stored in the proxy.

### 5. Agent Skills (Tool Registry)
View the live status of the Python proxy's built-in tool execution layer.
- Includes file_list, file_read, web_search, and query_knowledge_graph.
- When an Agentic Scenario is active, the FastAPI backend intercepts tool call chunks from the LLM stream, pauses generation, executes the python tool, and seamlessly re-prompts the model with the result.

### 6. Protocols (MCP & A2A)
Manage external tool servers and agent-to-agent communication.
- **MCP Servers**: View connected Model Context Protocol servers and their tools.
- **A2A Agents**: Monitor agent-to-agent communication channels.

### ⚡ Superpowers (Agentic Engine)
The Proxy Bridge features an "Evolutionary Architecture" that unlocks advanced agentic capabilities:
- **Autonomous Tool Discovery**: Instantly scans your local hardware and software to register available tools.
- **Hardware-Aware Orchestration**: Automatically tunes KV cache and GPU offloading based on your specific VRAM budget.
- **Rich Interactive Artifacts**: Generates structured, interactive UI components directly in the chat stream.
- **NeMo Guardrail Integration**: Validates model output using distilled reasoning buffers.

### 7. Observability
Deep system analytics, tool health monitoring, and performance optimization.
- **Tool Health**: Real-time monitoring of tool execution success rates and latency.
- **Perfection Index**: Quality metrics for each tool's performance over time.
- **Prewarming**: Model warm-start optimization for faster first-token times.
- **VRAM Management**: Memory fragmentation analysis and grooming.
- **Resilience**: Fallback orchestration and circuit breaker monitoring.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- LM Studio running locally with at least one model downloaded

### 1. Start LM Studio

Open LM Studio and start the local server on port 1234. Load a model you want to test.

### 2. Configure the Backend
Create a `.env` file in `proxy-bridge-python/`:
```bash
LMSTUDIO_BASE_URL=http://localhost:1234
BRIDGE_HOST=0.0.0.0
BRIDGE_PORT=3001
DATABASE_URL=sqlite+aiosqlite:///../dev.db
```

### 3. Start the Python Proxy Backend
**Recommended (Interactive Mode):**
```bash
cd proxy-bridge-python
python -m cli.main proxy
```
This launches a beautiful, interactive TUI that handles backend selection (LM Studio vs vLLM), automatic model scanning from your cache, and unified subprocess management.

**Manual Mode:**
```bash
cd proxy-bridge-python
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### 4. Start the Vite React Frontend
Open a new terminal window:
```bash
cd frontend-vite
npm install
npm run dev
```
Navigate to http://localhost:5173 to access the Control Space.

---

## CLI Testing Tool

The project includes a comprehensive CLI for testing LMStudio, the proxy bridge, and the full stack.

### Setup

```bash
cd proxy-bridge-python
pip install -e .
```

### Quick Commands

```bash
# Interactive TUI (model selection, 14 test options)
lmstudio-test simple -i

# Simple API tests (health, models, compatibility)
lmstudio-test simple

# Medium: context window, system prompts, few-shot
lmstudio-test medium --model qwen3.5-4b

# Complex: hardware detection, presets, spend tracking
lmstudio-test complex --model qwen3.5-4b

# Auto-generate optimal presets based on your hardware
lmstudio-test preset

# AI git workflow (commit message, review, PR description)
lmstudio-test git-workflow --model qwen3.5-4b

# Test specific targets
lmstudio-test run-tests --target proxy
lmstudio-test run-tests --target frontend
lmstudio-test run-tests --target full

# Compare and export results
lmstudio-test compare <run-id-1> <run-id-2>
lmstudio-test export --format csv -o results.csv
lmstudio-test history
```

### Full CLI Documentation

See [cli/README.md](proxy-bridge-python/cli/README.md) for complete command reference, test tiers, and result management.
See [cli/TESTING.md](proxy-bridge-python/cli/TESTING.md) for step-by-step testing guide.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| LMSTUDIO_BASE_URL | LM Studio API URL | http://localhost:1234 |
| BRIDGE_HOST | Proxy bind address | 0.0.0.0 |
| BRIDGE_PORT | Proxy port | 3001 |
| DATABASE_URL | Database connection string | sqlite+aiosqlite:///../dev.db |

### Frontend Settings
All frontend settings (LM Studio host, port, theme, polling) are persisted in localStorage and can be configured via the Settings dialog in the UI.

---

## API Endpoints

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Bridge and LM Studio connectivity check |
| GET | `/status` | Frontend-compatible system status |
| GET | `/api/status` | Full system status with hardware info |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/models` | List all downloaded models (proxied to LM Studio) |
| GET | `/api/v1/models/loaded` | List currently loaded models |
| POST | `/api/v1/models/load` | Load a model by ID |
| POST | `/api/v1/models/unload` | Unload a model by ID |

### Chat & Completions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat/completions` | OpenAI-compatible chat endpoint (streaming supported) |
| POST | `/v1/completions` | Legacy completions endpoint |

### Embeddings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/embeddings` | Generate embeddings with coalescing |

### Hardware
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hardware/profile` | System hardware profile |
| GET | `/api/hardware/memory` | Memory usage information |
| GET | `/api/hardware/cpu` | CPU information and usage |

### Presets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/presets/list` | List all presets |
| POST | `/api/presets/create` | Create a new preset |
| PUT | `/api/presets/update/{id}` | Update an existing preset |
| DELETE | `/api/presets/delete/{id}` | Delete a preset |
| POST | `/api/presets/generate` | AI-generate optimal preset |

### Retrieval & RAG
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/retrieve/query` | Query knowledge base |
| POST | `/api/retrieve/rerank` | Rerank documents |
| GET | `/api/retrieve/stats` | Retrieval statistics |

### Observability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/observability/health` | Tool health cluster |
| GET | `/api/observability/perfection` | Perfection index |
| GET | `/api/observability/alerts` | Recent alerts |
| GET | `/api/observability/tool-metrics` | Tool execution metrics |
| GET | `/api/observability/circuit-breakers` | Circuit breaker status |
| GET | `/api/observability/resilience` | Resilience mode status |
| GET | `/api/observability/prewarming` | Prewarming status |
| GET | `/api/observability/vram` | VRAM usage |

### MCP (Model Context Protocol)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/servers` | List MCP servers |
| GET | `/api/mcp/servers/{id}` | Get MCP server details |
| GET | `/api/mcp/tools` | List MCP tools |

### ACE (Agent Communication Engine)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ace/agents` | List ACE agents |
| GET | `/api/ace/sessions` | List ACE sessions |
| GET | `/api/ace/channels` | List ACE channels |

### Agent Orchestration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/agent/orchestrate` | Advanced agentic pipeline orchestrator |

### Worklog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worklog` | List worklog entries |
| POST | `/api/worklog` | Create worklog entry |

---

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [User Guide](docs/user_guide.md) | Step-by-step workflows for all features |
| [API Reference](docs/api_reference.md) | Complete API endpoint documentation |
| [Model Configuration Guide](docs/model_configuration_guide.md) | Model-specific recommendations |
| [Testing Guide](docs/testing_guide.md) | CLI testing suite documentation |
| [Architecture](docs/architecture_consolidated.md) | Deep dive into system architecture |
| [Model Capabilities](docs/model_capabilities.md) | Model capability matrix |
| [Scenario Presets](docs/scenario_presets.md) | Pre-configured scenario templates |
| [Performance Tuning](docs/performance_tuning.md) | Optimization recommendations |

---

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Reinstall dependencies
cd proxy-bridge-python
pip install -r requirements.txt
pip install -e .
```

**Frontend import errors:**
```bash
# Clear Vite cache
cd frontend-vite
rm -rf node_modules/.vite
npm run dev
```

**LM Studio connection failed:**
- Ensure LM Studio server is running on port 1234
- Check `LMSTUDIO_BASE_URL` in `.env` matches your LM Studio server
- Verify a model is loaded in LM Studio

**CLI tests fail:**
```bash
# Ensure backend is running first
uvicorn app.main:app --host 0.0.0.0 --port 3001

# Run simple tests
lmstudio-test simple

# Check test history
lmstudio-test history
```

---

## Project Structure

```
lmstudio/
├── frontend-vite/          # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── features/   # Panel components
│   │   │   ├── layout/     # Layout components
│   │   │   └── ui/         # shadcn/ui primitives
│   │   ├── hooks/          # TanStack Query hooks
│   │   ├── lib/            # API utilities, types
│   │   └── stores/         # Zustand stores
│   └── vite.config.ts      # Vite config with proxy
├── proxy-bridge-python/    # FastAPI backend
│   ├── app/
│   │   ├── adapters/       # LM Studio adapter
│   │   ├── core/           # Settings, database
│   │   ├── routers/        # API route handlers
│   │   └── observability/  # Monitoring & analytics
│   ├── cli/                # CLI testing tool
│   │   ├── tests/          # Test suites (simple, medium, complex)
│   │   ├── runners/        # Test runners
│   │   ├── results/        # Test result storage
│   │   └── tui/            # Terminal UI components
│   ├── presets/            # Model preset configurations
│   └── .env                # Environment config
└── docs/                   # Documentation
```
