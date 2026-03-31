/**
 * LM Studio Connection Management
 * Handles connection pooling, queue management, and concurrent request throttling
 * Bun-optimized with Bun.sleep and parallel operations
 */

import { EventEmitter } from 'events'

export interface LMStudioConnectionConfig {
  maxConnections: number
  maxQueueSize: number
  requestTimeout: number
  healthCheckInterval: number
  retryAttempts: number
  retryBackoffMs: number
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
    this.startHealthChecks()
  }

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

  private async executeRequest<T>(queuedRequest: QueuedRequest<T>): Promise<void> {
    this.activeConnections++
    this.emit('connectionStart', { requestId: queuedRequest.id, active: this.activeConnections })

    const timeoutPromise = Bun.sleep(this.config.requestTimeout)
    const resultPromise = queuedRequest.request()

    try {
      const result = await Promise.race([resultPromise, timeoutPromise])
      
      if (result === undefined) {
        throw new Error(`Request ${queuedRequest.id} timed out`)
      }
      
      queuedRequest.resolve(result as T)
    } catch (error) {
      if (queuedRequest.retries < this.config.retryAttempts) {
        queuedRequest.retries++
        const backoffMs = this.config.retryBackoffMs * Math.pow(2, queuedRequest.retries - 1)
        this.emit('retrying', {
          requestId: queuedRequest.id,
          attempt: queuedRequest.retries,
          backoffMs,
        })

        await Bun.sleep(backoffMs)
        this.executeRequest(queuedRequest)
        return
      }

      queuedRequest.reject(error as Error)
    } finally {
      this.activeConnections--
      this.emit('connectionEnd', { requestId: queuedRequest.id, active: this.activeConnections })
      this.processQueue()
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.activeConnections >= this.config.maxConnections) {
      return
    }

    const queuedRequest = this.queue.shift()
    if (queuedRequest) {
      this.executeRequest(queuedRequest)
    }
  }

  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })
  }

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

  async shutdown(): Promise<void> {
    while (this.activeConnections > 0 || this.queue.length > 0) {
      await Bun.sleep(100)
    }

    for (const req of this.queue) {
      req.reject(new Error('Connection pool shutting down'))
    }
    this.queue.length = 0
  }
}

let globalPool: LMStudioConnectionPool | null = null

export function initializeConnectionPool(config: LMStudioConnectionConfig): LMStudioConnectionPool {
  if (!globalPool) {
    globalPool = new LMStudioConnectionPool(config)
  }
  return globalPool
}

export function getConnectionPool(): LMStudioConnectionPool {
  if (!globalPool) {
    throw new Error('Connection pool not initialized. Call initializeConnectionPool first.')
  }
  return globalPool
}
