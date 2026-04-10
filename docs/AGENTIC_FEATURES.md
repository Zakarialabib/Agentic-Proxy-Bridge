# Agentic Superpowers: Implementation Status & Architecture

This document serves as the **Source of Truth** for the advanced agentic capabilities implemented within the Proxy Bridge. While the `docs/superpowers/plans` folder contains historical roadmaps, the features documented here are currently active in the `src` codebase.

---

## 🚀 Core Superpowers

### 1. Resilient JSON & XML Validation (NeMo Style)
The proxy implements a robust validation layer that intercepts LLM output before it reaches the tool registry.
- **Location**: `proxy-bridge-python/app/guardrails/validator.py` and `app/services/agent_service.py`
- **Capabilities**:
    - Detects and repairs malformed tool calls (e.g., missing closing tags).
    - Injects "JSON Correction" prompts and triggers an automatic retry (Internal Hop) if parsing fails.
    - **Rollback Points**: If a tool call is invalid, the proxy rolls back the conversation state before retrying to prevent "KV Cache Pollution" from hallucinated JSON.

### 2. Cognition Sharding (Reasoning Escalation)
Automatically escalates complex reasoning tasks to more capable models when a conversation exceeds a certain complexity threshold.
- **Logic**: If a tool-calling loop exceeds 3 "hops," the proxy can automatically switch the backend model to one defined in `REASONING_FALLBACK_MODEL`.
- **Purpose**: Use fast, small models (e.g., Qwen 4B) for simple tool discovery, and only "burn" tokens on high-IQ models (e.g., Claude 3.5 or Qwen 72B) when the agent gets stuck.

### 3. Formal Context Compression (Amnesia Fix)
Prevents "Type B Amnesia" where models lose the original user goal due to massive tool result payloads.
- **Location**: `app/services/agent_service.py` (`_compress_tool_result` helper)
- **Logic**: When a tool result exceeds 1500 characters and the agent is on Hop 2+, the proxy triggers a recursive "Summarization Handoff."
- **Result**: Massive data (like a 50KB file read) is replaced with a concise semantic summary, preserving the "Reasoning Budget" and GPU VRAM.

### 4. GBNF Grammar Injection
Guarantees structural compliance for tool calls by dynamically generating and injecting GBNF grammars into the inference engine.
- **Location**: `app/guardrails/grammar_builder.py`
- **Logic**: When a specific tool is intended (detected via regex), the proxy generates a strict schema-aware grammar and injects it into the `/v1/chat/completions` request.
- **Support**: Works with vLLM and Llama.cpp (LM Studio) backends.

### 5. Breadcrumb Reinjection
Preserves the "Mental Model" of the agent across hops without bloating the KV cache.
- **Logic**: Extracts `<think>` or `<thought>` blocks from the output, stores them in the proxy, and only reinjects a concise "Breadcrumb" into the system prompt of the next hop.
- **Benefit**: Saves 15-30% of context tokens in long reasoning chains.

---

## 🛠️ Infrastructure Superpowers

### Hardware-Aware Adaptive Tuning
The proxy isn't just a passthrough; it's a hardware manager.
- **Adaptive Tuner**: (`app/services/adaptive_tuner.py`) Analyzes hardware profiles and spent reports to automatically adjust quantization targets and context windows.
- **Embedding Coalescer**: (`app/services/coalescer.py`) Deduplicates and batches embedding requests from parallel agent threads into a single GPU call.

### Unified Universal Stepper (CLI)
A beautiful, interactive TUI for launching the entire stack.
- **Usage**: `python -m cli.main proxy`
- **Features**: Automatic model scanning, backend switching, and unified logging.

---

## 🗺️ Future Roadmap (Next Phases)

| Feature | Status | Target |
|---------|--------|--------|
| Multi-Model Swarm | 🏗️ Planned | Synchronous parallel execution across 3+ local models |
| Speculative Tooling | 🧪 Experimental | Predicting the next tool call before the user finishes typing |
| Remote SSE MCP | 🏗️ Planned | Support for remote MCP servers via SSE/HTTP transports |
