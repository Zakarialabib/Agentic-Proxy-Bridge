/**
 * Performance Dashboard Service
 * Aggregates metrics from all Stability Services for comprehensive performance monitoring
 */

import { EventEmitter } from 'events';
import type { LMStudioConnectionPool } from './lm-studio-connection-pool';
import type { EmbeddingRequestCoalescer } from './embedding-request-coalescer';
import type { PrometheusMetrics } from './prometheus-metrics';

export interface DashboardMetrics {
  overall: {
    health: 'ok' | 'warning' | 'critical';
    score: number;
  };
  connectionPool: {
    active: number;
    max: number;
    utilization: number;
    queued: number;
    trends: {
      avgUtilization: number;
      peakQueue: number;
    };
  };
  embeddingCoalescer: {
    pending: number;
    activeBatches: number;
    deduplicationRate: number;
    avgBatchSize: number;
  };
  streaming: {
    chunksQueued: number;
    backpressureEvents: number;
    avgLatency: number;
  };
  recommendations: string[];
}

export interface HealthStatus {
  status: 'ok' | 'warning' | 'critical';
  checks: {
    connectionPool: {
      status: 'ok' | 'warning' | 'critical';
      message: string;
      details: Record<string, unknown>;
    };
    embeddingCoalescer: {
      status: 'ok' | 'warning' | 'critical';
      message: string;
      details: Record<string, unknown>;
    };
    streaming: {
      status: 'ok' | 'warning' | 'critical';
      message: string;
      details: Record<string, unknown>;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      message: string;
      details: Record<string, unknown>;
    };
  };
  uptime: number;
  timestamp: number;
}

interface HistoricalDataPoint {
  timestamp: number;
  utilization: number;
  queueSize: number;
  pendingEmbeddings: number;
  latency: number;
}

const HISTORY_LENGTH = 300;
const HISTORY_INTERVAL_MS = 1000;

export class PerformanceDashboard extends EventEmitter {
  private connectionPool: LMStudioConnectionPool | null = null;
  private embeddingCoalescer: EmbeddingRequestCoalescer | null = null;
  private prometheusMetrics: PrometheusMetrics | null = null;
  private history: HistoricalDataPoint[] = [];
  private startTime = Date.now();
  private backpressureEvents = 0;
  private latencies: number[] = [];
  private historyTimer: number | null = null;
  private maxHistoryPoints = HISTORY_LENGTH;

  constructor() {
    super();
  }

  initialize(
    connectionPool: LMStudioConnectionPool,
    embeddingCoalescer: EmbeddingRequestCoalescer,
    prometheusMetrics: PrometheusMetrics
  ): void {
    this.connectionPool = connectionPool;
    this.embeddingCoalescer = embeddingCoalescer;
    this.prometheusMetrics = prometheusMetrics;

    this.startHistoryCollection();
    console.log('[Dashboard] Performance dashboard initialized');
  }

  private startHistoryCollection(): void {
    this.historyTimer = setInterval(() => {
      this.collectHistoricalDataPoint();
    }, HISTORY_INTERVAL_MS) as unknown as number;
  }

  private collectHistoricalDataPoint(): void {
    const poolStats = this.connectionPool?.getStats();
    const coalescerStats = this.embeddingCoalescer?.getStats();

    let totalPending = 0;
    if (coalescerStats?.pendingRequests) {
      for (const count of coalescerStats.pendingRequests.values()) {
        totalPending += count;
      }
    }

    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    this.history.push({
      timestamp: Date.now(),
      utilization: poolStats?.utilizationPercent ?? 0,
      queueSize: poolStats?.queuedRequests ?? 0,
      pendingEmbeddings: totalPending,
      latency: avgLatency,
    });

    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    if (this.latencies.length > 100) {
      this.latencies = this.latencies.slice(-100);
    }
  }

  recordBackpressureEvent(): void {
    this.backpressureEvents++;
  }

  recordLatency(ms: number): void {
    this.latencies.push(ms);
  }

