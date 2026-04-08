

# --- Source: ARCHITECTURE_STRATEGY.md ---

**Cognitive Architecture Strategy**

Building Next-Generation AI Agent Systems

────────────────────────────────────────────────────────────

LM Studio + Qwen3 | Embeddings | Reranking | FastAPI | Vite
| April 2026
*Inspired by Qwen-Agent & qwen-code*

March 2026

**Table of Contents**

Executive Summary & The Meta-Concept 2

Technology Foundation: LM Studio + Qwen3 3

Architectural Pillar 1: Docker-Based Code Interpreter 4

Architectural Pillar 2: Subagents (Hierarchical Task Delegation) 5

Architectural Pillar 3: Skills System (Reusable Workflows) 6

Architectural Pillar 4: Hybrid Retrieval (Embeddings + LSP + Reranking)
7

Architectural Pillar 5: Browser/Vision Agent 9

Architectural Pillar 6: Hybrid Thinking Modes 10

Architectural Pillar 7: ReAct Prompting Pattern 11

Architectural Pillar 8: Memory System (Cross-Session Persistence) 12

Architectural Pillar 9: Approval Modes (Autonomy Spectrum) 13

Architectural Pillar 10: Extensible Tool Registry (MCP Integration) 14

System Architecture Overview & Integration Roadmap 15

VRAM Budget & Hardware Planning 17

Conclusion & Recommendations 18

*Note: This Table of Contents is generated via field codes. To ensure
page number accuracy after editing, please right-click the TOC and
select "Update Field."*

**1. Executive Summary & The Meta-Concept**

The core thesis of this document is straightforward but transformative:
Qwen-Agent and qwen-code demonstrate that the Large Language Model (LLM)
is **one component** in a larger cognitive architecture, not the entire
system itself. Memory, planning, tool use, sandboxing, and safety layers
work together to produce behavior that is qualitatively more capable
than a raw model API call. A proxy system should bridge LM Studio to
orchestrate this full cognitive stack. In April 2026, this system migrated 
from Bun to Python (FastAPI) to leverage Python's superior async ecosystem 
for streaming and I/O-heavy agentic workloads.


This document provides a comprehensive technology evaluation and
implementation roadmap for building a production-grade agent system on
consumer hardware (8GB VRAM) using Qwen3 models served via LM Studio's
OpenAI-compatible API. The architecture is enhanced with Qwen3-Embedding
for semantic retrieval and Qwen3-Reranker for result optimization---two
lightweight models that punch far above their weight class at
approximately 600 million parameters each.

The ten architectural pillars examined here---Docker-based code
interpretation, hierarchical subagents, reusable skills, hybrid
retrieval, browser/vision agents, hybrid thinking modes, ReAct
prompting, cross-session memory, approval modes, and extensible tool
registries via MCP---together form a comprehensive blueprint. Each
pillar is inspired directly by patterns observed in Qwen-Agent and
qwen-code, adapted for local-first deployment without cloud
dependencies.

The strategic recommendation is to treat the LLM as a reasoning engine
embedded within a software system, rather than as the system itself.
This distinction drives every architectural decision: separation of
concerns between inference and tool execution, persistence layers for
memory, safety gates for autonomous operation, and compositional
patterns for complex workflows. The result is an agent system that is
both powerful and controllable, capable of operating autonomously while
remaining transparent and auditable.

**2. Technology Foundation: LM Studio + Qwen3**

**Core Inference**

LM Studio provides OpenAI-compatible REST API endpoints
(/v1/chat/completions, /v1/embeddings) for local inference. Qwen3 series
(especially Qwen3-4B and Qwen3-8B) runs efficiently on 8GB VRAM via GGUF
quantization (Q4_K_M recommended for optimal quality-to-size ratio). LM
Studio handles model loading, context window management, and GPU
acceleration automatically, abstracting away the complexity of
llama.cpp's underlying engine.

**Embeddings & Reranking Stack**

-   Qwen3-Embedding-0.6B: Lightweight embedding model (\~600M params),
    produces 1024-dim vectors. Near OpenAI text-embedding-3-small
    performance. Runs via LM Studio embedding endpoint or separately via
    HuggingFace TEI (Text Embeddings Inference) container.

-   Qwen3-Reranker-0.6B: Instruction-aware reranker that re-scores
    candidate documents based on query-document relevance. Runs as a
    separate endpoint via TEI with cross-encoder architecture.

-   Alternative: For better quality, use Qwen3-Embedding-4B +
    Qwen3-Reranker-4B if 16GB+ VRAM is available.

-   Vector Database: Milvus (local mode via MilvusClient) or ChromaDB
    for storing embeddings. The 0.6B embedding model pairs excellently
    with Milvus for production RAG pipelines.

**Key Technical Details**

LM Studio v0.3.x exposes both chat completions and embedding endpoints
on the same port (default 1234). You can load different models for each
purpose, or use a single Qwen3 model for both (not recommended---use
specialized embedding/reranker models for optimal quality). The server
supports concurrent requests with automatic batching, making it suitable
for multi-component architectures where the agent, embedding service,
and reranker all compete for GPU resources.

