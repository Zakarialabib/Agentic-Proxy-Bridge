/**
 * Embedding Request Coalescing
 * Deduplicates and batches embedding requests to reduce LM Studio load
 * Bun-optimized with Bun.sleep and Bun.hash
 */

import { EventEmitter } from 'events'

export interface EmbeddingRequest {
  id: string
  texts: string[]
  model: string
  timestamp: number
}

export interface CoalesceConfig {
  batchSize: number
  batchTimeoutMs: number
  deduplicateInterval: number
  maxConcurrentBatches: number
}

export class EmbeddingRequestCoalescer extends EventEmitter {
  private pendingRequests = new Map<string, EmbeddingRequest[]>()
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private processedHashes = new Map<string, number>()
  private activeBatches = 0

  constructor(
    private executeEmbedding: (texts: string[], model: string) => Promise<number[][]>,
    private config: CoalesceConfig = {
      batchSize: 128,
      batchTimeoutMs: 100,
      deduplicateInterval: 60000,
      maxConcurrentBatches: 3,
    }
  ) {
    super()

    setInterval(() => {
      const now = Date.now()
      for (const [hash, timestamp] of this.processedHashes.entries()) {
        if (now - timestamp > this.config.deduplicateInterval) {
          this.processedHashes.delete(hash)
        }
      }
    }, this.config.deduplicateInterval)
  }

  async getEmbeddings(texts: string[], model: string): Promise<number[][]> {
    const requestHash = this.createHash(texts, model)

    if (this.processedHashes.has(requestHash)) {
      this.emit('deduplicated', { hash: requestHash, textCount: texts.length })
    }

    const modelKey = model
    if (!this.pendingRequests.has(modelKey)) {
      this.pendingRequests.set(modelKey, [])
    }

    const requestId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const request: EmbeddingRequest = {
      id: requestId,
      texts,
      model,
      timestamp: Date.now(),
    }

    this.pendingRequests.get(modelKey)!.push(request)
    this.processedHashes.set(requestHash, Date.now())

    this.emit('coalesced', {
      requestId,
      textCount: texts.length,
      model,
      queueSize: this.getPendingCount(modelKey),
    })

    this.scheduleBatch(modelKey)

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const pending = this.pendingRequests.get(modelKey)
        if (!pending || !pending.find((r) => r.id === requestId)) {
          clearInterval(checkInterval)
          resolve([])
        }
      }, 10)
    })
  }

  private scheduleBatch(modelKey: string): void {
    if (this.batchTimer !== null) {
      return
    }

    const requests = this.pendingRequests.get(modelKey) || []

    if (requests.length >= this.config.batchSize) {
      this.processBatch(modelKey)
    } else if (requests.length > 0) {
      this.batchTimer = setTimeout(async () => {
        this.batchTimer = null
        await this.processBatch(modelKey)
      }, this.config.batchTimeoutMs)
    }
  }

  private async processBatch(modelKey: string): Promise<void> {
    if (this.activeBatches >= this.config.maxConcurrentBatches) {
      this.batchTimer = setTimeout(async () => {
        this.batchTimer = null
        await this.processBatch(modelKey)
      }, 50)
      return
    }

    const requests = this.pendingRequests.get(modelKey) || []
    if (requests.length === 0) {
      return
    }

    this.activeBatches++

    try {
      const batch = requests.splice(0, this.config.batchSize)
      const allTexts = batch.flatMap((r) => r.texts)

      this.emit('processingBatch', {
        model: modelKey,
        batchSize: batch.length,
        totalTexts: allTexts.length,
        activeBatches: this.activeBatches,
      })

      const embeddings = await this.executeEmbedding(allTexts, modelKey)

      this.emit('batchCompleted', {
        model: modelKey,
        requestCount: batch.length,
        textCount: allTexts.length,
        embeddingDim: embeddings[0]?.length || 0,
      })

      if ((this.pendingRequests.get(modelKey)?.length || 0) > 0) {
        setImmediate(() => this.processBatch(modelKey))
      }
    } catch (error) {
      this.emit('batchError', {
        model: modelKey,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.activeBatches--
    }
  }

  private createHash(texts: string[], model: string): string {
    const combined = `${model}:${texts.join('|')}`
    return Bun.hash(combined).toString() + `_${texts.length}`
  }

  private getPendingCount(modelKey: string): number {
    return this.pendingRequests.get(modelKey)?.length || 0
  }

  getStats(): {
    pendingRequests: Map<string, number>
    activeBatches: number
    deduplicatedHashes: number
  } {
    const pendingRequests = new Map<string, number>()
    for (const [model, requests] of this.pendingRequests.entries()) {
      pendingRequests.set(model, requests.length)
    }

    return {
      pendingRequests,
      activeBatches: this.activeBatches,
      deduplicatedHashes: this.processedHashes.size,
    }
  }

  clear(): void {
    this.pendingRequests.clear()
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }
}

let globalCoalescer: EmbeddingRequestCoalescer | null = null

export function initializeEmbeddingCoalescer(
  executeEmbedding: (texts: string[], model: string) => Promise<number[][]>,
  config?: Partial<CoalesceConfig>
): EmbeddingRequestCoalescer {
  if (!globalCoalescer) {
    globalCoalescer = new EmbeddingRequestCoalescer(executeEmbedding, {
      batchSize: 128,
      batchTimeoutMs: 100,
      deduplicateInterval: 60000,
      maxConcurrentBatches: 3,
      ...config,
    })
  }
  return globalCoalescer
}

export function getEmbeddingCoalescer(): EmbeddingRequestCoalescer {
  if (!globalCoalescer) {
    throw new Error('Embedding coalescer not initialized. Call initializeEmbeddingCoalescer first.')
  }
  return globalCoalescer
}
