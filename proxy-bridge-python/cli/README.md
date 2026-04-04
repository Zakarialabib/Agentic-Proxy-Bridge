# LMStudio Test CLI

Interactive CLI testing and benchmarking tool for LMStudio proxy bridge.

## Installation

```bash
cd proxy-bridge-python
pip install -e .
```

Or install dependencies manually:

```bash
pip install click rich httpx
```

## Prerequisites

The CLI requires the proxy bridge to be running. Start it before running tests:

```bash
cd proxy-bridge-python
uvicorn app.main:app --host 0.0.0.0 --port 3001
```

For full testing (chat, benchmarks), LM Studio must also be running with a model loaded:

1. Open LM Studio and start the local server (default port 1234)
2. Load a model in LM Studio
3. Start the proxy bridge (port 3001)
4. Run CLI tests

## Usage

### Get Help

```bash
lmstudio-test --help
# or
python -m cli.main --help
```

### Commands

| Command | Description |
|---------|-------------|
| `simple` | Simple API tests (health, models, chat) |
| `medium` | Medium complexity tests (context, prompts, few-shot) |
| `complex` | Hardware-aware tests with spend tracking |
| `preset` | Auto-detect hardware and generate optimal presets |
| `git-workflow` | AI-powered commit, review, and PR generation |
| `run-tests` | Targeted tests (proxy, frontend, or full stack) |
| `compare` | Compare two test runs side-by-side |
| `export` | Export results to JSON or CSV |
| `history` | View test history |
| `show` | Show details of a specific run |

### Interactive Mode

Launch the full interactive TUI menu:

```bash
lmstudio-test simple -i
```

The menu provides:
- Model auto-detection and selection
- Hardware info display
- 14 test options organized by complexity tier
- Live results tables
- Test history browsing

### Simple Tests

Basic API connectivity and compatibility:

```bash
# Health, models, OpenAI compat (no model needed)
lmstudio-test simple

# Include chat tests (requires model)
lmstudio-test simple --model qwen3.5-4b

# Interactive mode
lmstudio-test simple -i
```

Tests run:
- Health endpoint (`/health`)
- System status (`/api/status`)
- Model listing (`/v1/models`)
- Hardware detection (`/api/status`)
- OpenAI format compliance
- Anthropic format compatibility
- Chat completions (streaming + non-streaming)

### Medium Tests

Prompt and context engineering:

```bash
lmstudio-test medium --model qwen3.5-4b
```

Tests run:
- **Context Window**: 512/4096/8192 token handling, overflow behavior, system prompt preservation
- **System Prompts**: Basic adherence, role-based (developer/system), long prompts, format instructions, multi-turn persistence
- **Few-Shot**: Zero-shot, one-shot, 3-shot pattern adherence, JSON/code/list format compliance, entity extraction

### Complex Tests

Hardware-aware adaptation and spend tracking:

```bash
# Detect hardware, generate presets, run benchmarks
lmstudio-test complex

# With specific model for benchmarking
lmstudio-test complex --model qwen3.5-4b
```

Tests run:
- **Hardware Detection**: GPU, VRAM, RAM, CPU cores (local or via bridge)
- **Preset Generation**: VRAM-tier-based optimal settings (quantization, context, batch size, GPU layers)
- **Benchmarks**: Short/code/reasoning prompts with token tracking
- **Spend Report**: Total tokens, time, tokens/sec, efficiency rating

### Preset Generator

Auto-detect hardware and generate optimal LMStudio configuration:

```bash
# Detect and display recommended settings
lmstudio-test preset

# For a specific model
lmstudio-test preset --model qwen3.5-4b

# Attempt to apply via proxy bridge (if endpoint available)
lmstudio-test preset --apply
```

Hardware tiers:
| Tier | VRAM | Quantization | Context | Batch |
|------|------|-------------|---------|-------|
| Low | <4GB | Q2_K | 2048 | 1 |
| Medium | 4-8GB | Q4_K_M | 4096 | 8 |
| High | 8-16GB | Q5_K_M | 8192 | 32 |
| Ultra | >16GB | Q6_K | 16384 | 64 |

### Git Workflow

AI-powered git operations using LMStudio:

```bash
lmstudio-test git-workflow --model qwen3.5-4b

# With auto-commit
lmstudio-test git-workflow --model qwen3.5-4b --commit

# Full output
lmstudio-test git-workflow --model qwen3.5-4b --output full

# JSON output for scripting
lmstudio-test git-workflow --model qwen3.5-4b --output json
```

Generates:
- Conventional commit messages from git diff
- Code review with issues, suggestions, security concerns, rating
- Markdown PR description with title, body, key changes

### Run Tests (Targeted)

Test specific components independently:

```bash
# Proxy bridge only (port 3001)
lmstudio-test run-tests --target proxy

# Frontend only (port 3000)
lmstudio-test run-tests --target frontend

# Full stack (both together)
lmstudio-test run-tests --target full
```

### Compare Runs

```bash
lmstudio-test compare <run-id-1> <run-id-2>
```

Shows differences in pass/fail status and latency between two runs.

### Export Results

```bash
# Export all recent results as JSON
lmstudio-test export

# Export as CSV to file
lmstudio-test export --format csv -o results.csv

# Export specific run
lmstudio-test export --run-id abc12345
```

### History and Details

```bash
# View last 10 runs
lmstudio-test history

# View specific run details
lmstudio-test show <run-id>
```

## Test Result Storage

Results are stored in `cli/results/data/` as JSON files with:
- Unique run ID (UUID)
- Test type and timestamp
- Pass/fail counts
- Duration in milliseconds
- Full test results

## Architecture

```
CLI (click + rich TUI)
  -> Proxy Bridge (port 3001)
    -> LM Studio (port 1234)

Test Tiers:
  Simple   -> Health, models, API compatibility, chat
  Medium   -> Context window, system prompts, few-shot
  Complex  -> Hardware detection, presets, spend tracking

Runners:
  Proxy only   -> Endpoint coverage, error resilience
  Frontend only -> Accessibility, API routes
  Full stack   -> E2E connectivity, CORS
```
