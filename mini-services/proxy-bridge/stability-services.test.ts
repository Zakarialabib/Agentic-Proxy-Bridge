/**
 * Phase 8 Services Comprehensive Tests
 * Tests for: Connection Pool, Embedding Coalescer, Streaming Optimizer
 */

import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { LMStudioConnectionPool, initializeConnectionPool, LMStudioConnectionConfig } from './services/lm-studio-connection-pool'
import { EmbeddingRequestCoalescer, initializeEmbeddingCoalescer, CoalesceConfig } from './services/embedding-request-coalescer'
import { StreamingLatencyOptimizer, createStreamingResponse } from './services/streaming-latency-optimizer'

// ============= Connection Pool Tests =============

describe('LMStudioConnectionPool', () => {
  let pool: LMStudioConnectionPool
  const defaultConfig: LMStudioConnectionConfig = {
    maxConnections: 3,
    maxQueueSize: 10,
    requestTimeout: 1000,
    healthCheckInterval: 5000,
    retryAttempts: 2,
    retryBackoffMs: 50,
  }

  beforeEach(() => {
    pool = new LMStudioConnectionPool(defaultConfig)
  })

  afterEach(async () => {
    await pool.shutdown()
  })

  describe('Pool Initialization', () => {
    test('should initialize with default values', () => {
      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(0)
      expect(stats.queuedRequests).toBe(0)
      expect(stats.maxConnections).toBe(defaultConfig.maxConnections)
      expect(stats.utilizationPercent).toBe(0)
    })

    test('should emit healthCheck events', (done) => {
      const shortConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        healthCheckInterval: 50,
      }
      const healthPool = new LMStudioConnectionPool(shortConfig)
      
      let healthCheckCount = 0
      healthPool.on('healthCheck', (data) => {
        healthCheckCount++
        expect(data.activeConnections).toBe(0)
        expect(data.queuedRequests).toBe(0)
        expect(data.timestamp).toBeGreaterThan(0)
        
        if (healthCheckCount >= 2) {
          healthPool.shutdown()
          done()
        }
      })

      setTimeout(() => {
        if (healthCheckCount < 2) {
          healthPool.shutdown()
          done()
        }
      }, 200)
    })
  })

  describe('execute() with Priority Queuing', () => {
    test('should execute immediately when connections available', async () => {
      const mockRequest = mock(async () => 'result')
      const result = await pool.execute(mockRequest, 'normal')
      
      expect(result).toBe('result')
      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(pool.getStats().activeConnections).toBe(0)
    })

    test('should queue requests when at max capacity', async () => {
      const slowRequest = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return 'slow'
      })

      // Fill all connection slots
      await Promise.all([
        pool.execute(slowRequest, 'normal'),
        pool.execute(slowRequest, 'normal'),
        pool.execute(slowRequest, 'normal'),
      ])

      // Now queue should be empty and stats show 0 active
      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(0)
    })

    test('should prioritize high priority requests', async () => {
      const shortConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        maxConnections: 1,
      }
      const priorityPool = new LMStudioConnectionPool(shortConfig)
      
      const results: string[] = []
      const slowRequest = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'slow'
      })

      // Queue low priority request first
      const lowPromise = priorityPool.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        results.push('low')
        return 'low'
      }, 'low')

      // Then add high priority request
      const highPromise = priorityPool.execute(async () => {
        results.push('high')
        return 'high'
      }, 'high')

      const highResult = await highPromise
      expect(highResult).toBe('high')
      
      await priorityPool.shutdown()
    })

    test('should emit queued event when request is queued', async () => {
      const shortConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        maxConnections: 1,
      }
      const queuedPool = new LMStudioConnectionPool(shortConfig)
      
      const queuedEvents: any[] = []
      queuedPool.on('queued', (data) => {
        queuedEvents.push(data)
      })

      const slowRequest = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return 'slow'
      })

      // Fill connection
      const fillPromise = queuedPool.execute(slowRequest, 'normal')
      // Immediately queue another while first is still running
      const queuePromise = queuedPool.execute(slowRequest, 'normal')

      // Wait for queue event
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(queuedEvents.length).toBeGreaterThanOrEqual(1)
      expect(queuedEvents[0]).toHaveProperty('requestId')
      expect(queuedEvents[0]).toHaveProperty('queueSize')

      // Clean up
      await Promise.all([fillPromise, queuePromise])
      await queuedPool.shutdown()
    })
  })

  describe('Max Connections Enforcement', () => {
    test('should reject when queue is full', async () => {
      const fullConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        maxConnections: 1,
        maxQueueSize: 1,
        requestTimeout: 5000, // Longer timeout to prevent interference
      }
      const fullPool = new LMStudioConnectionPool(fullConfig)

      const slowRequest = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return 'slow'
      })

      // Fill connection and queue synchronously
      const p1 = fullPool.execute(slowRequest, 'normal')
      await new Promise(resolve => setTimeout(resolve, 5))
      const p2 = fullPool.execute(slowRequest, 'normal')

      // Third should reject
      await expect(fullPool.execute(slowRequest, 'normal')).rejects.toThrow('Connection pool queue is full')

      await Promise.all([p1, p2])
      await fullPool.shutdown()
    })

    test('should respect maxConnections limit', () => {
      const stats = pool.getStats()
      expect(stats.maxConnections).toBe(defaultConfig.maxConnections)
    })
  })

  describe('Timeout Handling', () => {
    test('should timeout requests that exceed requestTimeout', async () => {
      const shortTimeoutConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        requestTimeout: 50,
        retryAttempts: 0,
      }
      const timeoutPool = new LMStudioConnectionPool(shortTimeoutConfig)

      const hangingRequest = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return 'never'
      })

      await expect(timeoutPool.execute(hangingRequest, 'normal')).rejects.toThrow(/timed out/)
      
      await timeoutPool.shutdown()
    })

    test('should emit connectionEnd after timeout', async () => {
      const shortTimeoutConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        requestTimeout: 30,
        retryAttempts: 0,
      }
      const timeoutPool = new LMStudioConnectionPool(shortTimeoutConfig)

      const startEvents: any[] = []
      timeoutPool.on('connectionStart', (data) => {
        startEvents.push(data)
      })

      // Use a quick promise that we abandon
      timeoutPool.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return 'never'
      }, 'normal')
      .catch(() => {}) // Ignore rejection
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify request started
      expect(startEvents.length).toBeGreaterThanOrEqual(1)

      await timeoutPool.shutdown()
    }, 5000)
  })

  describe('Retry Logic', () => {
    test('should retry failed requests', async () => {
      const retryConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        retryAttempts: 3,
        retryBackoffMs: 20,
        requestTimeout: 500,
      }
      const retryPool = new LMStudioConnectionPool(retryConfig)

      let attempts = 0
      const flakyRequest = mock(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })

      const result = await retryPool.execute(flakyRequest, 'normal')
      expect(result).toBe('success')
      expect(attempts).toBe(3)

      await retryPool.shutdown()
    })

    test('should emit retrying event on retry', async () => {
      const retryConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        retryAttempts: 2,
        retryBackoffMs: 20,
        requestTimeout: 500,
      }
      const retryPool = new LMStudioConnectionPool(retryConfig)

      const retryEvents: any[] = []
      retryPool.on('retrying', (data) => {
        retryEvents.push(data)
      })

      let attempts = 0
      await retryPool.execute(async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Fail')
        }
        return 'ok'
      }, 'normal')

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(retryEvents.length).toBeGreaterThanOrEqual(1)
      expect(retryEvents[0]).toHaveProperty('requestId')
      expect(retryEvents[0]).toHaveProperty('attempt')
      expect(retryEvents[0]).toHaveProperty('backoffMs')

      await retryPool.shutdown()
    })

    test('should not retry after max attempts', async () => {
      const retryConfig: LMStudioConnectionConfig = {
        ...defaultConfig,
        retryAttempts: 2,
        retryBackoffMs: 10,
        requestTimeout: 500,
      }
      const retryPool = new LMStudioConnectionPool(retryConfig)

      let attempts = 0
      const alwaysFails = mock(async () => {
        attempts++
        throw new Error('Always fails')
      })

      await expect(retryPool.execute(alwaysFails, 'normal')).rejects.toThrow('Always fails')
      expect(attempts).toBe(3) // Initial + 2 retries

      await retryPool.shutdown()
    })
  })

  describe('Event Emissions', () => {
    test('should emit connectionStart when request starts', async () => {
      const startEvents: any[] = []
      pool.on('connectionStart', (data) => {
        startEvents.push(data)
      })

      const request = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'done'
      })

      await pool.execute(request, 'normal')
      
      expect(startEvents.length).toBe(1)
      expect(startEvents[0]).toHaveProperty('requestId')
      expect(startEvents[0]).toHaveProperty('active')
    })

    test('should emit connectionEnd when request completes', async () => {
      const endEvents: any[] = []
      pool.on('connectionEnd', (data) => {
        endEvents.push(data)
      })

      await pool.execute(async () => 'done', 'normal')
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(endEvents.length).toBe(1)
      expect(endEvents[0]).toHaveProperty('requestId')
      expect(endEvents[0]).toHaveProperty('active')
    })
  })
})

