# API Reference

Complete documentation for all Proxy Bridge endpoints.

## Base URLs

| Service | URL |
|---------|-----|
| Proxy Bridge | `http://localhost:3001` |
| LM Studio | `http://localhost:1234` |

---

## Health & Status

### GET /health

Check bridge and LM Studio connectivity.

**Response** `200 OK`:
```json
{
  "status": "ok",
  "bridge": "running",
  "lmstudio": "connected"
}
```

**Example**:
```bash
curl http://localhost:3001/health
```

### GET /status

Frontend-compatible system status.

**Response** `200 OK`:
```json
{
  "bridge": "running",
  "lmstudio": "connected",
  "models_loaded": 1,
  "hardware": {
    "cpu_cores": 8,
    "ram_gb": 16.0,
    "gpu": "NVIDIA Quadro M4000"
  }
}
```

### GET /api/status

Full system status with hardware details.

**Response** `200 OK`:
```json
{
  "bridge": "running",
  "lmstudio": "connected",
  "models_loaded": 1,
  "hardware": {
    "platform": "windows",
    "cpu_cores": 8,
    "ram_gb": 15.92,
    "gpu": "NVIDIA Quadro M4000",
    "vram_gb": 8.0
  },
  "presets_count": 5
}
```

---

## Models

### GET /v1/models

List all available models from LM Studio (proxied).

**Response** `200 OK`:
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3.5-4b",
      "object": "model",
      "created": 1234567890,
      "owned_by": "lmstudio"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3001/v1/models
```

### GET /api/v1/models/loaded

List currently loaded models.

**Response** `200 OK`:
```json
{
  "models": [
    {
      "id": "qwen3.5-4b",
      "name": "Qwen3.5 4B",
      "state": "loaded"
    }
  ]
}
```

### POST /api/v1/models/load

Load a model into memory.

**Request**:
```json
{
  "model": "qwen3.5-4b"
}
```

**Response** `200 OK`:
```json
{
  "status": "loaded",
  "model": "qwen3.5-4b"
}
```

### POST /api/v1/models/unload

Unload a model from memory.

**Request**:
```json
{
  "model": "qwen3.5-4b"
}
```

**Response** `200 OK`:
```json
{
  "status": "unloaded",
  "model": "qwen3.5-4b"
}
```

---

## Chat & Completions

### POST /v1/chat/completions

OpenAI-compatible chat completions endpoint. Supports streaming.

**Request**:
```json
{
  "model": "qwen3.5-4b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 0.9
}
```

**Response** `200 OK` (non-streaming):
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "qwen3.5-4b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

**Streaming Response** (SSE):
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"},"index":0}]}

data: [DONE]
```

**Example**:
```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-4b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'
```

**Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | string | required | Model ID to use |
| messages | array | required | Array of message objects |
| stream | boolean | false | Enable streaming |
| temperature | float | 0.7 | Sampling temperature (0.0-2.0) |
| max_tokens | int | -1 | Maximum tokens to generate |
| top_p | float | 1.0 | Nucleus sampling threshold |
| contextWindow | int | 4096 | Context window size |
| thinking | boolean | false | Enable thinking mode (extracts <thought> tags) |
| require_approval | boolean | false | Pause for user confirmation before tool execution |

### POST /v1/completions

Legacy completions endpoint.

**Request**:
```json
{
  "model": "qwen3.5-4b",
  "prompt": "Once upon a time",
  "max_tokens": 100
}
```

---

## Embeddings

### POST /v1/embeddings

Generate embeddings with request coalescing.

**Request**:
```json
{
  "model": "nomic-embed-text",
  "input": "Hello world"
}
```