A critical advantage of LM Studio is its model hot-swapping capability.
When VRAM is constrained, you can unload the embedding model after
indexing and load the reranker only during retrieval phases. This
dynamic resource management is essential for consumer hardware
deployment.

**3. Architectural Pillar 1: Docker-Based Code Interpreter**

**Qwen-Agent Pattern**

Qwen-Agent uses isolated Docker containers with Jupyter kernels for safe
Python execution. The agent writes code, submits it to Docker, and
receives stdout, stderr, and generated images back. This pattern ensures
that code execution never touches the host system, providing strong
security isolation for autonomous operation.

**Recommended Stack**

-   Docker/Podman containers with pre-built Python images (numpy,
    pandas, matplotlib, scipy)

-   Jupyter Enterprise Gateway or raw subprocess execution within
    containers

-   Container lifecycle management: create on-demand, destroy after
    timeout (300s default)

-   Resource limits: CPU shares, memory cap (512MB), no network access
    by default

**Implementation Architecture**

**User Request → Agent (LM Studio) → Generates Python Code → Docker
Executor → Results/Images → Agent → User**

The LM Studio bridge forwards code execution requests to the Docker
executor service (separate from the LLM endpoint). This separation
means: (1) inference never touches the host filesystem, (2) code
execution cannot interfere with model serving, and (3) you can run the
executor on a different machine if needed.

**Safety Critical:** Unlike direct code execution, Docker isolation
prevents the agent from accessing host files, network resources, or
system processes. This is non-negotiable for autonomous operation. Even
when the agent is in full autonomous ("YOLO") mode, code execution must
remain sandboxed.

**Technology Options**

-   Primary: Docker SDK for Python (docker-py) + custom executor service

-   Alternative: E2B (e2b.dev) sandboxed cloud environments (if local
    Docker is not available)

-   Qwen-Agent native: CodeInterpreter tool with built-in Jupyter
    integration

**4. Architectural Pillar 2: Subagents (Hierarchical Task Delegation)**

**qwen-code Pattern**

qwen-code employs specialized SubAgents for complex workflows. A parent
agent delegates to child agents with specific mandates, tool sets, and
context windows. This hierarchical decomposition allows each subagent to
focus on a narrow domain while the orchestrator maintains global
coherence across the task.

**Implementation Architecture**

-   OrchestratorAgent: Top-level agent that analyzes user requests and
    decomposes them into subtasks

-   CodeAnalyzer: Deep codebase understanding agent with LSP
    integration, symbol search

-   RefactorPlanner: Change impact analysis, dependency mapping,
    migration planning

-   TestGenerator: Test case creation, coverage analysis, assertion
    generation

-   DocWriter: Documentation generation, API doc creation, README
    maintenance

**Key Technical Decisions**

-   Each subagent gets its own conversation context (separate from
    parent)

-   Parent passes a "briefing" message (not full history) to each child

-   Children return structured results (JSON) back to parent for
    synthesis

-   All agents share the same LM Studio endpoint but with different
    system prompts and tool sets

-   Subagent calls count against the same token budget but use smaller
    context windows

**LM Studio Considerations**

Since all subagents share the same hardware, implement a queue system.
Process subagents sequentially (not in parallel) to avoid GPU contention
on consumer hardware. Track latency per subagent type to optimize which
tasks to delegate versus handle inline.

Implementation Pattern: Use a TaskGraph data structure where nodes are
subagent calls and edges represent data dependencies. The orchestrator
traverses this graph, passing outputs from completed nodes as inputs to
dependent nodes. This enables automatic parallelization where the
dependency graph allows it.

**5. Architectural Pillar 3: Skills System (Reusable Workflows)**

**qwen-code Pattern**

Skills are reusable multi-step workflow definitions, not just single
tool calls. They encode best practices as executable sequences that can
be triggered by semantic similarity to incoming requests.

**Design**

-   A Skill = ordered sequence of (tool_call, condition, fallback)
    triples

-   Skills stored as YAML/JSON definitions in a registry

-   Skills can be composed (one skill calls another as a step)

-   Skills are versioned and can be benchmarked for success rate

**Example Skills**

-   refactor-module: analyze_deps → plan_changes → apply_edits →
    run_tests → verify

-   answer-codebase-question: search_symbols → read_files → synthesize →
    cite_sources

-   debug-error: parse_stacktrace → locate_source → analyze_root_cause →
    suggest_fix

**Integration with Embeddings & Reranking**

Skills are themselves embedded and indexed. When a user request comes
in, the system first checks if a matching skill exists (via semantic
similarity of the request to skill descriptions). If confidence exceeds
a threshold, the skill is executed instead of free-form reasoning. This
dramatically reduces token usage for common patterns and improves
consistency for repetitive tasks.

**6. Architectural Pillar 4: Hybrid Retrieval (Embeddings + LSP +
Reranking)**

**The Critical Innovation**

Pure embedding search finds textually similar chunks. LSP (Language
Server Protocol) finds semantically related code. Combined with
Qwen3-Reranker, you get a three-tier retrieval system that dramatically
outperforms any single approach. This hybrid architecture is the single
most impactful technical decision for code understanding quality.

**Three-Tier Retrieval Architecture**

**Tier 1 --- Semantic Search (Qwen3-Embedding-0.6B):**

-   Chunk codebase into 512-token overlapping windows

