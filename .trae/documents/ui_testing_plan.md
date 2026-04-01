# Plan: UI Testing & Benchmark Integration

## Summary
Implement prefilled benchmark scenarios and testing UI for proxy-bridge capabilities (RAG, MRL slicing, standalone reranking, orchestration, and coding presets) directly into the Next.js frontend, and hook them up to real backend execution logic.

## Current State Analysis
- The UI (`src/app/page.tsx`) contains a "Chat Test Presets" section that lists presets, but the test execution result (`testResult` state) is completely unrendered, so running a test provides no visual feedback.
- The `CHAT_TEST_PRESETS` list in `mini-services/proxy-bridge/index.ts` contains generic, mocked scenarios.
- The `handleChatTestRun` endpoint in `proxy-bridge/index.ts` currently returns static mocked strings instead of actually executing the endpoints and benchmarking them.
- We have the real benchmark scenarios in `comprehensive-benchmark.ts` (RAG intent, MRL Slicing, Reranking standalone, Context Engineering & Tools).

## Proposed Changes

### 1. Update Pre-filled Benchmark Scenarios
- **File**: `mini-services/proxy-bridge/index.ts`
- Modify the `CHAT_TEST_PRESETS` array to include concrete benchmark scenarios based on recent proxy-bridge implementations:
  - `rag_intent`: "RAG Intent Pipeline" (Tests if intent pipeline routes to KG and retrieves context).
  - `context_tools`: "Context Engineering & Tools" (Tests tool call handling and agentic recursion).
  - `mrl_slicing`: "MRL Slicing (1024d)" (Tests Matryoshka dimension truncation natively).
  - `standalone_rerank`: "Standalone Reranking" (Tests cross-encoder reranker logic).
  - `orchestration`: "Unified Orchestration" (Tests the orchestration logic decision).

### 2. Connect Backend Execution Logic
- **File**: `mini-services/proxy-bridge/index.ts`
- Update `handleChatTestRun` to stop returning mocked responses. 
- Implement a switch statement based on `preset_id` that actually executes the logic:
  - For `mrl_slicing`, call `embeddingCoalescer.getEmbeddings` with dimension 1024 and return the length.
  - For `rag_intent`, run `handleGatewayTransform` or simulate a RAG chat request.
  - Ensure the response payload always contains `latency_ms`, `success` boolean, and an `output` object with the result data.

### 3. Render Test Results in UI
- **File**: `src/app/page.tsx`
- Locate the `testResult` state variable in `page.tsx` (which is currently defined but not rendered).
- Beneath the "Run Test" button inside the "Chat Test Presets" Card (around line 2030), conditionally render a results panel if `testResult` is populated.
- The UI block will use standard components (e.g., `Card`, `Badge`) to show the test status (Pass/Fail), latency, and a formatted `<pre>` code block displaying the `testResult.output` or error message for easy analysis.

## Assumptions & Decisions
- The backend `handleChatTestRun` should still gracefully handle standalone modes (e.g. return 503 for reranking or embedding timeouts) if LM Studio is disconnected, mimicking the robustness of the CLI benchmarks.
- The test results will be displayed in a JSON-like format within a `ScrollArea` for readability, similar to the existing "Gateway Inspector" output.

## Verification Steps
1. Open the UI in the browser, navigate to the Gateway/Orchestrate Tab.
2. Select "MRL Slicing (1024d)" under the Chat Test Presets section.
3. Click "Run Test".
4. Verify that a new results section appears below the button displaying a `latency_ms` value, a successful status badge, and the JSON output showing a truncated 1024-dimension embedding array.