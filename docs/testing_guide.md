# Testing Guide

Comprehensive documentation for the Proxy Bridge CLI testing suite.

## Overview

The CLI testing tool (`lmstudio-test`) provides systematic testing for LM Studio, the proxy bridge, and the full stack. It enables you to:

- Verify connectivity and health
- Test OpenAI-compatible endpoints
- Benchmark model performance
- Compare models side-by-side
- Validate tool execution
- Test agentic workflows

## Quick Start

### Installation

```bash
cd proxy-bridge-python
pip install -e .
```

### Basic Usage

```bash
# Interactive TUI
lmstudio-test simple -i

# Run all simple tests
lmstudio-test simple

# Run with specific model
lmstudio-test medium --model qwen3.5-4b
```

---

## Test Tiers

### Simple Tests

**Purpose**: Quick health checks and basic functionality verification.

**Commands**:
```bash
lmstudio-test simple              # Run all simple tests
lmstudio-test simple -i           # Interactive mode
lmstudio-test simple --target health  # Health tests only
```

**Tests Included**:

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Health | Bridge and LM Studio connectivity | status=ok |
| Models | Model listing | At least 1 model |
| OpenAI Compat | Basic OpenAI endpoint compatibility | 200 OK |
| Endpoints | All API endpoints | 200 OK |
| Streaming | SSE streaming behavior | Stream completes |
| Model Management | Load/unload operations | Success |

**Expected Output**:
```
Running Simple Tests...
✓ Health check passed
✓ Models listed: 1
✓ OpenAI compatibility: OK
✓ Endpoints: 10/10 passed
✓ Streaming: OK
✓ Model management: OK

Results: 6/6 passed
```

### Medium Tests

**Purpose**: Deeper functionality testing with model interaction.

**Commands**:
```bash
lmstudio-test medium --model qwen3.5-4b
lmstudio-test medium --target context
```

**Tests Included**:

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Context Window | Context management and eviction | Messages preserved correctly |
| System Prompts | System prompt handling | System prompt respected |
| Few-Shot | Few-shot learning | Examples followed |
| Scenario Testing | Agentic scenario application | Parameters applied |
| Parameter Sweep | Temperature/top_p variations | Responses vary appropriately |
| Tool Execution | Tool call interception | Tools execute correctly |

**Expected Output**:
```
Running Medium Tests with model: qwen3.5-4b
✓ Context window: 4096 tokens
✓ System prompts: Applied correctly
✓ Few-shot: 3/3 examples followed
✓ Scenario testing: 4/4 scenarios passed
✓ Parameter sweep: 5/5 variations OK
✓ Tool execution: 4/4 tools working

Results: 6/6 passed
```

### Complex Tests

**Purpose**: Performance benchmarking and advanced features.

**Commands**:
```bash
lmstudio-test complex --model qwen3.5-4b
lmstudio-test complex --target performance
```

**Tests Included**:

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Performance Benchmark | Latency and throughput | Metrics recorded |
| Stress Test | Concurrent request handling | No failures |
| Model Comparison | Multi-model comparison | Results comparable |
| Embedding Quality | Embedding coalescer and MRL | Embeddings valid |
| Hardware Detection | System hardware analysis | Hardware detected |
| Presets | Preset CRUD operations | All operations succeed |
| Spend Tracking | Token usage tracking | Accurate counts |

**Expected Output**:
```
Running Complex Tests with model: qwen3.5-4b
✓ Performance: 150ms avg latency
✓ Stress test: 10/10 concurrent OK
✓ Model comparison: 3 models tested
✓ Embedding quality: 0.95 similarity
✓ Hardware: NVIDIA Quadro M4000 detected
✓ Presets: 5/5 operations OK
✓ Spend tracking: Accurate

Results: 7/7 passed
```

### Full Stack Tests

**Purpose**: End-to-end integration testing.

**Commands**:
```bash
lmstudio-test run-tests --target full
```

**Tests Included**:

| Test | Description | Expected Result |
|------|-------------|-----------------|
| End-to-End | Full request flow | Complete pipeline |
| RAG Pipeline | Retrieval-augmented generation | Context retrieved |
| Agentic Workflow | Complete agentic loop | Tools executed |
| MCP Integration | MCP server integration | Servers connected |

---

## Step-by-Step Testing Workflow

### Phase 1: Health Verification

Run these tests first to ensure everything is working:

```bash
# 1. Start LM Studio (manual)
# Ensure LM Studio server is running on port 1234

# 2. Start Proxy Bridge
cd proxy-bridge-python
uvicorn app.main:app --host 0.0.0.0 --port 3001

# 3. Test health
lmstudio-test simple --target health
```

**Expected**: All health checks pass.

### Phase 2: Basic Functionality

```bash
# Test model listing
lmstudio-test simple --target models

# Test OpenAI compatibility
lmstudio-test simple --target openai

# Test all endpoints
lmstudio-test simple --target endpoints
```