-   Embed all chunks, store in Milvus/ChromaDB

-   On query: embed query, retrieve top-50 candidates by cosine
    similarity

-   Fast, broad recall---catches "similar looking" code

**Tier 2 --- LSP Symbol Search (pylsp/typescript-language-server):**

-   Index all symbols (classes, functions, variables, types) via LSP

-   On query: resolve symbol definitions, find all references, type
    hierarchy

-   Precise, narrow---catches "semantically related" code that
    embeddings miss

-   Example: Query for "UserService" finds all implementations, callers,
    and type aliases

**Tier 3 --- Reranking (Qwen3-Reranker-0.6B):**

-   Feed all Tier 1 + Tier 2 results through the reranker with the
    original query

-   Reranker scores each (query, document) pair for true relevance

-   Return top-10 re-scored results to the agent

**Why This Matters**

Embeddings find "text about authentication middleware." LSP finds "the
actual auth middleware class and all its callers." The reranker figures
out which of those are actually relevant to the user's specific
question. All three together achieve near-perfect retrieval for code
understanding tasks---a capability that single-method approaches simply
cannot match.

**VRAM Budget**

Qwen3-Embedding-0.6B (\~1.2GB) + Qwen3-Reranker-0.6B (\~1.2GB) +
Qwen3-4B for chat (\~3GB) = \~5.4GB total. This fits comfortably in 8GB
with room for context windows and system overhead.

**7. Architectural Pillar 5: Browser/Vision Agent**

**Qwen-Agent Pattern**

BrowserQwen, a Chrome extension in Qwen-Agent, surfs the web, reads
pages, and answers questions about current page content. It uses vision
capabilities for screenshot analysis and page understanding. This
pattern is adapted for local-first deployment.

**Local-First Adaptation**

-   Playwright (headless Chromium) as the browser automation engine

-   Separate /v1/agent/browse proxy endpoint

-   Trigger conditions: (1) User explicitly asks for web content, (2)
    Local retrieval confidence \< threshold, (3) User provides a URL

**Selective Vision Strategy**

Vision requires significantly more VRAM due to image token processing.
Only load a vision-capable model (Qwen3-4B supports vision natively)
when needed. Maintain two model states: chat-only (smaller context) and
vision-capable (larger context with image processing). LM Studio
supports hot-swapping models, so trigger a model load when vision is
actually required.

**Architecture**

**User Query → Agent → Confidence Check →**

-   \[HIGH\] → Local Retrieval → Answer

-   \[LOW\] → Browser Agent (Playwright) → Fetch Page → \[Vision if
    needed\] → Answer

**Web Search Integration**

Use Qwen3's built-in web search tool or a custom search API (Brave
Search, SearXNG) as a fallback when Playwright is overkill. Track "web
fetch" vs. "local retrieval" hit rates in analytics to optimize the
confidence threshold over time.

**8. Architectural Pillar 6: Hybrid Thinking Modes**

**Qwen3 Feature**

Qwen3 provides a native thinking mode toggle. The model uses
\<think()\>\...\</think() tags for reasoning traces, and can operate in
"thinking" or "non-thinking" modes. This allows fine-grained control
over the quality-cost tradeoff for different task types.

**Thought Budget System**

-   Quick Mode: No thinking tags, direct response. Best for factual
    queries, simple lookups. \~7+ tokens/sec on Qwen3-4B Q4_K_M.

-   Standard Mode: Single reasoning pass with \<think()\>. Good for
    multi-step reasoning, code generation. Moderate latency.

-   Deep Mode: Extended thinking with self-correction loops. Agent can
    revisit its own reasoning, catch errors. Best for architectural
    decisions, complex debugging.

**Autonomous Selection**

Implement a lightweight classifier (rule-based or a small model) that
selects thinking mode based on query complexity (token count, presence
of code blocks, multiple questions), historical data (which mode worked
best for similar queries), and user preference (remembered per-session).

**Implementation with LM Studio**

Qwen3's thinking mode is controlled via system prompt instructions. In
non-thinking mode, add "Respond directly without reasoning." In thinking
mode, add "Think step by step before answering." The model's native
\<think()\> tags handle the rest. Log latency, token usage, and user
satisfaction per mode to build a model of which task types actually
benefit from deep thinking versus wasted compute.

**9. Architectural Pillar 7: ReAct Prompting Pattern**

**Qwen-Agent Core**

Qwen-Agent uses the ReAct (Reasoning + Acting) loop as its core
interaction pattern. The agent thinks, acts (tool call), observes (tool
result), and repeats until it has enough information to answer. This
loop is the foundational reasoning framework upon which all other
architectural pillars build.

**Session State Architecture**

**The ReAct loop operates as a structured conversation flow:**

-   Thought: "I need to find the authentication middleware
    configuration"

