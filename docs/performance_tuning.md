# Performance Tuning Guide

Optimization recommendations for the Proxy Bridge and LM Studio stack.

## Hardware-Specific Optimizations

### NVIDIA GPU Systems

**Detection**:
```bash
# Check GPU detection
curl http://localhost:3001/api/hardware/profile
```

**Optimizations**:
1. **Enable CUDA**: Ensure CUDA toolkit is installed
2. **GPU Layers**: Maximize GPU offloading in LM Studio
3. **VRAM Management**: Monitor with `/api/observability/vram`
4. **Batch Size**: Increase for embedding operations

**Recommended Settings**:
```json
{
  "gpu_layers": -1,
  "batch_size": 512,
  "ubatch_size": 512,
  "flash_attn": true
}
```

### Apple Silicon (M1/M2/M3)

**Optimizations**:
1. **Unified Memory**: Leverage shared RAM/VRAM
2. **Metal Acceleration**: Enable in LM Studio
3. **Context Window**: Can be larger due to unified memory
4. **Thread Count**: Match performance core count

**Recommended Settings**:
```json
{
  "gpu_layers": -1,
  "batch_size": 256,
  "contextWindow": 16384,
  "threads": 10
}
```

### CPU-Only Systems

**Optimizations**:
1. **Quantization**: Use Q4_K_M or Q5_K_M models
2. **Thread Count**: Set to physical core count
3. **Batch Size**: Reduce to 128-256
4. **Context Window**: Keep moderate (4096-8192)

**Recommended Settings**:
```json
{
  "threads": 4,
  "batch_size": 128,
  "contextWindow": 4096,
  "model_quantization": "Q4_K_M"
}
```

---

## Model Selection Guide

### By Hardware

| Hardware | Recommended Model | Quantization | Expected Speed |
|----------|------------------|--------------|----------------|
| 4GB VRAM | 3B model | Q4_K_M | 20-30 tok/s |
| 8GB VRAM | 7B model | Q4_K_M | 15-25 tok/s |
| 16GB VRAM | 14B model | Q4_K_M | 10-20 tok/s |
| 24GB VRAM | 34B model | Q4_K_M | 5-10 tok/s |
| 40GB+ VRAM | 70B model | Q4_K_M | 3-8 tok/s |

### By Use Case

| Use Case | Model Size | Quantization | Context |
|----------|-----------|--------------|---------|
| Quick Q&A | 1-3B | Q4_K_M | 2048 |
| Chat | 7-14B | Q4_K_M | 8192 |
| Coding | 14-34B | Q5_K_M | 8192 |
| Research | 34-70B | Q4_K_M | 16384 |

---

## Parameter Tuning Recommendations

### Temperature

| Task | Temperature | Why |
|------|-------------|-----|
| Code generation | 0.1-0.3 | Deterministic output |
| Technical writing | 0.3-0.5 | Balanced creativity |
| General chat | 0.5-0.7 | Natural conversation |
| Creative writing | 0.8-1.0 | Maximum creativity |
| Brainstorming | 1.0-1.2 | Diverse ideas |

### Context Window

| Task | Context | Memory Impact |
|------|---------|---------------|
| Simple Q&A | 2048 | ~50 MB |
| Chat | 4096 | ~100 MB |
| Code review | 8192 | ~200 MB |
| Document analysis | 16384 | ~400 MB |
| Research | 32768 | ~800 MB |

### Batch Size (Embeddings)

| Batch Size | Throughput | Memory |
|------------|------------|--------|
| 64 | Low | Minimal |
| 128 | Moderate | Low |
| 256 | Good | Moderate |
| 512 | High | High |
| 1024 | Maximum | Very High |

---

## Context Window Optimization

### Strategies

1. **Sliding Window** (Default)
   - Evicts oldest messages first
   - Preserves system prompt
   - Simple and predictable

2. **Priority-Based**
   - Keeps important messages longer
   - User queries prioritized
   - Better conversation quality

3. **Summarization**
   - Compresses old messages
   - Maintains context density
   - Higher computational cost

### Implementation

The proxy automatically enforces sliding window:
```python
# In chat router
if total_tokens > context_window:
    # Evict oldest non-system messages
    while total_tokens > context_window and len(messages) > 1:
        removed = messages.pop(1)
        total_tokens -= estimate_tokens(removed["content"])
```

### Optimization Tips

