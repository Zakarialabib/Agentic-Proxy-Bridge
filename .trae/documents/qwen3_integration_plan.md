# Plan: Qwen3 Embedding and Reranker Integration

## Summary
The goal of this task is to align the proxy-bridge ecosystem fully with the Qwen3 Embedding and Reranking models, as specified by the Qwen3 Embedding paper (arXiv:2506.05176). The core focus is on implementing "Instruction Aware" retrieval and "Matryoshka Representation Learning" (MRL) dimension slicing natively within the bridge, while replacing all legacy fallbacks to Nomic embeddings.

## Current State Analysis
- **Embeddings**: `text-embedding-nomic-embed-text-v1.5` is still hardcoded as the default fallback in several areas (`handleEmbeddings`, `handleChatCompletions`).
- **Reranker**: Typos exist in the model names (`qwen3-rerank-4b` instead of `qwen3-reranker-4b`) within `RERANKER_CONFIGS`.
- **MRL**: The system has predefined `MRL_PRESETS` up to 1536 dimensions, but `Qwen3-Embedding-4B` supports up to 2560. MRL truncation and L2-normalization are not actively applied to the outgoing embedding responses.
- **Instruction Aware**: The `applyPresetTransformation` simulates instruction awareness for UI logs, but the actual RAG pipeline in `handleChatCompletions` embeds raw queries without task-specific instructions.

## Proposed Changes

### 1. Sync Branch
- **Action**: Run `git pull origin main` to ensure the workspace reflects the merged `trae/solo-agent-UxLPnx` branch.

### 2. Configuration Updates
- **File**: `opencode.json`
  - Remove `text-embedding-nomic-embed-text-v1.5` and ensure the `embedding` model defaults to `text-embedding-qwen3-embedding-4b`.
  - Fix the reranker keys to `qwen3-reranker-0.6b` and `qwen3-reranker-4b`.

### 3. Implement Instruction-Aware Retrieval
- **File**: `mini-services/proxy-bridge/index.ts`
  - In `handleChatCompletions` RAG flow: Instead of batching raw `userContent`, dynamically prepend an instruction prefix to the query based on the `intentPipeline` result.
  - For example:
    - `rag_codebase` -> `"Retrieve code implementing: "`
    - `rag_docs` -> `"Find documentation explaining: "`
    - `rag_architecture` -> `"Retrieve architecture documentation for: "`
    - General/Fallback -> `"Given a web search query, retrieve relevant passages that answer the query: "`
  - Document chunks will remain prefix-free, honoring the asymmetric architecture highlighted in the Qwen paper.

### 4. Implement Native MRL (Matryoshka Representation Learning) Slicing
- **File**: `mini-services/proxy-bridge/index.ts`
  - Update `MRL_PRESETS` to include an `extreme` configuration for 2560 dimensions to support the `4B` model fully.
  - In `handleEmbeddings`: If the `dimensions` parameter is provided in the request body, slice the retrieved `number[]` array to the requested dimension.
  - Crucially, apply **L2-Normalization** to the truncated array before returning the payload, ensuring accurate cosine similarity calculations downstream.

### 5. Cleanup Hardcoded Nomic Dependencies
- **File**: `mini-services/proxy-bridge/index.ts`
  - Replace all fallback instances of `text-embedding-nomic-embed-text-v1.5` with `text-embedding-qwen3-embedding-4b`.
  - Fix the typo in `RERANKER_CONFIGS` (lines ~625-626) to use `qwen3-reranker-0.6b` and `qwen3-reranker-4b`.

## Verification Steps
1. The project compiles successfully without TypeScript errors.
2. An embedding request specifying `dimensions: 1024` to `/v1/embeddings` returns a normalized vector of exactly 1024 floats.
3. The server logs in `handleChatCompletions` show the `[IntentPipeline]` properly appending the `Retrieve code implementing:` style instructions to queries before embedding.