-   Action: { tool: "retriever", input: { query: "auth middleware
    config" } }

-   Observation: "Found 3 files: auth.py, middleware.py, config.py"

-   Thought: "middleware.py likely has the setup. Let me read it."

-   Action: { tool: "file_reader", input: { path: "src/middleware.py" }
    }

-   Observation: "class AuthMiddleware: def \_\_init\_\_(self,
    config)\..."

-   Answer: "The authentication middleware is configured in
    src/middleware.py\..."

**Why ReAct Matters**

-   Explicit reasoning traces make debugging possible---you can see
    exactly WHY the agent called each tool

-   Users can intervene mid-loop (stop the agent before it takes a wrong
    action)

-   Trajectories can be stored and reused for similar future queries

**Implementation with LM Studio**

Use the chat completions API with tool definitions. Each ReAct step is a
regular API call. The "thought" is in the assistant message, the
"action" is a tool call, and the "observation" is the tool result fed
back as a message pair. Set a hard limit (default: 15 tool calls per
query) to prevent infinite loops. Include a "give up and summarize what
you know" fallback.

**10. Architectural Pillar 8: Memory System (Cross-Session
Persistence)**

**qwen-code Pattern**

qwen-code maintains context across sessions---not just conversation
history, but learned facts about the user and project. This persistent
context is what transforms an agent from a stateless chatbot into a true
development partner that improves with every interaction.

**Three-Tier Memory Architecture**

**Tier 1 --- Working Memory (per-session):**

-   Current conversation context

-   Active file list, open tabs

-   Recent tool call results

-   Stored in RAM, cleared on session end

**Tier 2 --- Project Memory (persistent):**

-   Key project facts: tech stack, coding conventions, architecture
    patterns

-   User preferences: "prefers async/await over promises," "uses tabs
    not spaces"

-   Frequently accessed files and their purposes

-   Stored in SQLite (project_memory.db), updated as agent learns

**Tier 3 --- Episodic Memory (searchable):**

-   Past ReAct trajectories that succeeded or failed

-   Solutions to previously solved problems

-   Embedded and indexed for semantic search

-   When agent encounters similar problem, retrieve relevant past
    trajectories

**ACE (Active Context Engineering) Integration**

Context injection evolves from simple "include relevant files" to
"inject relevant past experiences + project knowledge + user
preferences." The embeddings/reranking system (Tier 3) powers semantic
retrieval of past episodes, enabling the agent to learn from its own
history.

**Memory Compaction**

Not everything should be remembered forever. Implement a decay
function---memories that haven't been recalled in N sessions get lower
priority. Critical facts (tech stack, user preferences) are pinned and
never decay. This ensures the memory system remains relevant without
growing unbounded.

**11. Architectural Pillar 9: Approval Modes (Autonomy Spectrum)**

**qwen-code Pattern**

qwen-code provides \--yolo (full auto) versus step-by-step approval
modes. This spectrum is essential for real-world deployment where the
tradeoff between agent autonomy and safety must be explicitly managed.

**Three-Tier Safety Model**

**Autonomous (Green):**

-   Read-only tools: retriever, file_reader, symbol_search

-   Browser fetch, documentation lookup

-   Embedding/reranking queries

-   Always auto-approved, no user confirmation needed

**Supervised (Yellow):**

-   Write tools: file_editor, code_executor (read-only mode)

-   Subagent delegation

-   Memory updates

-   Agent proposes action, user approves/rejects/modifies

**Manual (Red):**

-   Destructive tools: file_delete, git_force_push, database writes

-   Code execution with network access

-   System configuration changes

-   Requires explicit confirmation + confirmation of consequences

**Dynamic Escalation**

When anomaly detection flags unusual behavior (e.g., agent trying to
delete many files, accessing unfamiliar directories), automatically
escalate from Autonomous to Supervised mode. Log the escalation reason
for audit trail. Each tool registration includes a safety_level field.
The approval gate checks this level against the current global mode
before executing. The webapp GUI shows a visual indicator of current
mode and a feed of pending approvals.

**12. Architectural Pillar 10: Extensible Tool Registry (MCP
Integration)**

**Qwen-Agent Pattern**

Qwen-Agent registers tools via the \@register_tool decorator with JSON
schema, auto-extracting docstrings and type hints. This pattern makes
tool creation frictionless while ensuring consistent documentation.

**The MCP Factor**

Model Context Protocol (MCP) has emerged as the standard for connecting
LLMs to external tools and data sources (2025--2026). Qwen-Agent,
qwen-code, Claude Code, and other major agent frameworks all support
MCP. Your system should adopt MCP as the primary tool integration
mechanism.

**Tool Registry Architecture**

-   Core Tools (built-in): retriever, file_reader, file_editor,
    code_executor

-   LSP Tools: symbol_search, find_references, type_hierarchy

-   MCP Tools (external): GitHub, Jira, Slack, Database, Custom

-   Skill Tools (composite): refactor_module, debug_error,
    generate_tests

**Implementation Pattern**

The decorator system generates OpenAPI-style documentation from the
function signature, type hints, and docstring. This documentation is:
(1) embedded for skill matching, (2) included in the agent's tool
descriptions, (3) served via the webapp for user reference. Example: a
search_codebase tool with semantic search, LSP resolution, and reranking
capabilities, registered with safety level "autonomous."

**MCP Server Integration**

Wrap your core tools as an MCP server. This allows any MCP-compatible
client (Claude Desktop, VS Code Copilot, etc.) to use your agent's
tools. Conversely, connect to external MCP servers to extend your
agent's capabilities without writing custom integration code. This
bidirectional MCP support future-proofs the tool ecosystem.

**13. System Architecture Overview & Integration Roadmap**

**Integration Table**

The following table maps all ten architectural pillars to specific
technologies, implementation priorities, and dependencies:

  ---------------------------------------------------------------------------------------------------
  **Qwen           **Your         **Recommended Tech   **Priority**   **VRAM       **Dependencies**
  Inspiration**    Component**    Stack**                             Impact**     
  ---------------- -------------- -------------------- -------------- ------------ ------------------
  Docker Code      Code Executor  Docker SDK +         P1 (High)      None         Docker installed
  Interpreter      Service        Jupyter + subprocess                (separate)   

  SubAgents        Agent          Custom Python with   P1 (High)      None (shared Tool registry
                   Orchestrator   TaskGraph                           model)       

  Skills System    Skills         YAML definitions +   P2 (Medium)    \~50MB       Embeddings,
                   Registry + ACE embedding index                     (index)      Retrieval

  LSP Integration  Hybrid         pylsp /              P1 (High)      None         Language servers
                   Retrieval Tier ts-language-server                  (separate    
                   2                                                  process)     

  Browser/Vision   Browse         Playwright +         P2 (Medium)    +2GB (vision Playwright
  Agent            Endpoint       optional vision                     mode)        installed
                                  model                                            

  Thinking Modes   Mode           Prompt engineering + P1 (High)      None         Base model
                   Controller     classifier                                       

  ReAct Loop       Session State  Custom trajectory    P1 (High)      None         Tool registry
                   Manager        tracker                                          

  Memory System    Memory Store   SQLite + embedding   P2 (Medium)    \~100MB      Embeddings
                                  index                               (index)      

  Approval Modes   Safety Gate    Per-tool metadata +  P1 (High)      None         Tool registry
                                  UI                                               

  MCP Tool         Tool System    MCP SDK + decorator  P1 (High)      None         MCP servers
  Registry                        pattern                                          
  ---------------------------------------------------------------------------------------------------

*Table 1: Integration Roadmap --- Ten Architectural Pillars*

**Implementation Phases**

**Phase 1 (Weeks 1--3): Foundation**

-   LM Studio setup, base ReAct agent, Docker executor, core tools

**Phase 2 (Weeks 4--6): Intelligence**

-   Embeddings/reranking pipeline, LSP integration, memory system

**Phase 3 (Weeks 7--9): Autonomy**

-   Subagents, skills system, thinking modes, approval modes

**Phase 4 (Weeks 10--12): Polish**

-   Browser agent, MCP integration, observability dashboard, performance
    tuning

**14. VRAM Budget & Hardware Planning**

**8GB VRAM Allocation**

The following table details the full VRAM allocation for an 8GB consumer
GPU setup:

  -------------------------------------------------------------------------------------------
  **Component**          **Model**              **Quantization**   **VRAM      **Purpose**
                                                                   Usage**     
  ---------------------- ---------------------- ------------------ ----------- --------------
  Qwen3-4B (Chat)        Qwen3-4B-Instruct      Q4_K_M             \~3.2GB     Primary
                                                                               inference

  Qwen3-Embedding-0.6B   Qwen3-Embedding-0.6B   Q4_K_M             \~0.8GB     Code
                                                                               embeddings

  Qwen3-Reranker-0.6B    Qwen3-Reranker-0.6B    Q4_K_M             \~0.8GB     Result
                                                                               reranking

  Context Windows        Shared                 ---                \~1.5GB     KV cache for
                                                                               all models

  System Overhead        CUDA/OS                ---                \~0.7GB     GPU memory
                                                                               management

  Total                  ---                    ---                \~7.0GB     \~1GB headroom
                                                                               remaining
  -------------------------------------------------------------------------------------------

*Table 2: VRAM Budget for 8GB Consumer GPU Configuration*

**Scaling Options**

-   8GB VRAM (RTX 3060/4060): Run all components as shown. Functional
    but limited context.

-   12GB VRAM (RTX 3060 12GB/4070): Upgrade to Qwen3-8B for chat. Larger
    context windows.

-   16GB VRAM (RTX 4080/5060 Ti): Run Qwen3-Embedding-4B +
    Qwen3-Reranker-4B. Best quality.

-   24GB+ VRAM (RTX 4090): Run Qwen3-32B or multiple models
    simultaneously. Production tier.

**Memory Management Strategy**

LM Studio supports model hot-swapping. Keep the chat model loaded
permanently. Load embedding/reranker models on-demand and cache them.
When vision is needed, temporarily unload the reranker and load the
vision-capable variant. This dynamic loading strategy maximizes the
utility of limited VRAM while ensuring the primary inference path is
always available.

**15. Conclusion & Recommendations**

This document has outlined a comprehensive architecture for building
next-generation AI agent systems using locally-served Qwen3 models via
LM Studio. The following strategic recommendations summarize the key
takeaways:

1.  Start with LM Studio + Qwen3-4B as the foundation---it provides the
    most mature OpenAI-compatible local inference experience.

2.  Add Qwen3-Embedding-0.6B + Qwen3-Reranker-0.6B for the retrieval
    stack---these punch far above their weight class at 600M parameters.

3.  Implement ReAct as the core reasoning loop BEFORE adding
    subagents---master the basics first.

4.  Use Docker isolation for code execution from day one---safety is not
    optional.

5.  Adopt MCP for tool integration---it is becoming the industry
    standard and future-proofs your system.

6.  Build the three-tier retrieval system (embeddings + LSP +
    reranking)---this is your competitive advantage over naive RAG.

7.  Implement thinking modes as a cost/quality dial---not everything
    needs deep reasoning.

8.  Layer on subagents and skills after the foundation is solid---they
    amplify but depend on the base system.

The meta-principle: treat the LLM as one component in a cognitive
architecture, not the entire system. Memory, planning, retrieval,
safety, and observability are equally important. By following this
principle and the roadmap outlined in this document, you can build an
agent system that is powerful, safe, and practical---running entirely on
consumer hardware without cloud dependencies.



# --- Source: PROS_CONS.md ---

- **Clear Separation**: API layer is distinct from presentation layer
- **Easier Testing**: Can test proxy independently with curl/Postman
- **Deployment Options**: Can deploy to different servers if needed

#### Cons ❌
- **Complexity**: Two services to manage and monitor
- **CORS Required**: Cross-origin requests need gateway configuration
- **Memory Overhead**: Two runtime environments
- **Startup Coordination**: Need to ensure both services are running
- **Development Context Switching**: Developers need to understand both codebases

#### Verdict
**Worth it for production use**. The separation provides critical flexibility for scaling and maintenance. For simpler use cases, consider merging into a single Next.js API route.

---

### 2. SQLite for Persistence

**Decision**: Use SQLite (via Bun's built-in support) for all persistence needs.

#### Pros ✅
- **Zero Configuration**: No external database server to install
- **File-Based**: Easy backup, migration, and version control
- **Bun Integration**: Native, fast SQLite bindings
- **ACID Compliance**: Reliable transactions
- **Embeddable**: No network overhead
- **Single File**: Easy to copy/move databases
- **Excellent for Development**: Fast iteration without DB setup

#### Cons ❌
- **Single Writer**: Write concurrency limitations
- **No Built-in Replication**: Need manual backup strategies
- **Limited Scalability**: Not suitable for high-volume production
- **No Native JSON Queries**: Less flexible than PostgreSQL JSONB
- **Memory Constraints**: Large databases can consume RAM

#### Verdict
**Excellent for current use case**. Perfect for single-user or small-team scenarios. Consider PostgreSQL migration for high-volume production.

---

### 3. Three-Time Horizon Observability (Now/Recent/Deep)

**Decision**: Organize observability data into three temporal windows instead of traditional real-time monitoring.

#### Pros ✅
- **Intuitive Understanding**: Matches human cognition of time
- **Actionable Insights**: 
  - NOW: Immediate actions (alerts, anomalies)
  - RECENT: Pattern recognition (trends, optimization)
  - DEEP: Strategic decisions (evolution, learning)
- **Storage Efficiency**: Can age out detailed data
- **Cognitive Load Reduction**: Information at appropriate granularity
- **Novel Approach**: Differentiates from generic monitoring tools

#### Cons ❌
- **Learning Curve**: Users expect traditional dashboards
- **Fixed Boundaries**: 5-minute and 24-hour windows may not fit all use cases
- **Data Loss Risk**: Aggregation can hide important details
- **Implementation Complexity**: Multiple data structures and queries

#### Verdict
**Innovative and valuable**. The three-horizon approach provides better decision support than traditional monitoring. Consider making time boundaries configurable.

---

### 4. VRAM Personality Modes (Generous/Stingy/Emergency)

**Decision**: Implement adaptive VRAM management with three distinct "personalities".

#### Pros ✅
- **Automatic Adaptation**: No manual intervention needed
- **User-Friendly Metaphor**: "Generous" and "Stingy" are intuitive
- **Clear Trade-offs**: Each mode has defined behavior
- **Safety Net**: Emergency mode prevents crashes
- **Transparent**: Users can see and override the current mode

#### Cons ❌
- **Mode Thrashing**: Rapid switching between modes
- **False Positives**: Unnecessary evictions
- **Oversimplified**: Real VRAM management is more nuanced
- **GPU-Specific**: Different GPUs have different optimal behaviors

#### Verdict
**Good abstraction for most users**. Power users may want fine-grained control. Consider adding custom thresholds.

---

### 5. MCP/A2A Dual Protocol Support

**Decision**: Support both Model Context Protocol (MCP) and Agent-to-Agent (A2A) protocols with intelligent routing.

#### Pros ✅
- **Maximum Compatibility**: Works with MCP tools and A2A agents
- **Future-Proof**: Both protocols are emerging standards
- **Intelligent Routing**: Automatic selection based on task characteristics
- **Fallback Chain**: MCP → A2A → Local ensures resilience
- **Ecosystem Access**: Can leverage both tool and agent ecosystems

#### Cons ❌
- **Complexity**: Two protocol implementations to maintain
- **Translation Overhead**: Converting between protocol formats
- **Feature Parity**: Hard to ensure equal support for both
- **Debugging Challenge**: Issues can occur in either protocol layer

#### Verdict
**Strategic advantage**. As both protocols evolve, supporting both provides maximum flexibility. Monitor adoption rates and potentially deprecate the less popular one.

---

### 6. Knowledge Graph for Documentation

**Decision**: Transform documentation into a navigable knowledge topology rather than simple vector search.

#### Pros ✅
- **Relationship Discovery**: Find related concepts, not just similar text
- **Multi-hop Traversal**: Explore connected ideas
- **Semantic Understanding**: Concepts, not just keywords
- **Self-Organizing**: Relationships emerge from content
- **Transparent**: Can visualize and understand the graph

#### Cons ❌
- **Extraction Quality**: Depends on pattern matching accuracy
- **Maintenance**: Graph can become stale or noisy
- **Memory Overhead**: Storing graph structure
- **Query Complexity**: Graph traversal is slower than vector search

#### Verdict
**Valuable for documentation-heavy projects**. Consider combining with vector search for hybrid retrieval.

---

### 7. Preset Lineage System

**Decision**: Treat presets as living entities with parents, children, and evolution tracking.

#### Pros ✅
- **Experimentation Safety**: Test variants without losing original
- **Evolution Tracking**: See how presets improved over time
- **A/B Testing**: Compare related presets
- **Rollback Capability**: Return to successful ancestors
- **Inheritance**: Child presets inherit from parents

#### Cons ❌
- **Complexity**: More state to manage
- **Storage Overhead**: Storing full lineage history
- **Decision Fatigue**: Many preset variants can confuse users
- **Pruning Needed**: Need to clean up unsuccessful variants

#### Verdict
**Excellent for power users**. Consider hiding lineage from casual users and exposing through "Advanced" section.

---

### 8. Tool Social Entities (Relationships Between Tools)

**Decision**: Model tools as social entities with dependencies, substitutions, conflicts, and synergies.

#### Pros ✅
- **Intelligent Suggestions**: "Users who called this tool also called..."
- **Conflict Detection**: Warn about incompatible tools
- **Substitution Finding**: Find alternatives when tools fail
- **Optimization Discovery**: Find synergistic combinations
- **Novel Perspective**: Tools as organisms in an ecosystem

#### Cons ❌
- **Learning Period**: Relationships emerge slowly from usage
- **False Correlations**: May suggest unhelpful combinations
- **Cold Start**: New tools have no relationships
- **Computational Overhead**: Tracking all relationships

#### Verdict
**Innovative and useful**. Consider adding manual relationship definitions to supplement learned relationships.

---

### 9. Session Narrative (Five-Act Structure)

**Decision**: Model sessions as stories with Opening, Rising Action, Climax, Resolution, and Denouement phases.

#### Pros ✅
- **Intuitive Progress Tracking**: Users understand story structure
- **Natural Pacing**: Matches human problem-solving patterns
- **Quality Metrics**: Can measure narrative completeness
- **User Engagement**: Gamification through story progression
- **Session Summary**: Easy to explain what happened

#### Cons ❌
- **Not All Sessions Fit**: Some tasks are simple Q&A
- **Phase Detection**: Difficult to accurately detect transitions
- **Cultural Variations**: Story structures vary by culture
- **Over-simplification**: Complex sessions may not fit linear narrative

#### Verdict
**Creative and engaging**. Works best for complex, multi-step tasks. Consider hiding for simple chat sessions.

---

### 10. Failure Learning System (Six-Stage Flow)

**Decision**: Route failures through Detect → Characterize → Respond → Record → Explain → Learn stages.

#### Pros ✅
- **Systematic Handling**: Consistent failure treatment
- **Learning from Mistakes**: System improves over time
- **Transparency**: Users see what went wrong and why
- **Automatic Remediation**: Built-in fallback strategies
- **Knowledge Base**: Builds failure patterns library

#### Cons ❌
- **Overhead**: Not all failures need full six stages
- **False Learning**: May learn incorrect patterns
- **Complexity**: Many code paths for failure handling
- **User Patience**: Six stages take time

#### Verdict
**Essential for production robustness**. Consider fast-path for simple failures (network timeout → retry immediately).

---

### 11. Gateway Transformation Layer

**Decision**: Transform every input through Intent Detection → Context Enrichment → Instruction Prefixing → Reranking.

#### Pros ✅
- **Consistent Quality**: Every query is optimized
- **Transparency**: Users can see the transformation
- **Learning Opportunity**: System learns from transformations
- **Customization**: Presets can define transformations
- **Agent-Ready Output**: Output format optimized for agents

#### Cons ❌
- **Latency**: Additional processing steps
- **Token Overhead**: Enriched context uses tokens
- **Wrong Detection**: Misidentified intent can hurt results
- **Complexity**: Many interacting components

#### Verdict
**Worth the overhead for quality-critical applications**. Consider bypass for simple, obvious queries.

---

### 12. Settings as Dialog (Not Separate Page)

**Decision**: Implement settings as a modal dialog rather than a separate page.

#### Pros ✅
- **Context Preservation**: Users don't lose their place
- **Immediate Feedback**: See changes reflected immediately
- **Simpler Navigation**: No need for settings URL
- **Consistent with Modern UIs**: Follows common patterns

#### Cons ❌
- **Limited Space**: Can't show as much information
- **No Direct Linking**: Can't share settings URL
- **Scroll on Mobile**: Too many settings for small screens
- **Discovery**: Some users expect settings in navigation

#### Verdict
**Good for current scope**. Consider adding keyboard shortcut (?) to open settings quickly.

---

## Summary Table

| Decision | Pros Weight | Cons Weight | Net Score | Recommendation |
|----------|-------------|-------------|-----------|----------------|
| Mini-Service Architecture | 8 | 4 | +4 | Keep |
| SQLite Persistence | 7 | 3 | +4 | Keep, consider Postgres for scale |
| Three-Time Horizon | 8 | 3 | +5 | Keep, make configurable |
| VRAM Personality Modes | 6 | 3 | +3 | Keep, add custom thresholds |
| MCP/A2A Dual Protocol | 7 | 3 | +4 | Keep, monitor adoption |
| Knowledge Graph | 7 | 3 | +4 | Keep, add hybrid search |
| Preset Lineage | 6 | 3 | +3 | Keep, hide from casual users |
| Tool Social Entities | 6 | 3 | +3 | Keep, add manual definitions |
| Session Narrative | 5 | 3 | +2 | Keep, hide for simple sessions |
| Failure Learning | 7 | 3 | +4 | Keep, add fast-path |
| Gateway Transformation | 7 | 3 | +4 | Keep, add bypass option |
| Settings Dialog | 6 | 3 | +3 | Keep |

## Key Takeaways

1. **Abstractions Pay Off**: Novel abstractions (Three Horizon, VRAM Personality, Tool Social Entities) provide value beyond traditional approaches

2. **Transparency is Critical**: All major decisions should be visible to users (transformation log, narrative progress, failure stages)

3. **Graceful Degradation**: Every complex feature should have a simpler fallback (fast reranker, local tools, independent mode)

4. **Learning Systems Need Time**: Features like tool relationships and preset lineage improve with usage

5. **User Control Remains Important**: Automatic features should have manual override options

---

## Future Considerations

When evaluating new features, ask:

1. **Does it have transparent behavior?**
2. **Does it degrade gracefully?**
3. **Does it learn and improve over time?**
4. **Does it map to user mental models?**
5. **Does it have appropriate complexity for the value?**



# --- Source: QWEN_CODING_AGENT_GUIDE.md ---

# Qwen Coding-Agent Guide

This guide extracts the actionable parts of the architecture documents and adapts them for day-to-day implementation.

## 1) Target Outcome

Build a local-first coding agent where LM Studio serves Qwen models and the proxy bridge provides:

- OpenAI-compatible interfaces for clients.
- Strong tool calling and orchestration.
- Retrieval-grounded context for code tasks.
- Observable, debuggable inference behavior.

## 2) Baseline Model Topology

- `LLM`: Qwen3-4B (reasoning + tool planning).
- `Embedding`: Qwen3-Embedding-0.6B.
- `Reranker`: Qwen3-Reranker-0.6B.

For higher quality and larger VRAM:

- Upgrade embedding and reranker to 4B variants.

## 3) Context Engineering Pipeline (Coding)

Use a deterministic pipeline before calling chat completion:

1. Normalize input messages.
2. Extract coding intent (debug/refactor/explain/generate/test).
3. Build retrieval query from task + current file hints.
4. Retrieve candidate chunks (docs/code/tool outputs).
5. Rerank candidates.
6. Apply context budget policy (hard cap with stable truncation).
7. Compose final prompt block:
   - policy instructions
   - grounded context
   - user task
8. Call model and track usage + latency.

## 4) Tool-Calling Guardrails

- Pass tool schemas explicitly and preserve role semantics end-to-end.
- Require structured arguments (JSON) and validate before execution.
- Return tool outputs in bounded size; summarize large outputs.
- Record tool success/failure + duration for observability.
- Apply approval mode gates for risky operations.

## 5) Retrieval for Code Tasks

Prefer hybrid retrieval:

- Semantic recall from embeddings.
- Symbol-level precision from code-aware indexing (when available).
- Rerank with query-document scoring.

Use retrieval tiers by complexity:

- Simple ask: minimal retrieval.
- Multi-file ask: medium retrieval.
- Refactor/debug ask: high retrieval + rerank + tool outputs.

## 6) Webapp UX Requirements

For dashboard and chat pages, prioritize:

- Clear connection state for webapp/proxy/LM Studio.
- Active model and loaded models visibility.
- Inference quality metrics:
  - request latency
  - completion latency
  - tool-call success rate
  - fallback rate
- Error states with direct next actions (reconnect/load model/retry).

## 7) High-Impact Improvements Backlog

1. Replace heavy polling with websocket/event stream updates.
2. Add a compact "context used" panel (sources + token budget usage).
3. Add endpoint contract tests for chat/embeddings/rerank/orchestrate.
4. Add scenario tests for coding loops (tool call -> observation -> final answer).
5. Add fallback diagnostics when LM Studio is unavailable.

## 8) Operational Checklist

Before shipping:

- Run proxy tests (`bun test` in proxy bridge).
- Validate frontend build and type checks.
- Verify key endpoints manually:
  - `/api/proxy/v1/chat/completions`
  - `/api/proxy/v1/embeddings`
  - `/api/proxy/v1/rerank`
  - `/api/proxy/v1/agent/orchestrate`
- Validate dashboard behavior with proxy up/down transitions.