  getDashboardMetrics(): DashboardMetrics {
    const poolStats = this.connectionPool?.getStats();
    const coalescerStats = this.embeddingCoalescer?.getStats();
    const metricsSnapshot = this.prometheusMetrics?.getSnapshot();

    let totalPending = 0;
    let maxBatchSize = 0;
    if (coalescerStats?.pendingRequests) {
      for (const count of coalescerStats.pendingRequests.values()) {
        totalPending += count;
        if (count > maxBatchSize) maxBatchSize = count;
      }
    }

    const fiveMinutesAgo = Date.now() - 300000;
    const recentHistory = this.history.filter(p => p.timestamp > fiveMinutesAgo);

    const avgUtilization = recentHistory.length > 0
      ? recentHistory.reduce((a, b) => a + b.utilization, 0) / recentHistory.length
      : poolStats?.utilizationPercent ?? 0;

    const peakQueue = recentHistory.length > 0
      ? Math.max(...recentHistory.map(p => p.queueSize))
      : poolStats?.queuedRequests ?? 0;

    const totalRequests = metricsSnapshot?.connectionPool.requestsTotal ?? 0;
    const deduplicated = metricsSnapshot?.embeddingCoalescer.deduplicatedTotal ?? 0;
    const deduplicationRate = totalRequests > 0 ? deduplicated / totalRequests : 0;

    const avgLatency = this.latencies.length > 0
      ? this.latencies.slice(-50).reduce((a, b) => a + b, 0) / Math.min(this.latencies.length, 50)
      : 0;

    const health = this.calculateHealth(poolStats, coalescerStats);
    const score = this.calculateScore(poolStats, coalescerStats, avgUtilization);
    const recommendations = this.generateRecommendations(poolStats, coalescerStats, avgUtilization);

    return {
      overall: {
        health,
        score,
      },
      connectionPool: {
        active: poolStats?.activeConnections ?? 0,
        max: poolStats?.maxConnections ?? 10,
        utilization: poolStats?.utilizationPercent ?? 0,
        queued: poolStats?.queuedRequests ?? 0,
        trends: {
          avgUtilization: Math.round(avgUtilization * 100) / 100,
          peakQueue,
        },
      },
      embeddingCoalescer: {
        pending: totalPending,
        activeBatches: coalescerStats?.activeBatches ?? 0,
        deduplicationRate: Math.round(deduplicationRate * 100) / 100,
        avgBatchSize: maxBatchSize || 64,
      },
      streaming: {
        chunksQueued: 0,
        backpressureEvents: this.backpressureEvents,
        avgLatency: Math.round(avgLatency * 100) / 100,
      },
      recommendations,
    };
  }

  private calculateHealth(
    poolStats: ReturnType<LMStudioConnectionPool['getStats']> | undefined,
    coalescerStats: ReturnType<EmbeddingRequestCoalescer['getStats']> | undefined
  ): 'ok' | 'warning' | 'critical' {
    const poolUtilization = poolStats?.utilizationPercent ?? 0;
    const poolQueue = poolStats?.queuedRequests ?? 0;
    const maxQueue = poolStats?.maxConnections ? poolStats.maxConnections * 10 : 100;

    let severity: 'ok' | 'warning' | 'critical' = 'ok';

    if (poolUtilization > 90 || poolQueue > maxQueue * 0.8) {
      severity = 'critical';
    } else if (poolUtilization > 70 || poolQueue > maxQueue * 0.5) {
      severity = 'warning';
    }

    return severity;
  }

