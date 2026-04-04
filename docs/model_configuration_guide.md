# Model Configuration Guide

Comprehensive recommendations for configuring models in the Proxy Bridge.

## Model Capability Matrix

### Chat Models

| Model Size | Parameters | Context | Best For | VRAM Required |
|------------|-----------|---------|----------|---------------|
| 1B-3B | 1-3 billion | 2K-4K | Simple Q&A, classification | 2-4 GB |
| 4B-7B | 4-7 billion | 4K-8K | General chat, basic coding | 4-8 GB |
| 8B-13B | 8-13 billion | 4K-16K | Advanced chat, coding | 8-16 GB |
| 14B-34B | 14-34 billion | 8K-32K | Complex reasoning, analysis | 16-32 GB |
| 70B+ | 70+ billion | 8K-128K | Expert-level tasks | 40+ GB |

### Capability Support

| Capability | 1B-3B | 4B-7B | 8B-13B | 14B-34B | 70B+ |
|------------|-------|-------|--------|---------|------|
| Chat | Basic | Good | Excellent | Excellent | Expert |
| Code Generation | Limited | Moderate | Good | Excellent | Expert |
| Tool Calling | No | Basic | Good | Excellent | Expert |
| Reasoning | Limited | Moderate | Good | Excellent | Expert |
| Creative Writing | Basic | Good | Excellent | Excellent | Expert |
| Analysis | Limited | Moderate | Good | Excellent | Expert |

---

## Recommended Parameters by Model Size

### Small Models (1B-3B)

```json
{
  "temperature": 0.3,
  "top_p": 0.8,
  "max_tokens": 1024,
  "contextWindow": 2048,
  "thinking": false
}
```

**Rationale**: Small models benefit from lower temperature to reduce hallucination. Shorter context windows prevent context overflow.

### Medium Models (4B-7B)

```json
{
  "temperature": 0.5,
  "top_p": 0.9,
  "max_tokens": 2048,
  "contextWindow": 4096,
  "thinking": false
}
```

**Rationale**: Balanced parameters for general use. Good for most chat and basic coding tasks.

### Large Models (8B-13B)

```json
{
  "temperature": 0.7,
  "top_p": 0.95,
  "max_tokens": 4096,
  "contextWindow": 8192,
  "thinking": false
}
```

**Rationale**: Higher temperature enables creativity. Larger context window supports complex conversations.

### Extra Large Models (14B-34B)

```json
{
  "temperature": 0.7,
  "top_p": 0.95,
  "max_tokens": 8192,
  "contextWindow": 16384,
  "thinking": true
}
```

**Rationale**: Full capability utilization. Thinking mode enables complex reasoning chains.

### Expert Models (70B+)

```json
{
  "temperature": 0.8,
  "top_p": 0.95,
  "max_tokens": 16384,
  "contextWindow": 32768,
  "thinking": true
}
```

**Rationale**: Maximum capability with extended context for expert-level tasks.

---

## Scenario-Based Configurations

### Code Assistant

Optimized for programming tasks, code review, and debugging.

```json
{
  "system_prompt": "You are an expert programmer. Provide clear, concise code examples with explanations. Follow best practices and mention potential pitfalls.",
  "temperature": 0.2,
  "top_p": 0.9,
  "max_tokens": 4096,
  "contextWindow": 8192,
  "thinking": false,
  "tools": ["file_list", "file_read"]
}
```

**Why**: Low temperature ensures deterministic code output. Tools enable file system access.

### Deep Researcher

Optimized for research, analysis, and comprehensive answers.

```json
{
  "system_prompt": "You are a research analyst. Provide thorough, well-structured analysis with multiple perspectives. Cite sources when possible and acknowledge uncertainties.",
  "temperature": 0.5,
  "top_p": 0.95,
  "max_tokens": 8192,
  "contextWindow": 16384,
  "thinking": true,
  "tools": ["web_search", "query_knowledge_graph"]
}
```

**Why**: Moderate temperature balances creativity with accuracy. Thinking mode enables deep analysis.

### Creative Writer

Optimized for creative writing, brainstorming, and ideation.

```json
{
  "system_prompt": "You are a creative writer. Be imaginative, vivid, and engaging. Use rich descriptions and varied sentence structures. Don't be afraid to take creative risks.",
  "temperature": 1.0,
  "top_p": 0.95,
  "max_tokens": 4096,
  "contextWindow": 8192,
  "thinking": false,
  "tools": []
}
```

**Why**: High temperature enables creative exploration. No tools needed for pure creative tasks.

### Data Analyst

Optimized for structured analysis and data interpretation.