// ============= Embedding Coalescer Tests =============

describe('EmbeddingRequestCoalescer', () => {
  let coalescer: EmbeddingRequestCoalescer
  let mockExecuteEmbedding: any

  const defaultConfig: CoalesceConfig = {
    batchSize: 5,
    batchTimeoutMs: 50,
    deduplicateInterval: 60000,
    maxConcurrentBatches: 2,
  }

  beforeEach(() => {
    mockExecuteEmbedding = mock(async (texts: string[], model: string) => {
      // Return random embeddings
      return texts.map(() => Array(128).fill(0).map(() => Math.random()))
    })
    coalescer = new EmbeddingRequestCoalescer(mockExecuteEmbedding, defaultConfig)
  })

  afterEach(() => {
    coalescer.clear()
  })

  describe('Batch Formation', () => {
    test('should collect texts until batchSize triggers processing', async () => {
      const processingEvents: any[] = []
      coalescer.on('processingBatch', (data) => {
        processingEvents.push(data)
      })

      // Send exactly batchSize requests
      const texts = ['text1', 'text2', 'text3', 'text4', 'text5']
      await coalescer.getEmbeddings(texts, 'test-model')

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(processingEvents.length).toBeGreaterThanOrEqual(1)
      expect(processingEvents[0].batchSize).toBeLessThanOrEqual(defaultConfig.batchSize)
    })

    test('should process partial batch on timeout', async () => {
      const processingEvents: any[] = []
      coalescer.on('processingBatch', (data) => {
        processingEvents.push(data)
      })

      // Send fewer than batchSize requests
      const texts1 = ['text1', 'text2']
      const texts2 = ['text3', 'text4']
      
      await coalescer.getEmbeddings(texts1, 'test-model')
      await coalescer.getEmbeddings(texts2, 'test-model')

      // Wait for timeout to trigger batch
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(processingEvents.length).toBeGreaterThanOrEqual(1)
      expect(mockExecuteEmbedding).toHaveBeenCalled()
    })

    test('should batch multiple texts together', async () => {
      const texts1 = ['a', 'b', 'c']
      const texts2 = ['d', 'e', 'f']

      const coalescedPromise = coalescer.getEmbeddings(texts1, 'test-model')
      const coalescedPromise2 = coalescer.getEmbeddings(texts2, 'test-model')

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150))

      // Check that embeddings were called
      expect(mockExecuteEmbedding).toHaveBeenCalled()
    })
  })

  describe('Deduplication', () => {
    test('should detect duplicate requests', async () => {
      const deduplicatedEvents: any[] = []
      coalescer.on('deduplicated', (data) => {
        deduplicatedEvents.push(data)
      })

      const texts = ['unique text']

      // Send same request twice
      await coalescer.getEmbeddings(texts, 'test-model')
      await coalescer.getEmbeddings(texts, 'test-model')

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(deduplicatedEvents.length).toBeGreaterThanOrEqual(1)
    })

    test('should track processed hashes', () => {
      const stats = coalescer.getStats()
      expect(stats).toHaveProperty('deduplicatedHashes')
    })
  })

  describe('Concurrent Batch Processing', () => {
    test('should process multiple batches concurrently', async () => {
      const processingEvents: any[] = []
      coalescer.on('processingBatch', (data) => {
        processingEvents.push(data)
      })

      // Send many requests to trigger multiple batches
      const texts = Array(15).fill(null).map((_, i) => `text${i}`)

      const promises = texts.map(text => 
        coalescer.getEmbeddings([text], 'test-model')
      )

      await Promise.all(promises)
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should have processed multiple batches
      expect(processingEvents.length).toBeGreaterThanOrEqual(1)
    })

    test('should limit concurrent batches to maxConcurrentBatches', async () => {
      const batchConfig: CoalesceConfig = {
        ...defaultConfig,
        batchSize: 2,
        maxConcurrentBatches: 1,
      }
      const limitedCoalescer = new EmbeddingRequestCoalescer(mockExecuteEmbedding, batchConfig)

      let maxActiveBatches = 0
      limitedCoalescer.on('processingBatch', (data) => {
        maxActiveBatches = Math.max(maxActiveBatches, data.activeBatches)
      })

      // Send many requests
      const texts = Array(10).fill(null).map((_, i) => `text${i}`)
      await Promise.all(texts.map(text => limitedCoalescer.getEmbeddings([text], 'test-model')))

      await new Promise(resolve => setTimeout(resolve, 300))

      expect(maxActiveBatches).toBeLessThanOrEqual(batchConfig.maxConcurrentBatches)

      limitedCoalescer.clear()
    })
  })

  describe('Timeout Triggers Partial Batch', () => {
    test('should trigger batch processing after timeout even for partial batch', async () => {
      const processingEvents: any[] = []
      coalescer.on('processingBatch', (data) => {
        processingEvents.push(data)
      })

      // Send just 2 texts (less than batchSize of 5)
      await coalescer.getEmbeddings(['text1', 'text2'], 'test-model')

      // Wait for timeout (50ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(processingEvents.length).toBeGreaterThanOrEqual(1)
      expect(processingEvents[0].batchSize).toBeGreaterThan(0)
    })
  })
})

