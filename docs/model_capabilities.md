# Model Capabilities Matrix

Comprehensive capability overview for models supported by LM Studio and the Proxy Bridge.

## Capability Categories

### 1. Chat & Conversation

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Basic Q&A | Simple question answering | 1B+ |
| Multi-turn Chat | Maintaining conversation context | 3B+ |
| Role Playing | Character/persona maintenance | 7B+ |
| Complex Dialogue | Nuanced multi-party conversations | 13B+ |

### 2. Code Generation

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Code Completion | Autocomplete code snippets | 3B+ |
| Code Generation | Generate functions from description | 7B+ |
| Code Review | Identify bugs and suggest improvements | 7B+ |
| Refactoring | Restructure existing code | 13B+ |
| Architecture Design | System design and patterns | 34B+ |

### 3. Tool Usage

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Function Calling | Structured tool invocation | 7B+ |
| Parallel Tools | Multiple simultaneous tool calls | 13B+ |
| Tool Chaining | Sequential tool execution | 13B+ |
| Dynamic Tool Selection | Choosing appropriate tools | 34B+ |

### 4. Embeddings

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Text Embedding | Convert text to vectors | Embedding model |
| Semantic Search | Find similar content | Embedding model |
| MRL Support | Multi-resolution embeddings | MRL-capable model |
| Batch Embedding | Multiple texts at once | Embedding model |

### 5. Reasoning

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Basic Logic | Simple logical deductions | 3B+ |
| Math | Mathematical problem solving | 7B+ |
| Chain of Thought | Step-by-step reasoning | 13B+ |
| Complex Analysis | Multi-factor analysis | 34B+ |

### 6. Content Creation

| Capability | Description | Model Requirements |
|------------|-------------|-------------------|
| Short Form | Tweets, headlines, summaries | 3B+ |
| Long Form | Articles, essays, stories | 7B+ |
| Technical Writing | Documentation, specs | 13B+ |
| Creative Writing | Fiction, poetry, scripts | 7B+ |

---

## Popular Model Capabilities

### Qwen Series

| Model | Chat | Code | Tools | Embeddings | Reasoning | VRAM |
|-------|------|------|-------|------------|-----------|------|
| Qwen2.5-1.5B | Basic | Limited | No | No | Basic | 2GB |
| Qwen2.5-3B | Good | Moderate | Basic | No | Moderate | 4GB |
| Qwen2.5-7B | Excellent | Good | Good | No | Good | 8GB |
| Qwen2.5-14B | Excellent | Excellent | Excellent | No | Excellent | 16GB |
| Qwen2.5-32B | Expert | Expert | Expert | No | Expert | 32GB |

### Llama Series

| Model | Chat | Code | Tools | Embeddings | Reasoning | VRAM |
|-------|------|------|-------|------------|-----------|------|
| Llama-3.2-1B | Basic | Limited | No | No | Basic | 2GB |
| Llama-3.2-3B | Good | Moderate | Basic | No | Moderate | 4GB |
| Llama-3.1-8B | Excellent | Good | Good | No | Good | 8GB |
| Llama-3.1-70B | Expert | Expert | Expert | No | Expert | 40GB+ |

### Mistral Series

| Model | Chat | Code | Tools | Embeddings | Reasoning | VRAM |
|-------|------|------|-------|------------|-----------|------|
| Mistral-7B | Good | Good | Good | No | Good | 8GB |
| Mixtral-8x7B | Excellent | Excellent | Excellent | No | Excellent | 32GB |

### Embedding Models

| Model | Dimensions | MRL | Max Tokens | VRAM |
|-------|-----------|-----|------------|------|
| nomic-embed-text | 768 | Yes | 8192 | 1GB |
| bge-large-en | 1024 | No | 512 | 2GB |
| e5-large-v2 | 1024 | No | 512 | 2GB |

---

## Recommended Models by Use Case

### Best for Coding

| Rank | Model | Why |
|------|-------|-----|
| 1 | Qwen2.5-32B | Excellent code understanding |
| 2 | Qwen2.5-14B | Great balance of quality/speed |
| 3 | Llama-3.1-8B | Good general coding ability |

### Best for Chat

| Rank | Model | Why |
|------|-------|-----|
| 1 | Llama-3.1-70B | Most natural conversations |
| 2 | Qwen2.5-32B | Excellent dialogue |
| 3 | Mistral-7B | Good quality, lower resource |

### Best for Research

| Rank | Model | Why |
|------|-------|-----|
| 1 | Qwen2.5-32B | Deep analysis capability |
| 2 | Llama-3.1-70B | Comprehensive knowledge |
| 3 | Mixtral-8x7B | MoE efficiency |

### Best for Low Resources

| Rank | Model | Why |
|------|-------|-----|
| 1 | Qwen2.5-3B | Good quality for size |
| 2 | Llama-3.2-3B | Efficient architecture |
| 3 | Mistral-7B-Q4 | Quantized efficiency |

---

## Performance Characteristics

### Token Generation Speed (Approximate)

| Model Size | CPU (tok/s) | LM Studio GPU | vLLM GPU (WSL2) |
|------------|-------------|---------------|----------------|
| 1B-3B | 10-20 | 50-100 | 150-300+ |
| 4B-7B | 5-10 | 30-60 | 80-150+ |
| 8B-13B | 2-5 | 20-40 | 50-90+ |
| 14B-34B | 1-2 | 10-25 | 20-50+ |
| 70B+ | <1 | 5-15 | 8-20+ |

### Memory Usage

| Model Size | RAM (FP16) | VRAM (FP16) | VRAM (Q4) |
|------------|------------|-------------|-----------|
| 1B-3B | 2-6 GB | 2-6 GB | 1-3 GB |
| 4B-7B | 8-14 GB | 8-14 GB | 4-7 GB |
| 8B-13B | 16-26 GB | 16-26 GB | 8-13 GB |
| 14B-34B | 28-68 GB | 28-68 GB | 14-34 GB |
| 70B+ | 140+ GB | 140+ GB | 40+ GB |

---

## Model Selection Guide

### Decision Tree

```
What's your primary use case?
├── Coding
│   ├── Have 32GB+ VRAM? → Qwen2.5-32B
│   ├── Have 16GB VRAM? → Qwen2.5-14B
│   └── Have 8GB VRAM? → Qwen2.5-7B
├── General Chat
│   ├── Have 40GB+ VRAM? → Llama-3.1-70B
│   ├── Have 16GB VRAM? → Llama-3.1-8B
│   └── Have 8GB VRAM? → Mistral-7B
├── Research/Analysis
│   ├── Have 32GB+ VRAM? → Qwen2.5-32B
│   ├── Have 16GB VRAM? → Qwen2.5-14B
│   └── Have 8GB VRAM? → Llama-3.1-8B
└── Low Resources
    ├── Have 4GB VRAM? → Qwen2.5-3B
    └── Have 2GB VRAM? → Qwen2.5-1.5B
```

### Quick Reference

| Hardware | Recommended Model | Expected Performance |
|----------|------------------|---------------------|
| 2GB VRAM | Qwen2.5-1.5B | Basic chat, simple tasks |
| 4GB VRAM | Qwen2.5-3B | Good chat, basic coding |
| 8GB VRAM | Qwen2.5-7B | Excellent chat, good coding |
| 16GB VRAM | Qwen2.5-14B | Expert chat, excellent coding |
| 32GB VRAM | Qwen2.5-32B | Expert everything |
| 40GB+ VRAM | Llama-3.1-70B | State-of-the-art |
