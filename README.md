# LMStudio Proxy Bridge

Next.js dashboard + Bun proxy bridge for LM Studio (OpenAI-compatible API), with observability, presets, and protocol integrations (MCP/A2A).

## Architecture

Primary dev stack:

```
Next.js Web (http://localhost:3000)
  → Next route handler /api/proxy/[...path]
  → Bun Proxy Bridge (http://localhost:3001)
  → LM Studio (http://localhost:1234)
```

This repo also contains an experimental Vite frontend under `frontend-vite/` (defaults to http://localhost:5173).

## Quick Start

### Prerequisites
- Node.js 18+
- Bun
- LM Studio running with at least one model loaded (default port 1234)

### Install
```bash
npm install
```

### Run (development)
```bash
# Terminal 1: Proxy bridge (port 3001)
cd mini-services/proxy-bridge
bun run dev

# Terminal 2: Next.js web (port 3000, auto-fallback to 3002 if busy)
cd ../..
npm run dev
```

### Build (production)
```bash
npm run build
```

## Benchmarks and Tests

```bash
# Proxy bridge unit/integration tests
cd mini-services/proxy-bridge
bun test

# Benchmark endpoints (from any shell)
curl http://localhost:3001/api/proxy/benchmark/pool
curl http://localhost:3001/api/proxy/benchmark/embeddings?iterations=10
```

## Troubleshooting

### `EADDRINUSE: :::3000` when running `npm run dev`
- Another process is already listening on port 3000 (commonly another Next/Vite dev server).
- This project’s `npm run dev` tries port 3000 first and falls back to 3002 automatically.
- To force a specific port:
  - `npx next dev -p 3000`

## API Endpoints

### Orchestration
- `POST /v1/agent/orchestrate`
- `POST /v1/chat/completions`
- `POST /v1/embeddings`

### Status and Monitoring
- `GET /api/proxy/status`
- `GET /api/proxy/metrics`
- `GET /api/proxy/cache/stats`

### Models
- `GET /api/proxy/models/available` (metadata-rich model list for the dashboard)
- `GET /v1/models` (OpenAI-compatible model list)

### Knowledge and Protocols
- `GET /api/proxy/knowledge`
- `POST /api/proxy/knowledge/index`
- `GET /api/proxy/mcp/servers`
- `GET /api/proxy/a2a/agents`

## License

MIT
