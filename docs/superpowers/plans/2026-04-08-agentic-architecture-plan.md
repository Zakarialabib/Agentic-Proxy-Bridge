# Agentic Architecture & Auto-Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Upgrade the bridge proxy to be a robust agentic orchestrator with JSON validation retry loops, context compression, and workload-aware adaptive tuning.
**Architecture**: 
1. **Adaptive Tuner**: Analyze the `spend_report` to detect compute-bound vs memory-bound workloads (e.g., comparing reasoning TPS vs code TPS) and adjust settings accordingly.
2. **Context Builder**: Enhance `enforce_context_window` to "compress" (replace with a summary placeholder) older turns when approaching context limits, rather than just silently dropping them, and ensure strict token budgets for tool headroom.
3. **Agent Service**: Add a resilient JSON validation loop in `intercept_and_execute_tools`. If the LLM outputs malformed tool JSON, inject a correction prompt and retry up to 3 times.
**Tech Stack**: Python, FastAPI, httpx.

---

### Task 1: Resilient JSON Tool Validation & Retry Loop

**Files:**
- Modify: `proxy-bridge-python/app/services/agent_service.py`

- [ ] **Step 1: Implement JSON Error Injection in `intercept_and_execute_tools`**
Update the tool parsing logic. If `json.loads` fails, instead of yielding a dummy error and breaking, append an error message to the context and retry the LLM call.

```python
# In proxy-bridge-python/app/services/agent_service.py

# Inside the `if is_tool_call_mode:` block, replace the parsing logic:
                match = re.search(r"<tool_call>([\s\S]*?)</tool_call>", tool_call_buffer)
                tool_data = None
                tool_call_content = ""
                parse_error = None
                
                try:
                    if match:
                        tool_call_content = match.group(0)
                        tool_data = json.loads(match.group(1))
                    else:
                        tool_call_content = tool_call_buffer.strip()
                        # Attempt to find JSON array or object if tags are missing
                        json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", tool_call_content)
                        if json_match:
                            tool_data = json.loads(json_match.group(1))
                        else:
                            tool_data = json.loads(tool_call_content)
                except json.JSONDecodeError as e:
                    parse_error = str(e)
                
                if tool_data and isinstance(tool_data, dict) and tool_data.get("name"):
                    # Existing execution logic...
                    tool_name = tool_data["name"]
                    args = tool_data.get("arguments") or tool_data.get("parameters") or {}
                    
                    # Execution
                    call_result = await tool_registry.execute(tool_name, args)
                    
                    if call_result.success:
                        if isinstance(call_result.result, dict) and "content" in call_result.result:
                            content_val = call_result.result["content"]
                        else:
                            content_val = call_result.result
                    else:
                        content_val = f"Error: {call_result.error}"
                    
                    # Construct follow-up
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"<tool_response>\n{json.dumps({'name': tool_name, 'content': content_val})}\n</tool_response>"
                    })
                else:
                    # JSON parsing failed or missing name, inject error and retry
                    error_msg = parse_error or "Invalid tool call format. Expected JSON with a 'name' field."
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"System Error: Failed to parse tool call JSON. {error_msg}. Please fix the JSON syntax and try again using strict <tool_call> tags."
                    })
                
                # Retry logic for both success (continue agent loop) and failure (fix JSON)
                client = connection_pool.get_client("openai")
                headers = {"Content-Type": "application/json"}
                
                # Enforce context limits before sending
                from app.services.context_builder import enforce_context_window
                follow_up_payload = {**original_payload, "messages": enforce_context_window(current_messages, original_payload.get("max_tokens", 8192))}
                
                req = client.build_request(
                    "POST", 
                    f"{settings.lm_studio_base_url}/v1/chat/completions",
                    json=follow_up_payload,
                    headers=headers
                )
                next_response = await client.send(req, stream=True)
                next_response.raise_for_status()
                current_response = next_response
                continue # Restart loop with the new response
```

### Task 2: Dynamic Context Compression

**Files:**
- Modify: `proxy-bridge-python/app/services/context_builder.py`

- [ ] **Step 1: Update `enforce_context_window` to compress rather than just truncate**
When messages are dropped to fit the budget, insert a "System: [N older turns compressed to save context window]" message so the LLM knows context was lost, rather than hallucinating. Also, ensure tool responses are prioritized.

