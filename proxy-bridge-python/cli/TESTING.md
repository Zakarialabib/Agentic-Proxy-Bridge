# CLI Testing Guide

Complete reference for testing LMStudio Proxy Bridge, model capabilities, and full-stack integration.

## Quick Start

```bash
# Install CLI
cd proxy-bridge-python
pip install -e .

# Run all simple tests
lmstudio-test simple --base-url http://localhost:3001

# Run medium tests with a specific model
lmstudio-test medium --base-url http://localhost:3001 --model qwen2.5-7b

# Run complex hardware-aware benchmarks
lmstudio-test complex --base-url http://localhost:3001 --model llama-3.1-8b

# View test history
lmstudio-test history

# Export results
lmstudio-test export --format json --output results.json
```

## Test Categories

### Tier 1: Simple Tests (No Model Required)

Tests basic connectivity and API compliance. Run these first to verify the bridge is working.

| Command | What It Tests | Duration |
|---------|--------------|----------|
| `lmstudio-test simple` | Health, models, hardware detection | ~5s |
| `lmstudio-test simple --model <name>` | + Chat completions (streaming + non-streaming) | ~15s |

**Endpoints Tested:**
- `GET /health` - Bridge and LMStudio connectivity
- `GET /api/status` - System status and hardware info
- `GET /v1/models` - OpenAI-compatible model listing
- `POST /v1/chat/completions` - Chat (when --model provided)

**Expected Output:**
```
Test Summary (Run: abc12345)
┏━━━━━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Test             ┃ Status ┃ Details                    ┃
┡━━━━━━━━━━━━━━━━━━╇━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ health           │ PASS   │ Health=ok, Models=3, GPU=  │
│ system_status    │ PASS   │ Status=ok, Uptime=120s     │
│ models           │ PASS   │ Count=3                    │
│ hardware         │ PASS   │ GPU=Unknown, RAM=16GB      │
└──────────────────┴────────┴────────────────────────────┘
```

### Tier 2: Medium Tests (Model Required)

Tests prompt engineering, context handling, and parameter sensitivity.

| Command | What It Tests | Duration |
|---------|--------------|----------|
| `lmstudio-test medium --model <name>` | Context window, system prompts, few-shot | ~30s |

**Tests Included:**
- **Context Window**: Tests how much context the model can handle
- **System Prompts**: Tests system prompt adherence
- **Few-Shot**: Tests in-context learning capability

### Tier 3: Complex Tests (Model Required)

Hardware-aware benchmarks and performance profiling.

| Command | What It Tests | Duration |
|---------|--------------|----------|
| `lmstudio-test complex --model <name>` | Hardware detection, preset generation, spend benchmark | ~60s |

**Tests Included:**
- **Hardware Detection**: Detects GPU, RAM, CPU capabilities
- **Preset Generation**: Creates optimal configuration for detected hardware
- **Spend Benchmark**: Measures tokens/sec, latency, efficiency

### Tier 4: Full-Stack Tests

End-to-end integration testing.

| Command | What It Tests | Duration |
|---------|--------------|----------|
| `lmstudio-test run-tests --target proxy` | Proxy bridge only | ~10s |
| `lmstudio-test run-tests --target frontend` | Frontend only | ~10s |
| `lmstudio-test run-tests --target full` | Full stack integration | ~20s |

## One-by-One Testing Workflow

### Step 1: Verify Bridge is Running

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","bridge":"running","lmstudio":"connected"}
```

### Step 2: Run Health Tests

```bash
lmstudio-test simple --base-url http://localhost:3001
```

**What to check:**
- Health endpoint responds with status "ok"
- LMStudio shows as "connected" (if running)
- Models endpoint returns available models
- Hardware detection works

### Step 3: Test Chat with Model

```bash
# First, check available models
curl http://localhost:3001/v1/models

# Then test chat
lmstudio-test simple --base-url http://localhost:3001 --model <model-name>
```

**What to check:**
- Non-streaming chat returns response
- Streaming chat receives chunks with SSE format
- System prompt is respected
- max_tokens limit is enforced

### Step 4: Test Medium Complexity

```bash
lmstudio-test medium --base-url http://localhost:3001 --model <model-name>
```

**What to check:**
- Context window handling (how much context model retains)
- System prompt adherence (does model follow instructions)
- Few-shot learning (can model learn from examples)

### Step 5: Run Performance Benchmarks

```bash
lmstudio-test complex --base-url http://localhost:3001 --model <model-name>
```

**What to check:**
- Hardware profile is detected correctly
- Preset is generated for your hardware
- Tokens/sec measurement
- Efficiency rating (LOW/MEDIUM/HIGH/EXCELLENT)

### Step 6: Compare Results

```bash
# View history
lmstudio-test history

