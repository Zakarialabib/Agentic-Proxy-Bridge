/**
 * Streaming Latency Optimization Middleware
 * Implements chunked streaming with backpressure for optimal p99 latency
 */

interface StreamChunk {
  data: Uint8Array
  timestamp: number
  priority: 'immediate' | 'normal' | 'low'
}

interface BackpressureConfig {
  highWaterMark: number // When to start buffering
  lowWaterMark: number // When to resume
  chunkSize: number // Optimal chunk size in bytes
  flushInterval: number // Max ms between flushes
}

export class StreamingLatencyOptimizer {
  private queue: StreamChunk[] = []
  private isWriting = false
  private lastFlush = Date.now()
  private backpressure = false
  private flushTimer: number | null = null

  constructor(
    private writer: (chunk: Uint8Array) => Promise<void>,
    private config: BackpressureConfig = {
      highWaterMark: 64 * 1024, // 64KB
      lowWaterMark: 16 * 1024, // 16KB
      chunkSize: 4 * 1024, // 4KB chunks
      flushInterval: 16, // ~60fps
    }
  ) {}

  /**
   * Queue a data chunk for streaming with backpressure awareness
   */
  async enqueue(data: Uint8Array, priority: 'immediate' | 'normal' | 'low' = 'normal'): Promise<void> {
    this.queue.push({
      data,
      timestamp: Date.now(),
      priority,
    })

    // Check backpressure
    const queueSize = this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0)
    if (queueSize > this.config.highWaterMark) {
      this.backpressure = true
    }

    await this.scheduleFlush()
  }

  /**
   * Flush queue with optimal chunking
   */
  private async scheduleFlush(): Promise<void> {
    if (this.isWriting || this.flushTimer !== null) {
      return
    }

    const timeSinceLastFlush = Date.now() - this.lastFlush
    const shouldFlushImmediately = timeSinceLastFlush > this.config.flushInterval

    if (shouldFlushImmediately) {
      await this.flush()
    } else {
      // Schedule next flush
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, this.config.flushInterval - timeSinceLastFlush) as unknown as number
    }
  }

  /**
   * Flush queue with priority ordering
   */
  private async flush(): Promise<void> {
    if (this.isWriting || this.queue.length === 0) {
      return
    }

    this.isWriting = true

    try {
      // Sort by priority (immediate first, then by timestamp)
      const priorityOrder = { immediate: 0, normal: 1, low: 2 }
      this.queue.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
      })

      // Write chunks
      while (this.queue.length > 0) {
        const chunk = this.queue.shift()!
        const data = chunk.data

        // Send in optimal-sized chunks
        for (let i = 0; i < data.length; i += this.config.chunkSize) {
          const end = Math.min(i + this.config.chunkSize, data.length)
          const subChunk = data.slice(i, end)
          await this.writer(subChunk)
        }
      }

      // Check if backpressure should be released
      if (this.backpressure && this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0) < this.config.lowWaterMark) {
        this.backpressure = false
      }

      this.lastFlush = Date.now()
    } finally {
      this.isWriting = false
    }
  }

  /**
   * Check if backpressure is active
   */
  isBackpressured(): boolean {
    return this.backpressure
  }

  /**
   * Get queue statistics
   */
  getStats(): { queueSize: number; chunksQueued: number; backpressured: boolean } {
    return {
      queueSize: this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0),
      chunksQueued: this.queue.length,
      backpressured: this.backpressure,
    }
  }
}

/**
 * Create a streaming response with backpressure handling
 */
export async function createStreamingResponse(
  generator: AsyncGenerator<Uint8Array>,
  options?: Partial<BackpressureConfig>
): Promise<Response> {
  let optimizer: StreamingLatencyOptimizer | null = null

  const stream = new ReadableStream({
    async start(controller) {
      optimizer = new StreamingLatencyOptimizer(
        async (chunk) => controller.enqueue(chunk),
        {
          highWaterMark: 64 * 1024,
          lowWaterMark: 16 * 1024,
          chunkSize: 4 * 1024,
          flushInterval: 16,
          ...options,
        }
      )

      try {
        for await (const chunk of generator) {
          if (optimizer.isBackpressured()) {
            // Wait a bit if backpressured
            await new Promise(resolve => setTimeout(resolve, 1))
          }
          await optimizer.enqueue(chunk, 'normal')
        }
      } catch (e) {
        controller.error(e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
