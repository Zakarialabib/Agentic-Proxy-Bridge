/**
 * Streaming Latency Optimization Middleware
 * Implements chunked streaming with backpressure for optimal p99 latency
 * Bun-optimized with ArrayBuffer pooling and async delays
 */

interface StreamChunk {
  data: Uint8Array
  timestamp: number
  priority: 'immediate' | 'normal' | 'low'
}

interface BackpressureConfig {
  highWaterMark: number
  lowWaterMark: number
  chunkSize: number
  flushInterval: number
}

class StreamingBufferPool {
  private pool: Uint8Array[] = []
  private readonly maxPoolSize = 50
  private readonly bufferSize = 16384

  acquire(): Uint8Array {
    return this.pool.pop() || new Uint8Array(this.bufferSize)
  }

  release(buffer: Uint8Array): void {
    if (this.pool.length < this.maxPoolSize && buffer.length === this.bufferSize) {
      this.pool.length++
      buffer.fill(0)
      this.pool.push(buffer)
    }
  }
}

const streamBufferPool = new StreamingBufferPool()

export class StreamingLatencyOptimizer {
  private queue: StreamChunk[] = []
  private isWriting = false
  private lastFlush = 0
  private backpressure = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly flushIntervalMs: number

  constructor(
    private writer: (chunk: Uint8Array) => Promise<void>,
    private config: BackpressureConfig = {
      highWaterMark: 64 * 1024,
      lowWaterMark: 16 * 1024,
      chunkSize: 4 * 1024,
      flushInterval: 16,
    }
  ) {
    this.flushIntervalMs = config.flushInterval
    this.lastFlush = Date.now()
  }

  async enqueue(data: Uint8Array, priority: 'immediate' | 'normal' | 'low' = 'normal'): Promise<void> {
    this.queue.push({
      data,
      timestamp: Date.now(),
      priority,
    })

    const queueSize = this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0)
    if (queueSize > this.config.highWaterMark) {
      this.backpressure = true
    }

    await this.scheduleFlush()
  }

  private async scheduleFlush(): Promise<void> {
    if (this.isWriting || this.flushTimer !== null) {
      return
    }

    const timeSinceLastFlush = Date.now() - this.lastFlush
    const shouldFlushImmediately = timeSinceLastFlush > this.config.flushInterval

    if (shouldFlushImmediately) {
      await this.flush()
    } else {
      this.flushTimer = setTimeout(async () => {
        this.flushTimer = null
        await this.flush()
      }, this.config.flushInterval - timeSinceLastFlush)
    }
  }

  private async flush(): Promise<void> {
    if (this.isWriting || this.queue.length === 0) {
      return
    }

    this.isWriting = true

    try {
      const priorityOrder = { immediate: 0, normal: 1, low: 2 }
      this.queue.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
      })

      while (this.queue.length > 0) {
        const chunk = this.queue.shift()!
        const data = chunk.data

        for (let i = 0; i < data.length; i += this.config.chunkSize) {
          const end = Math.min(i + this.config.chunkSize, data.length)
          const subChunk = data.slice(i, end)
          await this.writer(subChunk)
        }

        streamBufferPool.release(chunk.data)
      }

      if (this.backpressure && this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0) < this.config.lowWaterMark) {
        this.backpressure = false
      }

      this.lastFlush = Date.now()
    } finally {
      this.isWriting = false
    }
  }

  isBackpressured(): boolean {
    return this.backpressure
  }

  getStats(): { queueSize: number; chunksQueued: number; backpressured: boolean } {
    return {
      queueSize: this.queue.reduce((sum, chunk) => sum + chunk.data.length, 0),
      chunksQueued: this.queue.length,
      backpressured: this.backpressure,
    }
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.isWriting) {
      await Bun.sleep(5)
    }
  }
}

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
            await Bun.sleep(1)
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
