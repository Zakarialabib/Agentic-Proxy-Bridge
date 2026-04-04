# Agentic Proxy Bridge Control Space

A powerful, high-performance middleware stack connecting your local LM Studio instance to an agentic "Control Space" featuring dynamic context engineering, embedding pipelines, tool orchestration, and hardware-adaptive presets.

## Architecture

```text
Vite React Web (http://localhost:5173)
  -> Vite Dev Proxy -> Python FastAPI Proxy (http://192.168.1.12:3001)
  -> LM Studio (http://192.168.1.12:1234)
```

### Stack
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Zustand + TanStack Query
- **Backend**: Python FastAPI with httpx async client
- **Database**: SQLite via Prisma (optional)

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

### 1. Configure the Backend
Create a `.env` file in `proxy-bridge-python/`:
```bash
LMSTUDIO_BASE_URL=http://192.168.1.12:1234
BRIDGE_HOST=0.0.0.0
BRIDGE_PORT=3001
DATABASE_URL=sqlite+aiosqlite:///../dev.db
```

### 2. Start the Python Proxy Backend
```bash
cd proxy-bridge-python
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Run the proxy on port 3001
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### 3. Start the Vite React Frontend
Open a new terminal window:
```bash
cd frontend-vite
npm install
npm run dev
```
Navigate to http://localhost:5173 to access the Control Space.

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
- GET /health - Bridge and LM Studio connectivity check
- GET /status - Frontend-compatible system status

### Models
- GET /v1/models - List all downloaded models
- GET /api/v1/models/loaded - List loaded models
- POST /api/v1/models/load - Load a model
- POST /api/v1/models/unload - Unload a model

### Chat
- POST /v1/chat/completions - OpenAI-compatible chat endpoint

### Observability
- GET /api/observability/health - Tool health cluster
- GET /api/observability/perfection - Perfection index
- GET /api/observability/alerts - Recent alerts

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
│   └── .env                # Environment config
└── docs/                   # Documentation
```
