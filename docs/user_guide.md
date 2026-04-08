# User Guide

Complete workflows for the Proxy Bridge Control Space.

## Prerequisites

1. **LM Studio**: Download and install from [lmstudio.ai](https://lmstudio.ai)
2. **Node.js 18+**: For the frontend
3. **Python 3.11+**: For the proxy backend

## Quick Start

### 1. Start LM Studio
- Open LM Studio
- Start the local server (port 1234)
- Load a model (e.g., `qwen3.5-4b`)

### 2. Start the Proxy Bridge
```bash
cd proxy-bridge-python
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### 3. Start the Frontend
```bash
cd frontend-vite
npm run dev
```
Open http://localhost:5173

---

## Workflow 1: Dashboard Overview

**Purpose**: Monitor system health, connection status, and hardware metrics.

1. Navigate to the **Dashboard** panel
2. Review:
   - Bridge connection status (should show "Connected")
   - LM Studio status (should show "Connected")
   - Active models count
   - Hardware profile (CPU, GPU, RAM)
   - VRAM usage (if GPU detected)

**Expected**: All status indicators should be green/healthy.

---

## Workflow 2: Control Space (Chat)

**Purpose**: Chat with your local LLM with full parameter control.

### Basic Chat
1. Navigate to **Control Space**
2. Select a model from the dropdown
3. Type a message and press Enter
4. Watch the streaming response in real-time

### Parameter Tuning
1. Open the **Parameters** panel
2. Adjust:
   - **Temperature** (0.0-2.0): Higher = more creative, lower = more deterministic
   - **Max Tokens**: Maximum response length
   - **Context Window**: How much conversation history to include
   - **Top P**: Nucleus sampling threshold
3. Send a message to see the effect

### Model Management
1. Open the **Models** sidebar
2. Click a model to select it
3. Use load/unload buttons to manage memory
4. View model details (parameters, size, capabilities)

---

## Workflow 3: Agentic Scenarios

**Purpose**: One-click reconfiguration for different use cases.

### Using a Scenario
1. Navigate to **Control Space**
2. Open the **Scenarios** panel
3. Click a scenario card:
   - **Code Assistant**: Optimized for programming tasks
   - **Deep Researcher**: Extended context, analytical prompts
   - **Creative Writer**: Higher temperature, creative prompts
   - **Data Analyst**: Structured output, precise responses
4. The system automatically applies:
   - System prompt
   - Compute parameters (temperature, top_p, max_tokens)
   - Available tools
   - Context window size

### Creating Custom Scenarios
1. Click **Create Scenario**
2. Define:
   - Name and description
   - System prompt
   - Parameter overrides
   - Tool whitelist
3. Save and apply

---

## Workflow 4: Prompt & Embedding Analyzer

**Purpose**: Test how queries are processed before reaching the LLM.

### Intent Routing
1. Navigate to **Gateway** panel
2. Enter a test query
3. View:
   - Intent classification
   - Confidence scores
   - Routing decision

### Embedding Analysis
1. Enter text to embed
2. Select embedding dimensionality (MRL)
3. View:
   - Embedding vector
   - Similarity scores
   - Dimension reduction options

### Preset Management
1. Navigate to **Presets** section
2. **Create**: Define model parameters and system prompt
3. **Apply**: Load preset into current session
4. **Generate**: Use AI to generate optimal preset for your hardware
5. **Delete**: Remove unused presets

---

## Workflow 5: Context Base (Knowledge/RAG)

**Purpose**: Feed knowledge into the proxy for Retrieval-Augmented Generation.

### Ingesting Documents
1. Navigate to **Context Base** panel
2. Click **Ingest Document**
3. Upload text, markdown, or code files
4. Documents are vectorized and stored

### Querying Knowledge
1. The proxy automatically queries the knowledge base when relevant
2. View retrieved context in chat responses
3. Adjust retrieval parameters:
   - Top-K results
   - Minimum similarity score
   - Retrieval method (dense/sparse/hybrid)

### Exploring Knowledge Graph
1. View stored concepts and entities
2. Explore relationships between concepts
3. Manage knowledge base entries

---

## Workflow 6: Auto Tune & Performance

**Purpose**: Automatically optimize model parameters based on your hardware.

### Using Auto Tune
1. Navigate to **Dashboard** or **Presets**
2. Click the **Auto Tune** button
3. The bridge analyzes your GPU (VRAM) and CPU
4. It calculates optimal:
   - GPU layers (offloading)
   - Context window size
   - Batch size
5. Apply the generated configuration to your active model

---

## Workflow 7: Chat Testing & Benchmarking

**Purpose**: Systematic testing of model capabilities.

### Running a Chat Test
1. Navigate to **Observability** or use the **Chat Testing** tab
2. Select a test suite:
   - **Reasoning**: Logics and math tests
   - **Creativity**: Storytelling and metaphor tests
   - **Instruction Following**: Complex multi-step instructions
3. Click **Run Test**
4. View real-time metrics:
   - Tokens per second (TPS)
   - Time to first token (TTFT)
   - Total latency
5. Export results for comparison

---

## Workflow 8: Agent Skills (Tool Registry)

**Purpose**: Monitor and manage the tool execution layer.

### Viewing Tools
1. Navigate to **Agent Skills** panel
2. Review available tools:
   - `file_list`: List directory contents
   - `file_read`: Read file contents
   - `web_search`: Search the web
   - `query_knowledge_graph`: Query stored knowledge

### Tool Execution
1. When an agentic scenario is active
2. The LLM can request tool calls
3. The proxy intercepts, executes, and returns results
4. View tool execution history and success rates

---

## Workflow 7: Protocols (MCP & A2A)

**Purpose**: Manage external integrations.

### MCP Servers
1. Navigate to **Protocols** panel
2. View connected MCP servers
3. Monitor server health and available tools
4. Configure server connections

### A2A Agents
1. View agent-to-agent communication channels
2. Monitor active sessions
3. Configure agent routing

---

## Workflow 8: Observability

**Purpose**: Deep system analytics and performance monitoring.

### Tool Health
1. Navigate to **Observability** panel
2. View:
   - Tool success rates
   - Average latency per tool
   - Error trends

### Perfection Index
1. View quality metrics over time
2. Track improvement trends
3. Identify underperforming tools

### Prewarming
1. View warm-start optimization status
2. Monitor cache hit rates
3. Analyze pattern detection

### VRAM Management
1. View memory fragmentation
2. Monitor model memory usage
3. Trigger grooming if needed

### Resilience
1. View circuit breaker status
2. Monitor fallback chains
3. Configure timeout and retry settings

---

## Workflow 9: Hardware Profile

**Purpose**: Understand your system's capabilities.

1. Navigate to **Hardware** section
2. Review:
   - CPU cores and frequency
   - System RAM
   - GPU name and VRAM
   - Platform detection (Windows/Linux/macOS)
3. Use recommendations for model selection

---

## Troubleshooting

### Connection Issues
- **Bridge not connecting**: Ensure `uvicorn` is running on port 3001
- **LM Studio not connecting**: Ensure server is started on port 1234
- **Models not loading**: Check LM Studio has the model downloaded

### Performance Issues
- **Slow responses**: Reduce context window, use smaller model
- **High memory**: Unload unused models, enable VRAM grooming
- **Streaming stutter**: Check network stability, reduce concurrent requests

### CLI Test Failures
- **Health test fails**: Ensure both bridge and LM Studio are running
- **OpenAI compat fails**: Ensure a model is loaded in LM Studio
- **GPU not detected**: Install GPU drivers, check CUDA availability
