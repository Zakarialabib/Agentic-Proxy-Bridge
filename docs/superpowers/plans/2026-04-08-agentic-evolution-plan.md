# Agentic Evolution Plan: Breaking the 50% TCR Plateau

## 1. Summary
The CLI telemetry reveals that **Type B (Amnesia)** is the dominant failure in our trajectories—the model loses track of its goal due to context pollution by Hop 3. To break the 50% Task Completion Rate (TCR) plateau without adding models, this plan implements the next conceptual evolutions: triggering an active **Compression Mode** earlier, establishing a **Warm Start KV Cache Strategy** (Rollback Points), and introducing **Predictive Unloading** to selectively freeze model layers based on the cognitive mode.

## 2. Current State Analysis
- **Dominant Failure**: Type B (Amnesia) — the Qwen 4B model forgets earlier conclusions or goals by the 3rd hop due to context pollution from raw tool data.
- **Context Management**: Currently uses length-based truncation (1500 chars) and semantic pruning, but raw data is still appended to the history.
- **Error Handling**: When a tool call fails (e.g., JSON error), the error message is appended to the context, which pollutes the KV cache and consumes tokens.
- **Model Parameters**: The entire model (all GPU layers) remains active even for simple tool-selection tasks (Router Mode), unnecessarily consuming VRAM on the M4000.

## 3. Proposed Changes

### A. Formal "Compression Mode" (Fixing Type B Amnesia)
- **File**: `proxy-bridge-python/app/services/agent_service.py`
- **What**: Replace simple string truncation with an active LLM summarization step.
- **How**: If a tool result exceeds 500 characters and we are beyond Hop 1, intercept the result and spawn a fast, low-temperature sub-request in "Compression Mode" (`[COGNITIVE MODE: COMPRESSION] Summarize this tool result...`).
- **Why**: Keeps only the *conclusion* of the tool result in the context, not the raw data. This prevents the attention heads from drowning in noise by Hop 3, directly addressing the Type B failure.

### B. Warm Start KV Cache Strategy (Rollback Points)
- **File**: `proxy-bridge-python/app/services/agent_service.py`
- **What**: Snapshot the `current_messages` list before executing a tool or evaluating a response.
- **How**: If the model outputs invalid JSON (Type A failure) or hallucinates, **do not append** the error message to the context. Instead, rollback `current_messages` to the snapshot, inject the GBNF grammar or a temporary system hint into the payload, and retry the request.
- **Why**: Appending errors poisons the KV cache. Rolling back treats the conversation like a database transaction, keeping the cache pure and maximizing reuse across hops.

### C. Predictive Unloading (The Anti-Shard)
- **File**: `proxy-bridge-python/app/services/context_manager.py`
- **What**: Expand `LMStudioContextController` to dynamically adjust `gpu_offload` (the number of layers loaded into VRAM) via the `/v0/models/loaded/config` API.
- **How**: During **Router Mode** (Hop 1), "freeze" deeper layers by reducing the `gpu_offload` parameter (e.g., offload only 16 layers instead of max). During **Reasoning Mode** (Hop 2+), thaw all layers (offload max).
- **Why**: Makes the single 4B model behave like two distinct models based on task difficulty, saving VRAM on the M4000 and speeding up simple tool selections.

## 4. Assumptions & Decisions
- **Decision**: We will permanently move the Compression Mode trigger to Hop 2, as our telemetry already proved Type B (Amnesia) is the dominant failure.
- **Decision**: Compression Mode will use the same `qwen3.5-4b` model but with a highly restrictive system prompt and low `max_tokens` to ensure it's fast and cheap.
- **Assumption**: LM Studio's `/v0/models/loaded/config` endpoint supports dynamically adjusting the `gpu_offload` parameter. If this triggers a full, slow model reload on the M4000, we will fallback to purely prompt-based layer freezing if possible, or disable the unloading.

## 5. Verification Steps
1. Run `python cli/main.py prove --base-url http://localhost:8000 --model qwen3.5-4b --trajectory`.
2. Verify that the "Dominant Failure" shifts from Type B (Amnesia) to "None" (or another category).
3. Verify that the Trajectory TCR increases above the 50% plateau.
4. Check bridge logs to ensure Compression Mode is summarizing tool results, Rollback Points are firing on JSON errors, and Predictive Unloading is adjusting `gpu_offload` during Router Mode.