```python
# In proxy-bridge-python/app/services/context_builder.py

def enforce_context_window(messages: List[Dict[str, Any]], max_tokens: int = 16000) -> List[Dict[str, Any]]:
    """
    Enforces a context window limit.
    Preserves system prompt and compresses older messages when exceeding budget.
    """
    if not messages:
        return []
    
    system_msg = None
    if messages[0].get("role") == "system":
        system_msg = messages[0]
        working_msgs = messages[1:]
    else:
        working_msgs = messages[:]
        
    system_tokens = estimate_tokens(system_msg.get("content", "")) if system_msg else 0
    
    # Leave a larger 2000 token headroom for tool results and generation
    budget = max_tokens - system_tokens - 2000  
    if budget < 2000:
        budget = 2000
        
    retained_msgs = []
    current_tokens = 0
    dropped_count = 0
    
    # Process from newest to oldest
    for msg in reversed(working_msgs):
        msg_content = msg.get("content", "")
        if isinstance(msg_content, list):
            msg_text = " ".join([c.get("text", "") for c in msg_content if c.get("type") == "text"])
        else:
            msg_text = str(msg_content)
            
        msg_tokens = estimate_tokens(msg_text)
        
        if current_tokens + msg_tokens <= budget:
            retained_msgs.append(msg)
            current_tokens += msg_tokens
        else:
            dropped_count += 1
            
    retained_msgs.reverse()
    
    final_messages = []
    if system_msg:
        final_messages.append(system_msg)
        
    if dropped_count > 0:
        final_messages.append({
            "role": "system",
            "content": f"[System Note: {dropped_count} older conversation turns were compressed to maintain tool context headroom.]"
        })
        
    final_messages.extend(retained_msgs)
    return final_messages
```

### Task 3: Workload-Aware Adaptive Tuning

**Files:**
- Modify: `proxy-bridge-python/app/services/adaptive_tuner.py`

- [ ] **Step 1: Analyze `spend_report` variance in `_tune_complex_tests`**
Compare the TPS of different tasks (e.g., reasoning vs code) to determine if the model is compute-bound or memory-bound, and adjust presets intelligently.

```python
# In proxy-bridge-python/app/services/adaptive_tuner.py
# Inside _tune_complex_tests:

    def _tune_complex_tests(self, results: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        updated_presets = self.presets.copy()
        rationales = []
        
        # Extract the spend_report from the results
        spend_report = results.get("tests", {}).get("spend_report", {})
        if not spend_report:
            spend_report = results.get("spend_report", {})
            
        benchmark = results.get("benchmark", {}) if "benchmark" in results else results.get("tests", {}).get("benchmark", {})
        
        tps = benchmark.get("tokens_per_sec", 0)
        
        if spend_report and "by_test" in spend_report:
            by_test = spend_report["by_test"]
            reasoning_tps = by_test.get("reasoning", {}).get("tokens_per_sec", 0)
            code_tps = by_test.get("code", {}).get("tokens_per_sec", 0)
            short_tps = by_test.get("short", {}).get("tokens_per_sec", 0)
            
            # Detect Compute-Bound vs Memory-Bound
            # If long context (reasoning) TPS is similar to short context (code) TPS, it's compute bound.
            # If long context TPS drops significantly compared to short context, it's memory/bandwidth bound.
            
            if reasoning_tps > 0 and code_tps > 0:
                tps_variance = abs(reasoning_tps - code_tps)
                
                if tps < 10:
                    if tps_variance < 1.0:
                        # Compute bound: consistent slow speed regardless of context size
                        msg = f"Inference-bound workload detected (Consistent ~{reasoning_tps:.1f} TPS). Reducing quantization to speed up compute."
                        rationales.append(msg)
                        print(f"[AdaptiveTuner] {msg}")
                        for p in updated_presets.get("presets", []):
                            p["params"]["quantization_target"] = "Q4_K_S" if tps > 5 else "Q3_K_M"
                            p["description"] += " (Compute-Bound Optimized)"
                    else:
                        # Memory/Bandwidth bound: speed degrades with context size
                        msg = f"Memory-bound workload detected (High TPS variance: {code_tps:.1f} vs {reasoning_tps:.1f}). Capping context window and enabling sliding window attention."
                        rationales.append(msg)
                        print(f"[AdaptiveTuner] {msg}")
                        for p in updated_presets.get("presets", []):
                            p["params"]["context_window"] = min(p["params"].get("context_window", 4096), 4096)
                            # Could add a specific flag for sliding window if supported by LM Studio API
                            p["description"] += " (Memory-Bound Optimized)"
        else:
            # Fallback to standard heuristic if spend_report details are missing
            if tps < 10 and tps > 0:
                msg = f"Low throughput ({tps} TPS) detected. Optimizing quantization and context constraints."
                rationales.append(msg)
                for p in updated_presets.get("presets", []):
                    p["params"]["quantization_target"] = "Q4_K_S" if tps > 5 else "Q3_K_M"
                    p["params"]["context_window"] = min(p["params"].get("context_window", 4096), 4096)

        return updated_presets, rationales
```
