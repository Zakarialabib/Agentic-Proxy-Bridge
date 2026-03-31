/**
 * LM Studio Connection Management
 * Handles connection pooling, queue management, and concurrent request throttling
 */

import { EventEmitter } from 'events'

export interface LMStudioConnectionConfig {
  maxConnections: number // Max concurrent connections
  maxQueueSize: number // Max requests in queue
  requestTimeout: number // Timeout per request (ms)
  healthCheckInterval: number // Health check frequency (ms)
  retryAttempts: number // Max retry attempts
  retryBackoffMs: number // Backoff multiplier
}

export interface QueuedRequest<T> {
  id: string
  request: () => Promise<T>
  priority: 'high' | 'normal' | 'low'
  timestamp: number
  retries: number
  resolve: (value: T) => void
  reject: (error: Error) => void
}

export class LMStudioConnectionPool extends EventEmitter {
  private activeConnections = 0
  private queue: QueuedRequest<any>[] = []
  private healthStatus = new Map<number, boolean>()
  private requestCounter = 0

  constructor(private config: LMStudioConnectionConfig) {
    super()

    // Start health checks
    this.startHealthChecks()
  }

  /**
   * Execute a request with connection pooling and queue management
   */
  async execute<T>(
    request: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        id: `req_${++this.requestCounter}`,
        request,
        priority,
        timestamp: Date.now(),
        retries: 0,
        resolve,
        reject,
      }

      if (this.activeConnections < this.config.maxConnections) {
        this.executeRequest(queuedRequest)
      } else if (this.queue.length < this.config.maxQueueSize) {
        this.queue.push(queuedRequest)
        this.sortQueue()
        this.emit('queued', { requestId: queuedRequest.id, queueSize: this.queue.length })
      } else {
        reject(new Error('Connection pool queue is full'))
      }
    })
  }

  /**
   * Execute a queued request with timeout and retry logic
   */
  private async executeRequest<T>(queuedRequest: QueuedRequest<T>): Promise<void> {
    this.activeConnections++
    this.emit('connectionStart', { requestId: queuedRequest.id, active: this.activeConnections })

    const timeoutId = setTimeout(() => {
      this.activeConnections--
      queuedRequest.reject(new Error(`Request ${queuedRequest.id} timed out`))
      this.processQueue()
    }, this.config.requestTimeout)

    try {
      const result = await queuedRequest.request()
      clearTimeout(timeoutId)
      queuedRequest.resolve(result)
    } catch (error) {
      clearTimeout(timeoutId)

      if (queuedRequest.retries < this.config.retryAttempts) {
        queuedRequest.retries++
        const backoffMs = this.config.retryBackoffMs * Math.pow(2, queuedRequest.retries - 1)
        this.emit('retrying', {
          requestId: queuedRequest.id,
          attempt: queuedRequest.retries,
          backoffMs,
        })

        // Re-queue with backoff
        setTimeout(() => {
          this.executeRequest(queuedRequest)
        }, backoffMs)

        return
      }

      queuedRequest.reject(error as Error)
    } finally {
      this.activeConnections--
      this.emit('connectionEnd', { requestId: queuedRequest.id, active: this.activeConnections })
      this.processQueue()
    }
  }

  /**
   * Process next request in queue
   */
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeConnections >= this.config.maxConnections) {
      return
    }

    const queuedRequest = this.queue.shift()
    if (queuedRequest) {
      this.executeRequest(queuedRequest)
    }
  }

  /**
   * Sort queue by priority (high > normal > low) and age
   */
  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp // FIFO for same priority
    })
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    setInterval(() => {
      this.healthStatus.clear()
      this.emit('healthCheck', {
        activeConnections: this.activeConnections,
        queuedRequests: this.queue.length,
        timestamp: Date.now(),
      })
    }, this.config.healthCheckInterval)
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    activeConnections: number
    queuedRequests: number
    maxConnections: number
    utilizationPercent: number
  } {
    return {
      activeConnections: this.activeConnections,
      queuedRequests: this.queue.length,
      maxConnections: this.config.maxConnections,
      utilizationPercent: (this.activeConnections / this.config.maxConnections) * 100,
    }
  }

  /**
   * Drain queue and close connections
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeConnections === 0 && this.queue.length === 0) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      // Reject pending requests
      for (const req of this.queue) {
        req.reject(new Error('Connection pool shutting down'))
      }
      this.queue.length = 0
    })
  }
}

/**
 * Global LM Studio connection pool instance
 */
let globalPool: LMStudioConnectionPool | null = null

/**
 * Initialize or get global connection pool
 */
export function initializeConnectionPool(config: LMStudioConnectionConfig): LMStudioConnectionPool {
  if (!globalPool) {
    globalPool = new LMStudioConnectionPool(config)
  }
  return globalPool
}

/**
 * Get global connection pool
 */
export function getConnectionPool(): LMStudioConnectionPool {
  if (!globalPool) {
    throw new Error('Connection pool not initialized. Call initializeConnectionPool first.')
  }
  return globalPool
}