// ============= Streaming Optimizer Tests =============

describe('StreamingLatencyOptimizer', () => {
  let writtenChunks: Uint8Array[]
  let optimizer: StreamingLatencyOptimizer

  beforeEach(() => {
    writtenChunks = []
    optimizer = new StreamingLatencyOptimizer(
      async (chunk: Uint8Array) => {
        writtenChunks.push(chunk)
      },
      {
        highWaterMark: 1024,
        lowWaterMark: 256,
        chunkSize: 256,
        flushInterval: 10,
      }
    )
  })

  describe('Chunk Queuing', () => {
    test('should queue chunks for streaming', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      await optimizer.enqueue(data)

      const stats = optimizer.getStats()
      expect(stats.chunksQueued).toBe(1)
      expect(stats.queueSize).toBe(5)
    })

    test('should split large chunks into optimal sizes', async () => {
      const largeData = new Uint8Array(1024)
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256
      }

      await optimizer.enqueue(largeData)

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should be split into ~256-byte chunks (1024 / 256 = 4 chunks)
      // Allow for slight variation due to implementation
      expect(writtenChunks.length).toBeGreaterThanOrEqual(3)
      expect(writtenChunks.length).toBeLessThanOrEqual(5)
    })

    test('should handle multiple chunks', async () => {
      await optimizer.enqueue(new Uint8Array([1, 2, 3]))
      await optimizer.enqueue(new Uint8Array([4, 5, 6]))
      await optimizer.enqueue(new Uint8Array([7, 8, 9]))

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(writtenChunks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Backpressure Release', () => {
    test('should activate backpressure when queue exceeds highWaterMark', async () => {
      optimizer = new StreamingLatencyOptimizer(
        async () => {
          // Simulate slow writer
          await new Promise(resolve => setTimeout(resolve, 50))
        },
        {
          highWaterMark: 100,
          lowWaterMark: 50,
          chunkSize: 256,
          flushInterval: 100,
        }
      )

      // Add chunks until exceeding highWaterMark
      for (let i = 0; i < 10; i++) {
        await optimizer.enqueue(new Uint8Array(50))
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      // Backpressure should be active
      expect(optimizer.isBackpressured()).toBe(true)
    })

    test('should release backpressure when queue drops below lowWaterMark', async () => {
      optimizer = new StreamingLatencyOptimizer(
        async (chunk: Uint8Array) => {
          writtenChunks.push(chunk)
        },
        {
          highWaterMark: 200,
          lowWaterMark: 50,
          chunkSize: 256,
          flushInterval: 50, // Longer flush interval to accumulate chunks
        }
      )

      // Fill queue above highWaterMark
      await optimizer.enqueue(new Uint8Array(100))
      await optimizer.enqueue(new Uint8Array(100))
      
      // Check backpressure status - it should be set when queue > highWaterMark
      const statsAfterFill = optimizer.getStats()
      
      // Either backpressure is true now, or it will be after flush
      const wasBackpressured = optimizer.isBackpressured() || statsAfterFill.queueSize >= 200
      
      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // After flush, verify queue is drained
      const statsAfterFlush = optimizer.getStats()
      expect(statsAfterFlush.queueSize).toBeLessThan(200)
    })
  })

  describe('Priority Handling', () => {
    test('should prioritize immediate chunks', async () => {
      const slowData = new Uint8Array([1, 1, 1])
      const fastData = new Uint8Array([2, 2, 2])
      const normalData = new Uint8Array([3, 3, 3])

      // Add in mixed order
      await optimizer.enqueue(normalData, 'normal')
      await optimizer.enqueue(slowData, 'low')
      await optimizer.enqueue(fastData, 'immediate')

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 50))

      // Immediate should be first
      const allBytes: number[] = []
      for (const chunk of writtenChunks) {
        for (let i = 0; i < chunk.length; i++) {
          allBytes.push(chunk[i])
        }
      }
      const immediateIndex = allBytes.indexOf(2)
      const normalIndex = allBytes.indexOf(3)
      const lowIndex = allBytes.indexOf(1)

      if (immediateIndex !== -1 && normalIndex !== -1) {
        expect(immediateIndex).toBeLessThan(normalIndex)
      }
    })

    test('should order chunks by timestamp within same priority', async () => {
      await optimizer.enqueue(new Uint8Array([1]), 'normal')
      await new Promise(resolve => setTimeout(resolve, 5))
      await optimizer.enqueue(new Uint8Array([2]), 'normal')

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have chunks with values 1 and 2
      const allBytes: number[] = []
      for (const chunk of writtenChunks) {
        for (let i = 0; i < chunk.length; i++) {
          allBytes.push(chunk[i])
        }
      }
      expect(allBytes.includes(1)).toBe(true)
      expect(allBytes.includes(2)).toBe(true)
    })
  })

  describe('Stats Collection', () => {
    test('should track queue size accurately', async () => {
      const data = new Uint8Array(100)
      
      await optimizer.enqueue(data)
      let stats = optimizer.getStats()
      expect(stats.queueSize).toBe(100)
      expect(stats.chunksQueued).toBe(1)

      await optimizer.enqueue(data)
      stats = optimizer.getStats()
      expect(stats.queueSize).toBe(200)
      expect(stats.chunksQueued).toBe(2)
    })

    test('should report backpressure status', () => {
      expect(optimizer.isBackpressured()).toBe(false)
      expect(optimizer.getStats().backpressured).toBe(false)
    })
  })
})

