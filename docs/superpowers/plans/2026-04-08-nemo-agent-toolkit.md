# NeMo-Style Agentic Resilience Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement NeMo-style guardrails, tool memory compression (RAG), and trajectory evaluation to make the bridge a resilient Agent OS.
**Architecture:** 
1. **Guardrails**: Introduce a `JsonGuardrail` that validates tool schemas and automatically triggers LM Studio's native JSON constrained decoding (`response_format: {"type": "json_object"}`) on retry loops.
2. **Tool Memory Compression**: Summarize or truncate large tool results when `recursive_hops > 1` to save context window for memory-bound cards like the M4000.
3. **Trajectory Evaluation**: Extend the CLI to evaluate multi-step tasks (`prove --trajectory`).

**Tech Stack:** Python, FastAPI, LM Studio Constrained Decoding.

---

### Task 1: NeMo-Style Guardrails & Constrained Decoding

**Files:**
- Create: `proxy-bridge-python/app/guardrails/validator.py`
- Modify: `proxy-bridge-python/app/services/agent_service.py`

- [ ] **Step 1: Create Guardrails Validator**
```python
# proxy-bridge-python/app/guardrails/validator.py
import json

class JsonGuardrail:
    @staticmethod
    def validate_tool_call(raw_content: str) -> tuple[bool, dict | None, str | None]:
        import re
        match = re.search(r"<tool_call>([\s\S]*?)</tool_call>", raw_content)
        try:
            if match:
                data = json.loads(match.group(1))
            else:
                json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", raw_content)
                data = json.loads(json_match.group(1)) if json_match else json.loads(raw_content)
                
            if not isinstance(data, dict) or "name" not in data:
                return False, None, "Missing 'name' field in JSON object."
            return True, data, None
        except Exception as e:
            return False, None, str(e)
```

- [ ] **Step 2: Hook into `agent_service.py` and enforce `json_object` format**
Update `intercept_and_execute_tools` to use the guardrail. When a tool call fails validation, inject the error into the context AND modify `follow_up_payload["response_format"] = {"type": "json_object"}` to force LM Studio's constrained decoding engine on the retry.

### Task 2: Tool Memory Compression (RAG for Tool Results)

**Files:**
- Modify: `proxy-bridge-python/app/services/agent_service.py`

- [ ] **Step 1: Compress large tool results in the agent loop**
In `intercept_and_execute_tools`, before appending `<tool_response>` to `current_messages`, check if `len(content_val) > 1000` and `recursive_hops > 1`. If so, truncate the string and add a `<ToolResult summary="..." truncated=true>` marker to save VRAM on the M4000.

### Task 3: Trajectory-Based Evaluation in CLI

**Files:**
- Create: `proxy-bridge-python/cli/tests/complex/trajectory.py`
- Modify: `proxy-bridge-python/cli/main.py`

- [ ] **Step 1: Write `run_trajectory_tests`**
Create a test that simulates a multi-step task: "Search the web for 'LM Studio', then calculate 5 * 5, then format a summary". It tracks Task Completion Rate and Backtrack Efficiency.

- [ ] **Step 2: Add `prove --trajectory`**
Add the flag to `main.py` and execute `run_trajectory_tests`.