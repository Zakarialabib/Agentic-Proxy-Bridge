# LMStudio Proxy Bridge - Ultimate Agentic Infrastructure

A comprehensive proxy bridge that transforms any LLM into a reasoning partner with Knowledge Graphs, MCP/A2A protocols, predictive pre-triggering, and stateful observability.

## 🏗️ Architecture

### Current State: Modular Orchestration (Migration Complete)
- **Frontend**: Next.js 16 with React Query hooks and adaptive polling
- **Backend**: Bun runtime with 5 modular orchestration services
- **Performance**: Buffer pooling, batched processing, memory monitoring
- **APIs**: RESTful endpoints with TypeScript contracts
- **Future**: Ready for Go migration when load exceeds Bun capacity

### Services Architecture
```
Frontend (React Query) → API Layer → Orchestration Services → LM Studio
                              ↓
                        Knowledge Graph
                              ↓
                     MCP/A2A Protocols
```

## Features

### Core Capabilities
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI endpoints
- **Dual-Mode Output**: Automatic detection between Agent and Chat modes
- **XML→JSON Translation**: Converts Qwen native tool calls to OpenAI format
- **Multi-Turn State Management**: Session-aware conversation handling

### Advanced Infrastructure
- **Knowledge Graph**: Transform documentation into navigable concept topology
- **MCP/A2A Protocol Support**: Bilingual proxy for tools and agents
- **Predictive Pre-triggering**: Pre-warm tools based on context analysis
- **Recursive Similarity Expansion**: Answer unasked follow-ups
- **A2A Async Messaging**: Non-blocking long-running tool execution

### Performance Optimizations (Phase 6-8)
- **Adaptive Polling**: Reduced API calls from 160/minute to intelligent caching
- **Buffer Pooling**: Memory-efficient streaming with object reuse
- **Batched Processing**: 2-3x performance improvement for embeddings
- **Memory Monitoring**: Pressure-aware resource management
- **Streaming Latency**: P99 latency optimization with backpressure (Phase 8)
- **Connection Pooling**: Prevents LM Studio crashes under concurrent load (Phase 8)
- **Request Coalescing**: 50-70% reduction in duplicate requests (Phase 8)

### Stability & Reliability (Phase 8)
- **Connection Pool**: Manages concurrent requests to LM Studio with queueing
- **Streaming Optimizer**: Chunked streaming with backpressure handling
- **Embedding Coalescer**: Deduplicates and batches embedding requests
- **Auto-Retry Logic**: Exponential backoff for transient failures
- **Health Monitoring**: Real-time connection and batch statistics