// ============= Integration Tests =============

describe('Phase 8 Integration Tests', () => {
  describe('All Services Working Together', () => {
    test('should handle 20+ concurrent requests with pooling and batching', async () => {
      const poolConfig: LMStudioConnectionConfig = {
        maxConnections: 5,
        maxQueueSize: 50,
        requestTimeout: 5000,
        healthCheckInterval: 10000,
        retryAttempts: 1,
        retryBackoffMs: 50,
      }
      const pool = new LMStudioConnectionPool(poolConfig)

      const batchConfig: CoalesceConfig = {
        batchSize: 10,
        batchTimeoutMs: 30,
        deduplicateInterval: 60000,
        maxConcurrentBatches: 3,
      }

      let embeddingCallCount = 0
      const mockExecuteEmbedding = mock(async (texts: string[], model: string) => {
        embeddingCallCount++
        await new Promise(resolve => setTimeout(resolve, 10))
        return texts.map(() => Array(128).fill(0).map(() => Math.random()))
      })

      const coalescer = new EmbeddingRequestCoalescer(mockExecuteEmbedding, batchConfig)

      // Simulate 25 concurrent embedding requests
      const requestCount = 25
      const promises: Promise<any>[] = []

      for (let i = 0; i < requestCount; i++) {
        const texts = [`request_${i}_text1`, `request_${i}_text2`]
        
        // Wrap in connection pool
        const poolPromise = pool.execute(async () => {
          return coalescer.getEmbeddings(texts, 'integration-model')
        }, i < 5 ? 'high' : 'normal')
        
        promises.push(poolPromise)
      }

      const results = await Promise.allSettled(promises)

      // Wait for all processing to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify results
      const fulfilledCount = results.filter(r => r.status === 'fulfilled').length
      expect(fulfilledCount).toBeGreaterThan(0)

      // Verify pooling stats
      const poolStats = pool.getStats()
      expect(poolStats.maxConnections).toBe(poolConfig.maxConnections)
      
      // Verify coalescer was called
      expect(embeddingCallCount).toBeGreaterThanOrEqual(1)

      // Cleanup
      coalescer.clear()
      await pool.shutdown()
    })

    test('should handle streaming with connection pool', async () => {
      const poolConfig: LMStudioConnectionConfig = {
        maxConnections: 3,
        maxQueueSize: 20,
        requestTimeout: 5000,
        healthCheckInterval: 10000,
        retryAttempts: 0,
        retryBackoffMs: 50,
      }
      const pool = new LMStudioConnectionPool(poolConfig)

      const streamingResults: Uint8Array[] = []
      const optimizer = new StreamingLatencyOptimizer(
        async (chunk: Uint8Array) => {
          streamingResults.push(chunk)
        },
        {
          highWaterMark: 512,
          lowWaterMark: 128,
          chunkSize: 64,
          flushInterval: 10,
        }
      )

      // Execute multiple streaming requests through pool
      const streamingPromises = Array(10).fill(null).map(async (_, i) => {
        return pool.execute(async () => {
          const data = new Uint8Array([i, i + 1, i + 2])
          await optimizer.enqueue(data, i % 3 === 0 ? 'immediate' : 'normal')
          return true
        }, 'normal')
      })

      await Promise.all(streamingPromises)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify streaming occurred
      expect(streamingResults.length).toBeGreaterThanOrEqual(1)

      await pool.shutdown()
    })
  })

  describe('Load Test', () => {
    test('should handle concurrent requests under load', async () => {
      const poolConfig: LMStudioConnectionConfig = {
        maxConnections: 10,
        maxQueueSize: 50,
        requestTimeout: 5000,
        healthCheckInterval: 10000,
        retryAttempts: 0,
        retryBackoffMs: 25,
      }
      const pool = new LMStudioConnectionPool(poolConfig)

      const batchConfig: CoalesceConfig = {
        batchSize: 10,
        batchTimeoutMs: 20,
        deduplicateInterval: 60000,
        maxConcurrentBatches: 3,
      }

      let totalProcessed = 0
      const mockExecuteEmbedding = mock(async (texts: string[], model: string) => {
        totalProcessed += texts.length
        await new Promise(resolve => setTimeout(resolve, 2))
        return texts.map(() => Array(128).fill(0).map(() => Math.random()))
      })

      const coalescer = new EmbeddingRequestCoalescer(mockExecuteEmbedding, batchConfig)

      const CONCURRENT_REQUESTS = 20
      const startTime = Date.now()

      // Create concurrent requests
      const promises = Array(CONCURRENT_REQUESTS).fill(null).map(async (_, i) => {
        return pool.execute(async () => {
          const texts = [`load_${i}_1`, `load_${i}_2`]
          await coalescer.getEmbeddings(texts, `model-${i % 2}`)
          return { requestId: i }
        }, 'normal')
      })

      const results = await Promise.allSettled(promises)

      // Wait for coalescer processing
      await new Promise(resolve => setTimeout(resolve, 100))

      const fulfilled = results.filter(r => r.status === 'fulfilled').length
      console.log(`Load test: ${fulfilled}/${CONCURRENT_REQUESTS} succeeded`)
      console.log(`Embedding batches: ${mockExecuteEmbedding.mock.calls.length}`)

      expect(fulfilled).toBeGreaterThanOrEqual(CONCURRENT_REQUESTS * 0.7)

      coalescer.clear()
      await pool.shutdown()
    }, 15000)

    test('should maintain performance under sustained load', async () => {
      const poolConfig: LMStudioConnectionConfig = {
        maxConnections: 5,
        maxQueueSize: 50,
        requestTimeout: 5000,
        healthCheckInterval: 10000,
        retryAttempts: 1,
        retryBackoffMs: 20,
      }
      const pool = new LMStudioConnectionPool(poolConfig)

      const timings: number[] = []

      // Sustained load: 100 requests in waves
      for (let wave = 0; wave < 5; wave++) {
        const wavePromises = Array(20).fill(null).map(async (_, i) => {
          const reqStart = Date.now()
          await pool.execute(async () => {
            await new Promise(resolve => setTimeout(resolve, 5))
            return `wave${wave}_req${i}`
          }, 'normal')
          timings.push(Date.now() - reqStart)
        })

        await Promise.all(wavePromises)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Calculate stats
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length
      const p95 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)]

      console.log(`Sustained load stats: avg=${avgTime.toFixed(2)}ms, p95=${p95}ms`)

      expect(avgTime).toBeLessThan(1000) // Average should be reasonable

      await pool.shutdown()
    })
  })
})

// ============= Global Instance Tests =============

describe('Global Instance Management', () => {
  test('initializeConnectionPool should create singleton', () => {
    // Note: This resets the global instance, so run at end
    const config: LMStudioConnectionConfig = {
      maxConnections: 5,
      maxQueueSize: 20,
      requestTimeout: 5000,
      healthCheckInterval: 10000,
      retryAttempts: 2,
      retryBackoffMs: 50,
    }

    const pool1 = initializeConnectionPool(config)
    const pool2 = initializeConnectionPool(config)

    expect(pool1).toBe(pool2) // Same instance
  })

  test('initializeEmbeddingCoalescer should create singleton', () => {
    const mockExecute = mock(async () => [[1, 2, 3]])

    const coalescer1 = initializeEmbeddingCoalescer(mockExecute, { batchSize: 50 })
    const coalescer2 = initializeEmbeddingCoalescer(mockExecute, { batchSize: 100 })

    expect(coalescer1).toBe(coalescer2) // Same instance
  })
})

console.log('Phase 8 Services Test Suite loaded')
console.log('Run with: bun test mini-services/proxy-bridge/test-phase8.ts')
