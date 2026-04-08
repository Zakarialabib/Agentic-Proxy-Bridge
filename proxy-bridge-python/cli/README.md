# LMStudio Test CLI

Interactive CLI testing and benchmarking tool for the LMStudio proxy bridge. This tool acts as the validation layer for our Agentic Architecture, providing empirical evidence of how LLMs behave under multi-turn tool calling, context pressure, and hardware constraints.

## Installation

```bash
cd proxy-bridge-python
pip install -e .
```

Or install dependencies manually:

```bash
pip install click rich httpx
```

## Agentic Architecture Insights

The CLI is not just a unit tester; it's a diagnostic tool that reveals the fundamental realities of running LLMs for agentic purposes (e.g., tool calling, MCPs, JSON schemas). 

### The Immutable Model Problem
A core tension in adaptive LLM infrastructure is the boundary between **runtime parameters** (temperature, top_p, repetition penalty) and **load-time constants** (quantization, context window, GPU layers). 
While the proxy bridge can dynamically adjust prompts and sampling settings on the fly, a model's weights and memory allocations are locked in VRAM once loaded by LM Studio. You cannot magically make a 4B parameter model smarter or faster simply by tweaking a system prompt if it is bottlenecked by its quantization or context allocation.

### The Detection vs Reality Gap
Hardware autodetection often fails to capture silicon realities. For example, an NVIDIA Quadro M4000 (Maxwell architecture) might be detected as a "HIGH" tier GPU because it has access to 12.7GB of effective system RAM. However, running an 8k context window on an M4000 yields a painful 7.8 tokens/sec due to severe memory bandwidth bottlenecks.
The CLI's `complex` benchmark exposes this gap, allowing the proxy's `AdaptiveTuner` to override naive VRAM heuristics and cap context limits or downgrade quantization specifically for older architectures.

### What `prove` Actually Validates
When running the closed-loop `prove` command, the goal is not to test if the hardware physically transformed between Pass 1 and Pass 2. Instead, it validates:
1. **Context Strategy (Runtime):** Does compressing older conversation turns preserve enough token headroom for tool execution without causing context overflow?
2. **Tool Schema Reliability (Request-Time):** If Pass 1 fails JSON format compliance, does injecting strict grammar instructions and validation loops in Pass 2 result in a valid structured output?
3. **Hardware-Induced Degradation (Infrastructure):** Does the model degrade into repetition loops when the KV cache fills up?

### Agentic Bridge Implications
Because models are immutable at runtime, the proxy bridge must act as an **active load balancer** rather than a passive translator. If the CLI tests prove a model cannot handle multi-turn context (e.g., `multi_turn_persistence: false`), the bridge must:
- **Shard the Cognition:** Route fast, single-turn tool selections to small models (e.g., Qwen 4B), but escalate deep reasoning to larger models or distinct queues.
- **Dynamic Context Compression:** Actively summarize or drop older turns to guarantee strict token headroom for tool responses.
- **Resilient JSON Validation:** Never trust the LLM's raw tool output. The bridge must intercept malformed JSON, inject a correction prompt, and automatically retry the inference.

---

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
| `simple` | Simple API tests (health, models, chat) + **Autotune** |
| `medium` | Medium complexity tests (context, prompts, few-shot) + **Autotune** |
| `complex` | Hardware-aware tests with spend tracking + **Autotune** |
| `prove` | Closed-loop demonstration: Baseline Pass 1 vs Optimized Pass 2 |
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

### Adaptive Intelligence (Auto-Tune)

The CLI supports automated performance optimization via the `--autotune` flag. This connects test results directly to the Proxy Bridge's `AdaptiveTuner`.

```bash
# Example: Run simple tests and automatically optimize bridge config
lmstudio-test simple --model qwen3.5-4b --autotune
```

**What it does:**
1. **Analyzes Errors**: Detects 500 errors (VRAM overflow) and lowers `context_window` presets.
2. **Workload-Aware Tuning**: Compares TPS between code and reasoning tasks to determine if the workload is compute-bound or memory-bound, adjusting quantization and context accordingly.
3. **Validates Compliance**: If format checks fail, it enforces strict system prompts and enables auto-retry loops for JSON tools.

### Simple Tests
Basic API connectivity and compatibility:
```bash
lmstudio-test simple --model qwen3.5-4b --autotune
```

### Medium Tests
Context engineering and tool schema reliability:
```bash
lmstudio-test medium --model qwen3.5-4b --autotune
```

### Complex Tests
Hardware-aware adaptation and spend tracking:
```bash
lmstudio-test complex --model qwen3.5-4b --autotune
```
*Generates the "Spend Report" detailing Tokens/sec and Efficiency.*

### Prove Command
Demonstrates the bridge's ability to adapt to failures:
```bash
lmstudio-test prove --model qwen3.5-4b
```
*Runs Pass 1, triggers the Adaptive Tuner, and runs Pass 2 to validate improvements in context handling and schema adherence.*

## Test Result Storage

Results are stored in `cli/results/data/` as JSON files with:
- Unique run ID (UUID)
- Test type and timestamp
- Pass/fail counts
- Duration in milliseconds
- Full test results and the Spend Report

## Architecture

```text
CLI (click + rich TUI)
  -> Proxy Bridge (port 3001)
    [Unified Normalizer] -> (Enforces OpenAI strictness & JSON Recovery)
    [Context Builder]    -> (Dynamic Context Compression for Tool Headroom)
    [Adaptive Tuner]     -> (Workload-aware profiling from Spend Reports)
    -> LM Studio (port 1234)

Test Tiers:
  Simple   -> Health, models, API compatibility
  Medium   -> Context limits, system prompts, JSON format compliance
  Complex  -> Hardware profiling, benchmark TPS, memory-bound detection
```