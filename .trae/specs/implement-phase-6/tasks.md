# Tasks
- [x] Task 1: Create Context Window Manager
  - [x] SubTask 1.1: Implement token counting/estimation utility for Qwen/Llama models.
  - [x] SubTask 1.2: Update `context-builder.ts` to enforce dynamic token limits based on model preset configurations.
  - [x] SubTask 1.3: Implement eviction strategy (oldest messages first, preserving system prompt and critical RAG context).
- [x] Task 2: Develop Tool Interceptor Middleware
  - [x] SubTask 2.1: Create `mini-services/proxy-bridge/services/tool-orchestrator.ts`.
  - [x] SubTask 2.2: Implement stream parser in `index.ts` to intercept `<tool_call>` or JSON tool invocations from LM Studio's response stream.
  - [x] SubTask 2.3: Integrate local tool execution (e.g., `file_read`) within `tool-orchestrator.ts`.
  - [x] SubTask 2.4: Implement automatic re-prompting to LM Studio with tool results.
- [x] Task 3: Build RAG Intent Pipeline
  - [x] SubTask 3.1: Create `mini-services/proxy-bridge/services/intent-pipeline.ts`.
  - [x] SubTask 3.2: Implement regex-based or lightweight local classification to detect intent requiring RAG.
  - [x] SubTask 3.3: Connect intent detection to `EmbeddingRequestCoalescer` and `handleRerank` logic before passing the prompt to the LLM.

# Task Dependencies
- Task 2 depends on the existing LM Studio connection pool and streaming logic.
- Task 3 depends on the `EmbeddingRequestCoalescer` (already implemented).