# Compare two runs
lmstudio-test compare <run-id-1> <run-id-2>

# Export results
lmstudio-test export --format json --output comparison.json
```

## Performance Metrics Interpretation

### Latency Benchmarks

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| First Token (TTFT) | < 100ms | 100-500ms | 500ms-2s | > 2s |
| Total Response | < 1s | 1-3s | 3-10s | > 10s |
| Health Check | < 50ms | 50-200ms | 200-500ms | > 500ms |

### Throughput Benchmarks

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| Tokens/sec | > 50 | 20-50 | 10-20 | < 10 |
| Context Window | Full | 75%+ | 50-75% | < 50% |

### Efficiency Rating

The complex tests calculate an efficiency score based on:
- Tokens per second
- Hardware utilization
- Response quality
- Resource consumption

| Rating | Meaning |
|--------|---------|
| EXCELLENT | Optimal hardware utilization, high throughput |
| HIGH | Good performance, minor optimization possible |
| MEDIUM | Acceptable, significant room for improvement |
| LOW | Poor performance, check hardware/model compatibility |

## Troubleshooting

### Bridge Not Responding

```bash
# Check if bridge is running
curl http://localhost:3001/health

# If not running, start it:
cd proxy-bridge-python
python -m uvicorn app.main:app --host 0.0.0.0 --port 3001
```

### LMStudio Not Connected

```bash
# Check LMStudio status
curl http://localhost:1234/v1/models

# Ensure LMStudio is running and a model is loaded
```

### Model Not Found

```bash
# List available models
curl http://localhost:3001/v1/models

# Load a model in LMStudio first, then retry tests
```

### Tests Timeout

```bash
# Increase timeout for slow models
# Edit the test file and increase httpx.AsyncClient timeout
# Default: 30s for chat, 5s for health
```

## Custom Test Scenarios

### Create a Custom Test

```python
# Save as my_test.py
import asyncio
import httpx
from rich.console import Console

console = Console()

async def run_custom_test(base_url: str, model: str) -> dict:
    """Custom test scenario."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a coding assistant."},
                        {"role": "user", "content": "Write a Python function to reverse a string."}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 200,
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return {"ok": True, "content": content, "tokens": data.get("usage", {}).get("total_tokens", 0)}
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(run_custom_test("http://localhost:3001", "your-model"))
    console.print(result)
```

### Test Specific Endpoints

```bash
# Health
curl http://localhost:3001/health

# System Status
curl http://localhost:3001/api/status

# Models
curl http://localhost:3001/v1/models

# Chat Completion
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'

# Streaming Chat
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'

# Hardware Profile
curl http://localhost:3001/api/hardware/profile

# Embeddings
curl -X POST http://localhost:3001/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "embedding-model",
    "input": "Hello world"
  }'
```

## Result Management

### View Recent Results

```bash
lmstudio-test history --limit 20
```

### View Specific Run

```bash
lmstudio-test show <run-id>
```

### Compare Runs

```bash
lmstudio-test compare <run-id-1> <run-id-2>
```

### Export Results

```bash
# Export all recent results
lmstudio-test export --format json --output all_results.json

# Export specific run
lmstudio-test export --run-id <run-id> --format json --output run.json

# Export as CSV
lmstudio-test export --format csv --output results.csv
```

## Advanced Testing

### Model Comparison Workflow

```bash
# Test multiple models and compare
lmstudio-test simple --model model-a
lmstudio-test simple --model model-b
lmstudio-test history  # Get run IDs
lmstudio-test compare <run-a> <run-b>
```

### Performance Regression Testing

```bash
# Baseline test
lmstudio-test complex --model baseline-model
# Save run ID

# After changes, run again
lmstudio-test complex --model baseline-model
# Compare with baseline
lmstudio-test compare <baseline-run> <new-run>
```

### Stress Testing

For stress testing, use the complex tests with multiple iterations:

```bash
# Run complex tests multiple times
for i in {1..5}; do
  lmstudio-test complex --model <model-name>
  sleep 5
done

# Compare all runs
lmstudio-test history
```