```json
{
  "system_prompt": "You are a data analyst. Provide structured, precise analysis with clear conclusions. Use tables and bullet points for clarity. Always quantify when possible.",
  "temperature": 0.3,
  "top_p": 0.9,
  "max_tokens": 4096,
  "contextWindow": 8192,
  "thinking": false,
  "tools": ["file_read"]
}
```

**Why**: Low temperature ensures precise, factual output. File access enables data reading.

### Customer Support

Optimized for helpful, polite responses.

```json
{
  "system_prompt": "You are a customer support agent. Be polite, helpful, and patient. Always acknowledge the user's concern before providing solutions. Keep responses concise.",
  "temperature": 0.5,
  "top_p": 0.9,
  "max_tokens": 2048,
  "contextWindow": 4096,
  "thinking": false,
  "tools": ["query_knowledge_graph"]
}
```

**Why**: Moderate temperature balances empathy with consistency. Knowledge base access for accurate answers.

### Technical Documentation

Optimized for writing clear technical documentation.

```json
{
  "system_prompt": "You are a technical writer. Write clear, structured documentation. Use headings, code blocks, and examples. Follow standard documentation conventions.",
  "temperature": 0.3,
  "top_p": 0.9,
  "max_tokens": 4096,
  "contextWindow": 8192,
  "thinking": false,
  "tools": ["file_list", "file_read"]
}
```

---

## Context Window Optimization

### Strategies

1. **Sliding Window**: Automatically evict oldest messages while preserving system prompt
2. **Priority-Based**: Keep important messages (user queries, key responses) longer
3. **Summarization**: Compress older messages into summaries
4. **Hybrid**: Combine sliding window with priority preservation

### Recommended Context Sizes

| Task | Minimum | Recommended | Maximum |
|------|---------|-------------|---------|
| Simple Q&A | 1024 | 2048 | 4096 |
| Chat | 2048 | 4096 | 8192 |
| Code Review | 4096 | 8192 | 16384 |
| Document Analysis | 4096 | 8192 | 16384 |
| Research | 8192 | 16384 | 32768 |

### Memory Impact

| Context Window | Approx. Memory | Max Messages |
|----------------|----------------|--------------|
| 2048 | ~50 MB | ~10-15 |
| 4096 | ~100 MB | ~20-30 |
| 8192 | ~200 MB | ~40-60 |
| 16384 | ~400 MB | ~80-120 |
| 32768 | ~800 MB | ~160-240 |

---

## Temperature & Top_p Recommendations

### Temperature Guide

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0-0.2 | Deterministic, factual | Code generation, data analysis |
| 0.3-0.5 | Balanced, reliable | General chat, documentation |
| 0.6-0.8 | Creative, varied | Brainstorming, writing |
| 0.9-1.0 | Highly creative | Fiction, poetry, ideation |
| 1.1-2.0 | Experimental | Testing, exploration |

### Top_p Guide

| Top_p | Behavior | Use Case |
|-------|----------|----------|
| 0.7-0.8 | Focused, narrow | Technical tasks |
| 0.9 | Balanced | General use |
| 0.95 | Diverse | Creative tasks |
| 1.0 | Full vocabulary | Maximum diversity |

---

## Performance vs Quality Trade-offs

### Speed Priority

```json
{
  "temperature": 0.3,
  "max_tokens": 1024,
  "contextWindow": 2048
}
```

- Faster responses
- Lower memory usage
- Suitable for simple tasks

### Quality Priority

```json
{
  "temperature": 0.7,
  "max_tokens": 8192,
  "contextWindow": 16384
}
```

- Better responses
- Higher memory usage
- Suitable for complex tasks

### Balanced

```json
{
  "temperature": 0.5,
  "max_tokens": 4096,
  "contextWindow": 8192
}
```

- Good balance
- Moderate resource usage
- Suitable for most tasks

---

## Hardware Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| CPU | 4 cores | 8 cores |
| Storage | 10 GB free | 50 GB free |
| GPU | Optional | NVIDIA 8GB+ VRAM |

### Model-Specific Requirements

| Model Size | RAM | VRAM | CPU Cores |
|------------|-----|------|-----------|
| 1B-3B | 4 GB | 2 GB | 2 |
| 4B-7B | 8 GB | 4-6 GB | 4 |
| 8B-13B | 16 GB | 8-12 GB | 4 |
| 14B-34B | 32 GB | 16-24 GB | 8 |
| 70B+ | 64 GB | 40+ GB | 8+ |

### GPU Acceleration

- **NVIDIA**: CUDA support required (compute capability 5.0+)
- **AMD**: ROCm support (Linux only)
- **Apple Silicon**: Metal support (unified memory)
- **CPU Only**: Fallback mode (slower but functional)
