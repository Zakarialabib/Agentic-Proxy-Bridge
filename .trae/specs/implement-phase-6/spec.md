# Phase 6: Remote LM Studio & Agentic Bridge Integration Spec

## Why
With LM Studio operating remotely at `192.168.1.12:1234`, inference alone is insufficient. The proxy bridge must manage embeddings, reranking, context engineering, tool interactions, and skill routing to create a seamless agentic experience. This spec covers the remaining tasks to complete Phase 6 of the architecture plan.

## What Changes
- Implement a Context Window Manager to respect remote model token limits.
- Create a Tool Interceptor Middleware to intercept `<tool_call>` tags, execute tools locally, and re-prompt the remote LM Studio.
- Develop a RAG Intent Pipeline to connect the `EmbeddingRequestCoalescer` to user chat input, fetching relevant workspace context before querying the LLM.

## Impact
- Affected specs: Context Management, Tool Orchestration, Intent Recognition.
- Affected code: `mini-services/proxy-bridge/index.ts`, `mini-services/proxy-bridge/context-builder.ts`, `mini-services/proxy-bridge/services/tool-orchestrator.ts` (new), `mini-services/proxy-bridge/services/intent-pipeline.ts` (new).

## ADDED Requirements
### Requirement: Context Window Manager
The system SHALL dynamically truncate prompts based on the specific context window size of the remote model.

#### Scenario: Token Limit Exceeded
- **WHEN** user input and conversation history exceed the model's token limit.
- **THEN** older conversation turns are evicted while critical retrieved knowledge graph (KG) context remains injected.

### Requirement: Tool Interceptor Middleware
The system SHALL parse tool invocation XML/JSON structures on the fly *before* streaming tokens back to the user.

#### Scenario: Tool Invocation
- **WHEN** the remote LM Studio streams a `<tool_call>` tag.
- **THEN** the bridge halts the stream to the user, executes the tool locally, and automatically issues a follow-up request to LM Studio with the results.

### Requirement: RAG Intent Pipeline
The system SHALL use a fast local classifier (or regex heuristics) to decide if a user's prompt requires triggering the Reranker/Embedding flow.

#### Scenario: RAG Required
- **WHEN** the user asks a question requiring workspace context.
- **THEN** the bridge fetches relevant context using the `EmbeddingRequestCoalescer` and injects it before the LLM is queried.