### Observability
- **Three-Time Horizon**: NOW/RECENT/DEEP temporal analysis
- **Adaptive VRAM Modes**: Generous → Stingy → Emergency transitions
- **Confidence Cascade**: Raw → Inferred → Predicted → Validated
- **Living Presets**: Evolution with lineage tracking
- **Session Narrative**: Five-act story structure
- **Failure Learning**: Automatic pattern extraction

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime
- [LM Studio](https://lmstudio.ai) (optional, for local LLM)
- Node.js 18+ for Next.js frontend

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd lmstudio-proxy-bridge

# Install dependencies
npm install

# Start LM Studio (optional, for local models)
# Download models via LM Studio UI

# Start proxy bridge (port 3001)
cd mini-services/proxy-bridge
bun run dev

# In another terminal, start frontend (port 3000)
npm run dev
```

### Development

```bash
# Frontend development
npm run dev                    # Next.js dev server on :3000

# Backend development
cd mini-services/proxy-bridge
bun run dev                    # Proxy bridge on :3001

# Database operations
npm run db:generate           # Generate Prisma client
npm run db:push              # Push schema changes
npm run db:migrate           # Run migrations

# Build for production
npm run build                # Build Next.js for production
```

## API Endpoints

### Orchestration
- `POST /v1/agent/orchestrate` - Unified orchestration endpoint
- `POST /v1/chat/completions` - OpenAI-compatible chat completions
- `POST /v1/embeddings` - Embedding generation with batching

### Status & Monitoring
- `GET /api/proxy/status` - System status and health
- `GET /api/proxy/metrics` - Performance metrics
- `GET /api/proxy/cache/stats` - Cache statistics

### Knowledge Graph
- `GET /api/proxy/knowledge` - Query knowledge graph
- `POST /api/proxy/knowledge/index` - Index documents

### MCP/A2A Protocols
- `GET /api/proxy/mcp/servers` - MCP server status
- `GET /api/proxy/a2a/agents` - A2A agent status
- `POST /api/proxy/tools` - Tool execution

## Migration Status

✅ **Phase 1**: Mock Data → Real API Integration  
✅ **Phase 2**: Smart Polling & Caching  
✅ **Phase 3**: API Layer Refactor  
✅ **Phase 4**: Orchestration Services Extraction  
✅ **Phase 5**: Runtime Quality & Performance  
✅ **Phase 6**: Performance Optimizations  
✅ **Phase 7**: Go Migration Preparation  
🚀 **Phase 8**: Streaming & LM Studio Stability (In Progress)

## Phase 8: Stability & Streaming Enhancements

Three new services address critical production issues:

### 1. Streaming Latency Optimizer
- **P99 Latency**: -40% improvement through chunked streaming
- **Backpressure Handling**: Prevents memory spikes
- **Priority Queue**: Immediate/normal/low priority chunks
- See [PHASE_8_INTEGRATION.md](docs/PHASE_8_INTEGRATION.md)

### 2. LM Studio Connection Pool
- **Concurrent Requests**: Queue management with priority ordering
- **Auto-Retry**: Exponential backoff for transient failures
- **Prevents Crashes**: Protects LM Studio from overload
- Configuration: 5-10 max connections, tunable queue size

### 3. Embedding Request Coalescer
- **50-70% Reduction**: Batches duplicate requests
- **Deduplication**: Hash-based request tracking
- **Batch Timestep**: Configurable timeout for optimal throughput
- Batches up to 128 texts per request

For implementation details, see [PHASE_8_INTEGRATION.md](docs/PHASE_8_INTEGRATION.md)  

## Performance Improvements

- **API Efficiency**: 160 calls/minute → Adaptive polling with caching
- **Memory Usage**: Buffer pooling prevents GC pressure
- **Processing Speed**: Batched embeddings (2-3x faster)
- **Scalability**: Modular services ready for Go migration

## Future Roadmap

- **Go Migration**: Port orchestration services to Go for high concurrency
- **Distributed Caching**: Redis integration for multi-instance deployments
- **Advanced Observability**: Prometheus/Grafana integration
- **Plugin System**: Extensible architecture for custom tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

### Core Capabilities
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI endpoints
- **Dual-Mode Output**: Automatic detection between Agent and Chat modes
- **XML→JSON Translation**: Converts Qwen native tool calls to OpenAI format
- **Multi-Turn State Management**: Session-aware conversation handling

### Advanced Infrastructure
- **Knowledge Graph**: Transform documentation into navigable concept topology
- **MCP/A2A Protocol Support**: Bilingual proxy for tools and agents
- **Predictive Pre-triggering**: Pre-warm tools based on context analysis
- **Recursive Similarity Expansion**: Answer unasked follow-ups
- **A2A Async Messaging**: Non-blocking long-running tool execution

### Observability
- **Three-Time Horizon**: NOW/RECENT/DEEP temporal analysis
- **Adaptive VRAM Modes**: Generous → Stingy → Emergency transitions
- **Confidence Cascade**: Raw → Inferred → Predicted → Validated
- **Living Presets**: Evolution with lineage tracking
- **Session Narrative**: Five-act story structure
- **Failure Learning**: Automatic pattern extraction

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime
- [LM Studio](https://lmstudio.ai) (optional, for local LLM)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd my-project

# Run setup script
chmod +x setup.sh
./setup.sh

# Start proxy bridge
cd mini-services/proxy-bridge
bun run index.ts

# In another terminal, start frontend
bun run dev
```

### Access Points
- **Frontend Dashboard**: http://localhost:3000
- **Proxy Bridge API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Directory Structure

```
my-project/
├── db/                    # SQLite databases
│   ├── knowledge.db       # Knowledge graph storage
│   ├── memory.db          # Session memory
│   ├── observability.db   # Metrics & patterns
│   └── settings.db        # Configuration
├── downloads/             # Downloaded files
├── logs/                  # Application logs
├── models/                # Model files
├── cache/                 # Embedding cache
├── config/                # Configuration files
├── backups/               # Backup storage
└── mini-services/
    └── proxy-bridge/      # Main proxy service
        ├── index.ts       # Main entry point
        ├── observability.ts
        ├── settings.ts
        └── settings-handlers.ts
```

## Documentation Convention

- Store all project documentation in `docs/`.
- Do not create `documentation/` or `upload/`; both were consolidated into `docs/`.

## API Endpoints

### OpenAI-Compatible
- `POST /v1/chat/completions` - Chat completions
- `POST /v1/embeddings` - Generate embeddings
- `GET /v1/models` - List available models
- `POST /v1/models/load` - Load a model
- `POST /v1/models/unload` - Unload current model

### Settings Management
- `GET /api/proxy/settings` - Get all settings
- `POST /api/proxy/settings` - Update settings
- `GET /api/proxy/settings/presets` - List model presets
- `POST /api/proxy/settings/presets` - Create preset
- `GET /api/proxy/settings/export` - Export settings as JSON
- `POST /api/proxy/settings/import` - Import settings

### Observability
- `GET /api/proxy/observability/health` - System health
- `GET /api/proxy/observability/horizon` - Three-time horizon
- `GET /api/proxy/observability/vram` - VRAM personality
- `GET /api/proxy/observability/confidence` - Confidence cascade
- `GET /api/proxy/observability/failures` - Failure records

### Knowledge & Protocols
- `GET /api/proxy/knowledge` - Query knowledge graph
- `POST /api/proxy/knowledge/index` - Index documentation
- `GET /api/proxy/mcp/servers` - List MCP servers
- `GET /api/proxy/a2a/agents` - List A2A agents

## Configuration

### Model Presets

Default presets included:
1. **Code Generation** - Low temperature (0.2), for code tasks
2. **Creative Writing** - High temperature (0.8), for creative tasks
3. **Analysis & Reasoning** - Medium temperature (0.3), for analysis
4. **Quick Chat** - Smaller model, fast responses
5. **Long Context** - Extended context window

### VRAM Settings

```json
{
  "budget_mb": 8192,
  "warning_threshold_percent": 75,
  "critical_threshold_percent": 90,
  "auto_evict_enabled": true,
  "pre_warm_enabled": true
}
```

### LM Studio Connection

```json
{
  "host": "localhost",
  "port": 1234,
  "auto_connect": true,
  "retry_interval_ms": 5000,
  "timeout_ms": 30000
}
```

## Embedding Presets

| Preset | Dimension | Reranker | Use Case |
|--------|-----------|----------|----------|
| Code Search | 512d | Cascade | Find code implementations |
| Doc Search | 512d | Fast | Documentation QA |
| Bug Search | 512d | Deep | Error pattern matching |
| Test Search | 512d | Fast | Test case discovery |
| Refactor Target | 1024d | Deep | Code improvement |
| Semantic Diff | 1024d | Deep | Compare texts |
| Clustering | 512d | Fast | Document grouping |
| Anomaly | 1024d | Deep | Outlier detection |

## Settings UI

The frontend dashboard includes a **Settings** tab for:
- LM Studio connection configuration
- Model preset management
- VRAM budget settings
- Import/Export configuration
- Reset to defaults

## Development

### Run in Development
```bash
# Terminal 1: Proxy bridge
cd mini-services/proxy-bridge && bun run index.ts

# Terminal 2: Frontend with hot reload
bun run dev
```

### Build for Production
```bash
bun run build
```

## Troubleshooting

### Database Lock
```bash
# Remove lock files
rm -f db/*.db-journal
rm -f db/*.db-wal
```

### Reset Settings
```bash
curl -X POST http://localhost:3001/api/proxy/settings/reset
```

## License

MIT
