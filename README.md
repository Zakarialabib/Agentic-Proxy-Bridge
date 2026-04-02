# Agentic Proxy Bridge Control Space

A powerful, high-performance middleware stack connecting your local LM Studio instance to the Openclaw ecosystem. It transforms standard LM Studio inference into an agentic "Control Space" featuring dynamic context engineering, embedding pipelines, tool orchestration, and hardware-adaptive presets.

## 🚀 Architecture Reimagined

We have migrated away from the Next.js/Bun stack to a more robust, I/O-optimized Python backend designed for heavy inference streaming, coupled with a lightning-fast Vite React frontend.

```text
Vite React Web (http://localhost:3000)
  → Direct API Calls
  → Python FastAPI Proxy (http://localhost:3001)
  → LM Studio (http://localhost:1234)
```

### Why Python + FastAPI?
- **Native Async & `uvloop`**: 2-4x faster than standard event loops, crucial for handling high-throughput SSE (Server-Sent Events) from LLMs.
- **Hierarchical Connection Pooling**: `httpx.AsyncClient` manages concurrent requests efficiently.
- **Embedding Coalescer**: Native `asyncio.Lock` and `Future` batching deduplicates and coalesces identical text embeddings, drastically reducing GPU load.

---

## 🛠️ Features & Workflows

The web dashboard is split into focused panels designed to give you absolute control over how prompts and data flow into your local LLMs.

### 1. Control Space (Chat Interface)
A deeply customizable chat interface that goes beyond standard generation. 
- **Agentic Scenarios**: One-click UI cards that instantly reconfigure the model's System Prompt, compute parameters, and available Tools.
  - 💻 **Code Assistant**: High context, thinking mode, file-reading tools.
  - 🔬 **Deep Researcher**: Web search tools, analytical prompting.
  - 📊 **Data Analyst**: Knowledge graph querying, low temperature.
  - ⚡ **Quick Chat**: Stripped tools, low context, max speed.
- **Context Window Management**: The Python proxy automatically enforces a sliding context window (e.g., 8K, 32K) by evicting oldest messages while permanently preserving your System Prompt and a 500-token safety buffer.

### 2. Prompt & Embedding Analyzer (Gateway)
Test how the proxy interprets and transforms your queries before they hit the LLM.
- **Intent Routing**: View confidence scores as the proxy classifies your raw input.
- **MRL (Matryoshka Representation Learning)**: Select embedding dimensionalities dynamically to balance semantic depth vs. search speed.
- **Scenario Optimization Tests**: Run automated tests evaluating embedding latency and rerank quality.

### 3. Context Base
Feed the proxy's active knowledge topology for Retrieval-Augmented Generation (RAG).
- Ingest raw text, markdown, or code files directly into the vectorized database.
- Explore existing concepts, entities, and relationships stored in the proxy.

### 4. Agent Skills (Tool Registry)
View the live status of the Python proxy's built-in tool execution layer.
- Includes `file_list`, `file_read`, `web_search`, and `query_knowledge_graph`.
- When an Agentic Scenario is active, the FastAPI backend intercepts `<tool_call>` chunks from the LLM stream, pauses generation, executes the python tool, and seamlessly re-prompts the model with the result.

---

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- LM Studio running locally with at least one model loaded on port `1234`.

### 1. Start the Python Proxy Backend
```bash
cd proxy-bridge-python
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Run the proxy on port 3001
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload --loop uvloop
```

### 2. Start the Vite React Frontend
Open a new terminal window:
```bash
cd frontend-vite
npm install
npm run dev
```
Navigate to `http://localhost:3000` to access the Control Space.

---

## 🔗 Openclaw Integration

This proxy is fully compatible with Openclaw. You can point Openclaw directly to the proxy bridge by configuring your providers:

```json
"providers": {
  "custom-192-168-1-12-1234": {
    "baseUrl": "http://127.0.0.1:3001/v1",
    "api": "openai-completions",
    "models": [
      {
        "id": "qwen3.5-4b"
      }
    ]
  }
}
```
*Note: The Python proxy automatically intercepts Openclaw's custom provider prefix (`custom-192-168-1-12-1234/qwen3.5-4b`) and sanitizes it before forwarding the pure model name to LM Studio.*