- Set context window to 2x expected conversation length
- Monitor memory usage with `/api/observability/vram`
- Reduce context if experiencing slowdowns
- Use summarization for very long conversations

---

## Memory Management

### VRAM Optimization

**Monitor Usage**:
```bash
curl http://localhost:3001/api/observability/vram
```

**Optimization Steps**:
1. Unload unused models
2. Reduce context window
3. Use quantized models
4. Enable VRAM grooming

**Grooming Trigger**:
```bash
# Trigger memory grooming
curl -X POST http://localhost:3001/api/observability/groom
```

### RAM Optimization

**Monitor Usage**:
```bash
curl http://localhost:3001/api/hardware/memory
```

**Optimization Steps**:
1. Reduce batch sizes
2. Limit concurrent requests
3. Use streaming for long responses
4. Clear embedding cache periodically

---

## Network Optimization

### Connection Pooling

The proxy uses httpx.AsyncClient with connection pooling:
```python
client = httpx.AsyncClient(
    base_url=base_url,
    timeout=httpx.Timeout(120.0, connect=10.0),
    limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20
    )
)
```

### Streaming Optimization

**Benefits**:
- Lower perceived latency
- Better user experience
- Reduced memory usage

**Configuration**:
```json
{
  "stream": true,
  "stream_options": {
    "include_usage": true
  }
}
```

### Timeout Configuration

| Operation | Timeout | Reason |
|-----------|---------|--------|
| Connect | 10s | Quick connection check |
| Read | 120s | Long generation support |
| Write | 30s | Request submission |
| Pool | 60s | Connection wait |

---

## Embedding Pipeline Optimization

### Request Coalescer

The proxy deduplicates identical embedding requests:
```python
# Identical text = single embedding computation
async def get_embedding(text):
    if text in cache:
        return cache[text]
    # Coalesce concurrent identical requests
    if text in pending:
        return await pending[text]
    # Compute and cache
    ...
```

### MRL (Matryoshka) Support

Select embedding dimensionality dynamically:
```bash
curl -X POST http://localhost:3001/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "input": "text",
    "dimensions": 256
  }'
```

**Dimension Options**:
- 64: Fastest, lowest quality
- 128: Good balance
- 256: Recommended default
- 512: High quality
- 768: Maximum (full dimensions)

### Caching

**Cache Configuration**:
- TTL: 1 hour default
- Max entries: 10,000
- Eviction: LRU

**Clear Cache**:
```bash
curl -X POST http://localhost:3001/api/embeddings/cache/clear
```

---

## Performance Benchmarks

### Reference Benchmarks

| Model | Hardware | First Token | Token/s | Context |
|-------|----------|-------------|---------|---------|
| Qwen2.5-7B | RTX 3060 12GB | 200ms | 45 tok/s | 8192 |
| Qwen2.5-14B | RTX 4090 24GB | 300ms | 30 tok/s | 16384 |
| Llama-3.1-8B | M2 Max 32GB | 250ms | 35 tok/s | 8192 |
| Qwen2.5-3B | CPU (8 core) | 800ms | 12 tok/s | 4096 |

### Running Your Own Benchmarks

```bash
# Full benchmark suite
lmstudio-test complex --target performance

# Specific model benchmark
lmstudio-test benchmark --model qwen2.5-7b --iterations 10

# Export results
lmstudio-test export --format json -o benchmark.json
```

---

## Troubleshooting Performance Issues

### Slow First Token

**Symptoms**: Long delay before response starts

**Causes**:
- Model not loaded
- Cold start
- Large context window

**Solutions**:
1. Pre-load model
2. Enable prewarming
3. Reduce context window
4. Use smaller model

### Low Token Generation Speed

**Symptoms**: Slow response generation

**Causes**:
- CPU bottleneck
- Large model for hardware
- High concurrent load

**Solutions**:
1. Enable GPU acceleration
2. Use quantized model
3. Reduce batch size
4. Limit concurrent requests

### High Memory Usage

**Symptoms**: Out of memory errors

**Causes**:
- Large context window
- Multiple models loaded
- Embedding cache full

**Solutions**:
1. Reduce context window
2. Unload unused models
3. Clear embedding cache
4. Trigger VRAM grooming

### Network Timeouts

**Symptoms**: Request timeouts

**Causes**:
- Network instability
- Server overload
- Large payloads

**Solutions**:
1. Increase timeout settings
2. Use streaming
3. Reduce payload size
4. Check network stability