**Response** `200 OK`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.1, 0.2, ...]
    }
  ],
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "input": "Hello world"}'
```

---

## Hardware

### GET /api/hardware/profile

Get system hardware profile.

**Response** `200 OK`:
```json
{
  "platform": "windows",
  "cpu_cores": 8,
  "system_ram_gb": 15.92,
  "gpu_name": "NVIDIA Quadro M4000",
  "gpu_vram_gb": null,
  "apple_silicon": false
}
```

### GET /api/hardware/memory

Get memory usage information.

**Response** `200 OK`:
```json
{
  "total_gb": 15.92,
  "available_gb": 8.5,
  "used_gb": 7.42,
  "percent": 46.6
}
```

### GET /api/hardware/cpu

Get CPU information and usage.

**Response** `200 OK`:
```json
{
  "cores_logical": 8,
  "cores_physical": 4,
  "frequency_mhz": 3200.0,
  "percent": 25.5
}
```

---

## Presets

### GET /api/presets/list

List all presets.

**Response** `200 OK`:
```json
[
  {
    "id": "preset_1234567890",
    "name": "Code Assistant",
    "model_id": "qwen3.5-4b",
    "params": {"temperature": 0.2, "max_tokens": 4096},
    "system_prompt": "You are an expert programmer...",
    "description": "Optimized for coding tasks",
    "created_at": 1234567890.0,
    "updated_at": 1234567890.0
  }
]
```

### POST /api/presets/create

Create a new preset.

**Request**:
```json
{
  "name": "My Preset",
  "model_id": "qwen3.5-4b",
  "params": {"temperature": 0.7},
  "system_prompt": "You are helpful...",
  "description": "Custom preset"
}
```

### PUT /api/presets/update/{preset_id}

Update an existing preset.

### DELETE /api/presets/delete/{preset_id}

Delete a preset.

### POST /api/presets/generate

AI-generate optimal preset based on hardware.

---

## Retrieval & RAG

### POST /api/retrieve/query

Query the knowledge base.

**Request**:
```json
{
  "query": "What is the architecture?",
  "top_k": 5,
  "min_score": 0.7,
  "method": "dense"
}
```

**Response** `200 OK`:
```json
{
  "query": "What is the architecture?",
  "results": [...],
  "total_time_ms": 45.2,
  "method": "dense"
}
```

### POST /api/retrieve/rerank

Rerank documents.

**Request**:
```json
{
  "query": "architecture",
  "documents": ["doc1", "doc2", "doc3"],
  "top_k": 2
}
```

### GET /api/retrieve/stats

Get retrieval statistics.

---

## Observability

### GET /api/observability/health

Get tool health.

**Response** `200 OK`:
```json
{
  "overall": "healthy",
  "components": [
    {"name": "proxy", "status": "healthy", "latency_ms": 0.0, "last_check": 1234567890.0},
    {"name": "lmstudio", "status": "healthy", "latency_ms": 0.0, "last_check": 1234567890.0}
  ],
  "uptime_seconds": 3600.0,
  "version": "1.0.0"
}
```

### GET /api/observability/perfection

Get perfection index.

### GET /api/observability/alerts

Get recent alerts.

**Query Parameters**:
- `limit` (int, default: 50): Number of alerts to return

### GET /api/observability/tool-metrics

Get tool execution metrics.

### GET /api/observability/circuit-breakers

Get circuit breaker status.

### GET /api/observability/resilience

Get resilience mode configuration.

### GET /api/observability/prewarming

Get prewarming status.

### GET /api/observability/vram

Get VRAM usage.

---

## MCP (Model Context Protocol)

### GET /api/mcp/servers

List MCP servers.

**Response** `200 OK`:
```json
{
  "servers": [],
  "total": 0,
  "healthy": 0
}
```

### GET /api/mcp/servers/{server_id}

Get MCP server details.

### GET /api/mcp/tools

List MCP tools.

---

## ACE (Agent Communication Engine)

### GET /api/ace/agents

List ACE agents.

**Response** `200 OK`:
```json
{
  "agents": [],
  "total": 0,
  "available": 0
}
```

### GET /api/ace/sessions

List ACE sessions.

### GET /api/ace/channels

List ACE channels.

---

## Agent Orchestration

### POST /v1/agent/orchestrate

Advanced agentic pipeline orchestrator.

**Request**:
```json
{
  "model": "qwen3.5-4b",
  "messages": [{"role": "user", "content": "Analyze this codebase"}],
  "stream": true,
  "orchestration_mode": "adaptive",
  "context_strategy": "prune",
  "max_steps": 8,
  "tool_budget": 4
}
```

**Notes**:
- If `context_strategy`, `max_steps`, or `tool_budget` are omitted, the proxy may apply trigger-based defaults.
- **`require_approval`**: If set to `true`, the orchestrator will yield an `ask_user_question` telemetry event and pause until the user sends a confirmation.
- **Telemetry Stream**: Standard streaming responses include interleaved `telemetry` objects:
    - `breadcrumb`: Concise reasoning recap for VRAM efficiency.
    - `rollback`: Conversation state rewind after a malformed tool call.
    - `compression`: Context window pruning notification.
    - `hop`: Current agentic iteration and budget remaining.
    - `mode_switch`: Cognitive strategy escalation (e.g., to a larger model).
- **vLLM Impact**: When `ACTIVE_BACKEND` is `vllm`, throughput for these multi-hop calls is increased by ~3-4x.

### POST /v1/agent/trigger-preview

Preview trigger matching and orchestration treatment without executing a model call.

**Request**:
```json
{
  "message": "Refactor src/app.tsx and update tests"
}
```

**Response** `200 OK`:
```json
{
  "trigger_profile": {
    "triggered": true,
    "intent": ["code_edit", "multi_step"],
    "recommended_actions": {
      "orchestration_mode": "adaptive",
      "context_strategy": "prune",
      "max_steps": 8,
      "tool_budget": 4
    }
  },
  "resolved": {
    "orchestration_mode": "adaptive",
    "context_strategy": "prune",
    "max_steps": 8,
    "tool_budget": 4
  }
}
```

---

## Worklog

### GET /api/worklog

List worklog entries.

**Query Parameters**:
- `limit` (int, default: 50): Number of entries
- `status` (string, optional): Filter by status

**Response** `200 OK`:
```json
{
  "entries": [
    {
      "id": "1",
      "taskName": "Code Analysis",
      "description": "Analyzed repository structure",
      "status": "completed",
      "agent": "code_analyst",
      "stage": "analysis",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/worklog

Create worklog entry.

**Request**:
```json
{
  "taskName": "Task Name",
  "description": "Task description",
  "status": "running",
  "agent": "agent_name",
  "stage": "stage_name"
}
```

---

## Error Responses

All endpoints may return the following error codes:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Bridge error |
| 502 | Bad Gateway - LM Studio unreachable |
| 503 | Service Unavailable - LM Studio not ready |

**Error Response Format**:
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## OpenAI Compatibility Matrix

| OpenAI Endpoint | Supported | Notes |
|-----------------|-----------|-------|
| `/v1/models` | Yes | Proxied to LM Studio |
| `/v1/chat/completions` | Yes | Full support with streaming |
| `/v1/completions` | Yes | Legacy support |
| `/v1/embeddings` | Yes | With coalescing |
| `/v1/audio/transcriptions` | No | Not supported by LM Studio |
| `/v1/images/generations` | No | Not supported by LM Studio |
| `/v1/moderations` | No | Not implemented |
