# vLLM Orchestration Guide

Welcome to the vLLM integration guide for the Proxy Bridge! This document covers everything you need to know about installing, running, and orchestrating vLLM alongside the Agentic UI.

vLLM provides significantly higher throughput and lower latency compared to LM Studio, especially for concurrent requests, thanks to its PagedAttention memory management and continuous batching capabilities.

---

## 1. Installation

vLLM is a Python package that can be installed via pip. We recommend creating a dedicated virtual environment for it, separate from the proxy bridge if desired, though they can run in the same environment.

### Prerequisites
- OS: Linux or WSL2 (Windows Subsystem for Linux)
- GPU: NVIDIA GPU with CUDA 12.1+ support (Compute Capability 7.0 or higher recommended)
- Python: 3.9 - 3.12

### Install via pip
```bash
# Optional: Create a dedicated virtual environment
python -m venv vllm-env
source vllm-env/bin/activate

# Install vLLM
pip install vllm
```

---

## 2. Running the vLLM Server

vLLM can act as a drop-in replacement for OpenAI-compatible APIs (like LM Studio). You launch it from the command line, pointing it to the Hugging Face repository or a local directory containing your model weights (Safetensors or GGUF).

### Basic Command (Serving Qwen3.5-4B)
```bash
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen3.5-4B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.90
```

### Advanced Command (Performance Tuned)
If you have a powerful GPU (e.g., RTX 3090, 4090) and want to maximize throughput for agentic multi-hop reasoning:
```bash
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen3.5-4B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 16384 \
    --gpu-memory-utilization 0.95 \
    --enforce-eager \
    --enable-chunked-prefill \
    --max-num-batched-tokens 8192
```

> **Note on GGUF Support:** vLLM recently added support for GGUF quantization. If you are using GGUF files downloaded from LM Studio, you can point vLLM directly to the file path:
> `--model /path/to/models/Qwen3.5-4B.gguf --quantization gguf`

---

## 3. Configuring the Proxy Bridge

Now that vLLM is running on `http://localhost:8000`, you need to configure the Proxy Bridge to use it instead of LM Studio.

1. Open the `.env` file in the `proxy-bridge-python` directory.
2. Update the engine settings:

```env
# Switch the active backend from 'lmstudio' to 'vllm'
ACTIVE_BACKEND=vllm

# Ensure the vLLM base URL matches the port you launched vLLM on
VLLM_BASE_URL=http://localhost:8000
```

3. Restart the Proxy Bridge:
```bash
cd proxy-bridge-python
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

---

## 4. UI Orchestration & Usage

Once the proxy bridge and vLLM are running, open the Agentic Chat UI (Frontend).

### Automatic Model Discovery
Because we implemented the `VLLMAdapter`, the proxy bridge will automatically query vLLM's `/v1/models` endpoint.
- In the UI, the model dropdown will automatically populate with the model you loaded in vLLM (e.g., `Qwen/Qwen3.5-4B-Instruct`).
- The "Load/Unload" buttons in the UI are safely mocked when using vLLM. Clicking them will not crash the app, but they will not affect vLLM since vLLM manages its model state at startup.

### Qwen Model-Aware Prompting
If you loaded a Qwen model, the proxy will automatically detect "qwen" in the model name and inject the native JSON-in-XML tool calling instructions into the system prompt:
```xml
<tool_call>
{"name": "tool_name", "arguments": {"arg_name": "value"}}
</tool_call>
```
You do not need to configure anything in the UI for this to happen. The proxy bridge handles the translation between Anthropic-style and Qwen-style natively.

### Embeddings and Semantic RAG
If you want to use the Knowledge Graph or Semantic RAG tools, you must ensure an embedding model is also available. vLLM *can* serve embedding models, but usually, it only serves one model per process.

**Best Practice for Embeddings:**
1. Keep `ACTIVE_BACKEND=vllm` for your heavy reasoning model (Qwen 4B/9B).
2. Start LM Studio on port 1234 serving *only* your embedding model (e.g., `text-embedding-qwen3-embedding-4b`).
3. Update `app/services/coalescer.py` or `tool_service.py` to route embedding requests explicitly to `settings.lm_studio_base_url` while keeping chat completions routed to `settings.backend_base_url`. (This requires a minor manual code tweak if you want a split architecture).

### Tuning Orchestration Parameters
In the Agentic Control Space within the UI:
- **Context Strategy:** Set to `Prune`. vLLM handles large contexts incredibly well, but pruning ensures the KV cache stays highly efficient during long tool-calling loops.
- **Max Iterations (Hops):** Set to `5` or `8`. Because vLLM is so fast, you can afford deeper reasoning chains without the user waiting too long.
- **Tool Call Budget:** Set to `10`.

---

## 5. Troubleshooting

**Error: "Connection refused" or Timeout in UI**
- Ensure vLLM has fully loaded the model into VRAM. It can take 1-3 minutes for vLLM to allocate the KV Cache blocks before it starts accepting HTTP requests. Watch the vLLM terminal for `Uvicorn running on http://0.0.0.0:8000`.

**Error: CUDA Out of Memory (OOM)**
- Decrease `--gpu-memory-utilization` (e.g., from `0.90` to `0.80`).
- Decrease `--max-model-len` (e.g., from `8192` to `4096`).

**Model not appearing in UI dropdown**
- Ensure `VLLM_BASE_URL` in `.env` is correct.
- Verify vLLM is responding by running: `curl http://localhost:8000/v1/models`