  private calculateScore(
    poolStats: ReturnType<LMStudioConnectionPool['getStats']> | undefined,
    coalescerStats: ReturnType<EmbeddingRequestCoalescer['getStats']> | undefined,
    avgUtilization: number
  ): number {
    let score = 100;

    const poolUtilization = poolStats?.utilizationPercent ?? 0;
    if (poolUtilization > 80) {
      score -= 20;
    } else if (poolUtilization > 60) {
      score -= 10;
    }

    const poolQueue = poolStats?.queuedRequests ?? 0;
    const maxQueue = poolStats?.maxConnections ? poolStats.maxConnections * 10 : 100;
    if (poolQueue > maxQueue * 0.7) {
      score -= 25;
    } else if (poolQueue > maxQueue * 0.4) {
      score -= 15;
    }

    let pendingEmbeddings = 0;
    if (coalescerStats?.pendingRequests) {
      for (const count of coalescerStats.pendingRequests.values()) {
        pendingEmbeddings += count;
      }
    }
    if (pendingEmbeddings > 100) {
      score -= 15;
    } else if (pendingEmbeddings > 50) {
      score -= 10;
    }

    if (this.backpressureEvents > 10) {
      score -= 15;
    } else if (this.backpressureEvents > 5) {
      score -= 10;
    }

    if (avgUtilization < 20 && this.history.length > 10) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateRecommendations(
    poolStats: ReturnType<LMStudioConnectionPool['getStats']> | undefined,
    coalescerStats: ReturnType<EmbeddingRequestCoalescer['getStats']> | undefined,
    avgUtilization: number
  ): string[] {
    const recommendations: string[] = [];
    const maxConnections = poolStats?.maxConnections ?? 10;
    const poolUtilization = poolStats?.utilizationPercent ?? 0;

    if (poolUtilization > 60 && maxConnections < 15) {
      recommendations.push(`Increase maxConnections to ${maxConnections + 2}`);
    }

    if (poolUtilization < 30 && maxConnections > 5) {
      recommendations.push('Consider reducing maxConnections to save resources');
    }

    let pendingEmbeddings = 0;
    if (coalescerStats?.pendingRequests) {
      for (const count of coalescerStats.pendingRequests.values()) {
        pendingEmbeddings += count;
      }
    }

    if (pendingEmbeddings > 50 && coalescerStats?.activeBatches === 3) {
      recommendations.push('Consider increasing maxConcurrentBatches for embeddings');
    }

    if (pendingEmbeddings < 10 && coalescerStats?.activeBatches === 3) {
      recommendations.push('Batch size optimal');
    }

    if (this.backpressureEvents > 5) {
      recommendations.push('Review streaming buffer sizes for backpressure');
    }

    if (avgUtilization > 80) {
      recommendations.push('Connection pool near capacity - monitor closely');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating optimally');
    }

    return recommendations;
  }

  getHealthStatus(): HealthStatus {
    const poolStats = this.connectionPool?.getStats();
    const coalescerStats = this.embeddingCoalescer?.getStats();

  function getHeapUsedMB(): number {
    try {
      return Math.round((Bun as any).memory?.heap?.used ?? 0 / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  function getHeapTotalMB(): number {
    try {
      return Math.round((Bun as any).memory?.heap?.total ?? 0 / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  const heapUsedMB = getHeapUsedMB();

    let totalPending = 0;
    if (coalescerStats?.pendingRequests) {
      for (const count of coalescerStats.pendingRequests.values()) {
        totalPending += count;
      }
    }

    const poolUtilization = poolStats?.utilizationPercent ?? 0;
    const poolQueue = poolStats?.queuedRequests ?? 0;
    const maxQueue = poolStats?.maxConnections ? poolStats.maxConnections * 10 : 100;

    let poolStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let poolMessage = `${poolStats?.activeConnections ?? 0}/${poolStats?.maxConnections ?? 10} connections active`;
    if (poolUtilization > 90 || poolQueue > maxQueue) {
      poolStatus = 'critical';
      poolMessage = 'Connection pool at capacity';
    } else if (poolUtilization > 70 || poolQueue > maxQueue * 0.5) {
      poolStatus = 'warning';
      poolMessage = 'Connection pool utilization high';
    }

    let embedStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let embedMessage = `${coalescerStats?.activeBatches ?? 0} active batches, ${totalPending} pending`;
    if (totalPending > 100) {
      embedStatus = 'critical';
      embedMessage = 'High pending embedding requests';
    } else if (totalPending > 50) {
      embedStatus = 'warning';
      embedMessage = 'Elevated pending embedding requests';
    }

    const streamStatus: 'ok' | 'warning' | 'critical' = this.backpressureEvents > 10 ? 'warning' : 'ok';
    const streamMessage = this.backpressureEvents > 0
      ? `${this.backpressureEvents} backpressure events`
      : 'Streaming normal';

    let memStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let memMessage = `${heapUsedMB}MB heap used`;
    if (heapUsedMB > 300) {
      memStatus = 'critical';
      memMessage = 'High memory pressure';
    } else if (heapUsedMB > 200) {
      memStatus = 'warning';
      memMessage = 'Moderate memory usage';
    }

    const overallStatus: 'ok' | 'warning' | 'critical' =
      poolStatus === 'critical' || embedStatus === 'critical' || memStatus === 'critical'
        ? 'critical'
        : poolStatus === 'warning' || embedStatus === 'warning' || memStatus === 'warning'
          ? 'warning'
          : 'ok';

    return {
      status: overallStatus,
      checks: {
        connectionPool: {
          status: poolStatus,
          message: poolMessage,
          details: {
            active: poolStats?.activeConnections ?? 0,
            max: poolStats?.maxConnections ?? 10,
            utilization: poolUtilization,
            queued: poolQueue,
          },
        },
        embeddingCoalescer: {
          status: embedStatus,
          message: embedMessage,
          details: {
            pending: totalPending,
            activeBatches: coalescerStats?.activeBatches ?? 0,
            deduplicatedHashes: coalescerStats?.deduplicatedHashes ?? 0,
          },
        },
        streaming: {
          status: streamStatus,
          message: streamMessage,
          details: {
            backpressureEvents: this.backpressureEvents,
            avgLatency: this.latencies.length > 0
              ? this.latencies.slice(-20).reduce((a, b) => a + b, 0) / Math.min(this.latencies.length, 20)
              : 0,
          },
        },
        memory: {
          status: memStatus,
          message: memMessage,
          details: {
            heapUsedMB: heapUsedMB,
            heapTotalMB: getHeapTotalMB(),
          },
        },
      },
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
    };
  }

  getHistoricalData(minutes: number = 5): HistoricalDataPoint[] {
    const cutoff = Date.now() - minutes * 60000;
    return this.history.filter(p => p.timestamp > cutoff);
  }

  reset(): void {
    this.backpressureEvents = 0;
    this.latencies = [];
    this.history = [];
    this.startTime = Date.now();
  }

  shutdown(): void {
    if (this.historyTimer) {
      clearInterval(this.historyTimer);
      this.historyTimer = null;
    }
  }
}

let globalDashboard: PerformanceDashboard | null = null;

export function initializePerformanceDashboard(
  connectionPool: LMStudioConnectionPool,
  embeddingCoalescer: EmbeddingRequestCoalescer,
  prometheusMetrics: PrometheusMetrics
): PerformanceDashboard {
  if (!globalDashboard) {
    globalDashboard = new PerformanceDashboard();
    globalDashboard.initialize(connectionPool, embeddingCoalescer, prometheusMetrics);
  }
  return globalDashboard;
}

export function getPerformanceDashboard(): PerformanceDashboard {
  if (!globalDashboard) {
    throw new Error('Performance dashboard not initialized. Call initializePerformanceDashboard first.');
  }
  return globalDashboard;
}
