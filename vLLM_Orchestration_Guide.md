# 🚀 vLLM Orchestration Guide: Ultra-Throughput Agentic Swarms

Welcome to the advanced guide for integrating **vLLM** with the Proxy Bridge. This setup is designed for high-performance agentic workflows, multi-hop reasoning, and production-grade LLM serving.

vLLM provides **20x - 50x higher throughput** than standard runners by utilizing **PagedAttention**, **Continuous Batching**, and **Automatic Prefix Caching (APC)**.

---

## 💎 1. The vLLM Advantage
| Feature | Benefit | Why it matters for Agents |
| :--- | :--- | :--- |
| **PagedAttention** | Minimal VRAM fragmentation | Allows massive context windows (32k+) for RAG. |
| **Continuous Batching** | Parallel request processing | Handles multiple agent "thoughts" simultaneously. |
| **Prefix Caching** | Shared context reuse | Makes multi-turn tool loops 10x faster by caching the system prompt. |
| **GGUF Support** | Quantization flexibility | Run huge models on consumer GPUs (e.g., RTX 3090/4090). |

---

## 🛠️ 2. High-Performance Installation

We recommend a dedicated environment for vLLM to avoid dependency conflicts.

### Linux / WSL2 Prerequisites
- **NVIDIA GPU**: CUDA 12.1+ (Compute Capability 7.0+)
- **Python**: 3.9 - 3.12
- **RAM**: 16GB+ recommended

### Setup
```bash
# Create and activate environment
python -m venv vllm-env
source vllm-env/bin/activate  # Or Scripts\activate on Windows

# Install vLLM with high-performance dependencies
pip install vllm flash-attn --no-build-isolation
```

---

## ⚡ 3. Orchestration & Startup

### A. The Stepper (Interactive CLI)
The easiest way to start is using the built-in orchestrator:
```bash
cd proxy-bridge-python
python -m cli.main proxy
```
1. Select **vllm** as the backend.
2. The CLI will automatically scan your `~/.cache/lm-studio/models` directory.
3. Select your `.gguf` or Safetensors model.
4. The proxy will manage the vLLM subprocess in the background.

### B. Manual Server Management
To run vLLM manually for maximum control:
```bash
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 16384 \
    --gpu-memory-utilization 0.90 \
    --enable-prefix-caching
```

---

## 🧠 4. Advanced "Superpowers" (Proxy Bridge Logic)

The Proxy Bridge is not just a passthrough; it's a **Cognitive Orchestrator** for vLLM.

### 🧩 Breadcrumb Pattern (VRAM Saver)
When the proxy detects a `<think>` block, it extracts the reasoning into a "Breadcrumb" and yields it to the UI, but **strips it from the context sent back to the GPU** for the next hop. This prevents the KV cache from being polluted with ephemeral reasoning steps, keeping your 32k context lean.

### 📉 Active Compression Mode
If a tool result (e.g., a large file read or web search) exceeds 500 characters, the proxy automatically triggers **Compression Mode** on Hop 2+. It summarizes the raw data into a concise conclusion before appending it to the history, preventing "Context Amnesia."

### 🎭 Qwen-Aware Tool Execution
If you use a Qwen-based model, the proxy automatically switches to the **Native JSON-in-XML** protocol:
```xml
<tool_call>
{"name": "file_read", "arguments": {"path": "main.py"}}
</tool_call>
```
No manual prompting required. The adapter handles the mapping between industry-standard schemas and Qwen's requirements.

### 🛡️ Guided Generation (Deterministic Output)
vLLM's guided decoding ensures the model never hallucinates invalid JSON. You can pass these directly in your API call:
```json
{
  "model": "qwen",
  "messages": [...],
  "guided_json": { "type": "object", "properties": { "score": { "type": "number" } } }
}
```

---

## 🚦 5. Recommended Settings

For the best experience in the **Agentic Chat UI**:

1. **Context Strategy**: Set to `Prune` or `Balanced`.
2. **Temperature**: `0.0` for tool calls, `0.7` for creative chat.
3. **Max Hops**: `8`. vLLM is fast enough to handle deep reasoning chains.
4. **Embeddings**: If using a reasoning model in vLLM, keep LM Studio running on port 1234 for your embedding model (e.g., `text-embedding-qwen3`). The proxy will automatically route embedding requests to LM Studio if configured.

---

## 🔍 6. Troubleshooting

> [!IMPORTANT]
> **WSL2 is Required on Windows**: vLLM currently requires Linux or WSL2 for native GPU acceleration. If you are on Windows, ensure you are running the `proxy-bridge-python` and `vllm-env` inside a WSL2 instance.

- **Out of Memory (OOM)**: Reduce `--gpu-memory-utilization` to `0.8` or `--max-model-len`.
- **Connection Refused**: vLLM takes ~60s to pre-allocate the KV Cache. Wait for the `Uvicorn running` message in the log.
- **Model Hidden**: Check `VLLM_BASE_URL` in your `.env`. Default is `http://localhost:8000`.

---
*Created by Antigravity - Optimized for High-Performance Agentic Orchestration.*