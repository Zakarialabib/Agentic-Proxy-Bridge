/**
 * Embedding Request Coalescing
 * Deduplicates and batches embedding requests to reduce LM Studio load
 */

import { EventEmitter } from 'events'

export interface EmbeddingRequest {
  id: string
  texts: string[]
  model: string
  timestamp: number
}

export interface CoalesceConfig {
  batchSize: number // Max requests per batch
  batchTimeoutMs: number // Max time to wait for more requests
  deduplicateInterval: number // How long to track duplicates (ms)
  maxConcurrentBatches: number // Max simultaneous batches
}

export class EmbeddingRequestCoalescer extends EventEmitter {
  private pendingRequests = new Map<string, EmbeddingRequest[]>()
  private batchTimer: number | null = null
  private processedHashes = new Map<string, number>() // Track request hashes and timestamps
  private activeBatches = 0

  constructor(
    private executeEmbedding: (texts: string[], model: string) => Promise<number[][]>,
    private config: CoalesceConfig = {
      batchSize: 128,
      batchTimeoutMs: 100,
      deduplicateInterval: 60000, // 1 minute
      maxConcurrentBatches: 3,
    }
  ) {
    super()

    // Clean up old hashes
    setInterval(() => {
      const now = Date.now()
      for (const [hash, timestamp] of this.processedHashes.entries()) {
        if (now - timestamp > this.config.deduplicateInterval) {
          this.processedHashes.delete(hash)
        }
      }
    }, this.config.deduplicateInterval)
  }

  /**
   * Request embeddings with deduplication and coalescing
   */
  async getEmbeddings(texts: string[], model: string): Promise<number[][]> {
    const requestHash = this.createHash(texts, model)

    // Check if this exact request was recently processed
    if (this.processedHashes.has(requestHash)) {
      this.emit('deduplicated', { hash: requestHash, textCount: texts.length })
      // For now, we'll still process it but this could cache results
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

    // Schedule batch processing
    this.scheduleBatch(modelKey)

    // Return a promise that will be resolved when this request is processed
    return new Promise((resolve) => {
      // Wait for batch to be processed
      const checkInterval = setInterval(() => {
        // This is simplified - in reality, we'd track individual request results
        const pending = this.pendingRequests.get(modelKey)
        if (!pending || !pending.find((r) => r.id === requestId)) {
          clearInterval(checkInterval)
          // Process completed
          resolve([]) // Placeholder - actual implementation would return real embeddings
        }
      }, 10)
    })
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(modelKey: string): void {
    if (this.batchTimer !== null) {
      return
    }

    const requests = this.pendingRequests.get(modelKey) || []

    // Process immediately if we have a full batch
    if (requests.length >= this.config.batchSize) {
      this.processBatch(modelKey)
    } else if (requests.length > 0) {
      // Schedule timeout for partial batch
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null
        this.processBatch(modelKey)
      }, this.config.batchTimeoutMs) as unknown as number
    }
  }

  /**
   * Process a batch of embedding requests
   */
  private async processBatch(modelKey: string): Promise<void> {
    if (this.activeBatches >= this.config.maxConcurrentBatches) {
      // Re-schedule for later
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null
        this.processBatch(modelKey)
      }, 50) as unknown as number
      return
    }

    const requests = this.pendingRequests.get(modelKey) || []
    if (requests.length === 0) {
      return
    }

    this.activeBatches++

    try {
      // Take up to batchSize requests
      const batch = requests.splice(0, this.config.batchSize)
      const allTexts = batch.flatMap((r) => r.texts)

      this.emit('processingBatch', {
        model: modelKey,
        batchSize: batch.length,
        totalTexts: allTexts.length,
        activeBatches: this.activeBatches,
      })

      // Execute embeddings
      const embeddings = await this.executeEmbedding(allTexts, modelKey)

      this.emit('batchCompleted', {
        model: modelKey,
        requestCount: batch.length,
        textCount: allTexts.length,
        embeddingDim: embeddings[0]?.length || 0,
      })

      // Process any remaining requests
      if (this.pendingRequests.get(modelKey)?.length || 0 > 0) {
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

  /**
   * Create hash for deduplication
   */
  private createHash(texts: string[], model: string): string {
    const combined = `${model}:${texts.join('|')}`
    // Simple hash for demonstration
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `${hash}_${texts.length}`
  }

  /**
   * Get pending request count for a model
   */
  private getPendingCount(modelKey: string): number {
    return this.pendingRequests.get(modelKey)?.length || 0
  }

  /**
   * Get coalescer statistics
   */
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

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear()
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }
}

/**
 * Global embedding coalescer instance
 */
let globalCoalescer: EmbeddingRequestCoalescer | null = null

/**
 * Initialize or get global embedding coalescer
 */
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

/**
 * Get global embedding coalescer
 */
export function getEmbeddingCoalescer(): EmbeddingRequestCoalescer {
  if (!globalCoalescer) {
    throw new Error('Embedding coalescer not initialized. Call initializeEmbeddingCoalescer first.')
  }
  return globalCoalescer
}