**Expected**: All endpoints return 200 OK.

### Phase 3: Model Interaction

```bash
# Load a model in LM Studio first
# Then test with that model
lmstudio-test medium --model qwen3.5-4b
```

**Expected**: Model responds correctly to prompts.

### Phase 4: Performance Testing

```bash
# Run performance benchmarks
lmstudio-test complex --target performance

# Run stress tests
lmstudio-test complex --target stress
```

**Expected**: Performance metrics recorded, no failures.

### Phase 5: Advanced Features

```bash
# Test embeddings
lmstudio-test complex --target embeddings

# Test presets
lmstudio-test complex --target presets

# Test full stack
lmstudio-test run-tests --target full
```

**Expected**: All advanced features working.

---

## Chat Testing & Benchmarking

**Purpose**: Systematic evaluation of model intelligence and performance.

### Running Chat Tests via Dashboard
1. Open the **Gateway** or **Observability** tab.
2. Navigate to **Chat Testing**.
3. Select a preset (e.g., Reasoning, Creativity).
4. Click **Run Test**.
5. The system will send a hidden prompt, evaluate the structured response, and report on:
   - **Accuracy**: Did it follow instructions?
   - **Latency (TTFT)**: Time to start talking.
   - **Throughput (TPS)**: Generation speed.

### Running Chat Tests via CLI
Use the `benchmark` command for high-precision runs:

```bash
# Run benchmark with 10 iterations
lmstudio-test benchmark --model qwen3.5-4b --iterations 10

# Run reasoning test suite
lmstudio-test benchmark --target reasoning --model qwen3.5-4b
```

---

## Result Management

### View Test History

```bash
lmstudio-test history
```

### Compare Test Runs

```bash
lmstudio-test compare <run-id-1> <run-id-2>
```

### Export Results

```bash
# Export to JSON
lmstudio-test export --format json -o results.json

# Export to CSV
lmstudio-test export --format csv -o results.csv

# Export to Markdown
lmstudio-test export --format markdown -o results.md
```

### View Specific Run

```bash
lmstudio-test show <run-id>
```

---

## Performance Benchmarking

### Metrics Tracked

| Metric | Description | Unit |
|--------|-------------|------|
| First Token Latency | Time to first token | ms |
| Total Response Time | Complete response time | ms |
| Token Generation Speed | Tokens per second | tok/s |
| Memory Usage | Peak memory during test | MB |
| Success Rate | Percentage of successful requests | % |

### Running Benchmarks

```bash
# Full benchmark suite
lmstudio-test complex --target performance

# Specific benchmark
lmstudio-test benchmark --model qwen3.5-4b --iterations 10
```

### Interpreting Results

**Good Performance**:
- First token latency: < 500ms
- Token generation: > 20 tok/s
- Success rate: > 95%

**Acceptable Performance**:
- First token latency: 500-1000ms
- Token generation: 10-20 tok/s
- Success rate: 90-95%

**Poor Performance**:
- First token latency: > 1000ms
- Token generation: < 10 tok/s
- Success rate: < 90%

---

## Regression Testing

### Purpose

Ensure changes don't break existing functionality.

### Procedure

```bash
# 1. Run full test suite before changes
lmstudio-test run-tests --target full
lmstudio-test export --format json -o baseline.json

# 2. Make changes

# 3. Run full test suite after changes
lmstudio-test run-tests --target full
lmstudio-test export --format json -o after.json

# 4. Compare results
lmstudio-test compare baseline after
```

### Automated Regression

```bash
# Run regression suite
./cli/scripts/run_all_tests.sh
```

---

## Custom Test Creation

### Creating a New Test

1. Create test file in appropriate tier:
   - `cli/tests/simple/my_test.py`
   - `cli/tests/medium/my_test.py`
   - `cli/tests/complex/my_test.py`

2. Implement test function:
```python
async def run_my_test(client, model):
    # Test logic here
    return {
        "name": "My Test",
        "status": "passed",
        "details": "Test details"
    }
```

3. Register in tier's `__init__.py`

4. Run test:
```bash
lmstudio-test simple --target my_test
```

---

## Troubleshooting

### Common Test Failures

| Failure | Cause | Solution |
|---------|-------|----------|
| Health check fails | Bridge not running | Start uvicorn |
| Models empty | LM Studio not running | Start LM Studio server |
| OpenAI compat fails | No model loaded | Load model in LM Studio |
| Streaming fails | Network issue | Check connection stability |
| GPU not detected | No GPU drivers | Install CUDA drivers |

### Debug Mode

```bash
# Run with verbose output
lmstudio-test simple -v

# Run specific test with debug
lmstudio-test simple --target health -v
```

### Log Files

Test logs are stored in:
- `proxy-bridge-python/cli/results/`
- `proxy-bridge-python/logs/`
