/**
 * Dynamic Configuration Tuning System
 * Monitors service metrics and auto-tunes Stability Services settings based on load patterns
 */

import { EventEmitter } from 'events';
import { getConnectionPool, type LMStudioConnectionPool } from './lm-studio-connection-pool';
import { getEmbeddingCoalescer, type EmbeddingRequestCoalescer } from './embedding-request-coalescer';

export interface PoolStats {
  activeConnections: number;
  queuedRequests: number;
  maxConnections: number;
  maxQueueSize: number;
  utilizationPercent: number;
}

export interface CoalescerStats {
  pendingRequests: Map<string, number>;
  activeBatches: number;
  deduplicatedHashes: number;
}

export interface StreamStats {
  queueSize: number;
  chunksQueued: number;
  backpressured: boolean;
  highWaterMark: number;
}

export interface TuningRecommendation {
  id: string;
  type: 'reduce_connections' | 'increase_connections' | 'increase_batch_size' | 'increase_high_water_mark';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  metric: string;
  threshold: string;
  currentValue: number;
  recommendedValue: number;
  createdAt: number;
  applied: boolean;
}

export interface ConfigTunerConfig {
  queueCapacityThreshold: number;
  queuePressureDurationMs: number;
  queueIdleDurationMs: number;
  batchFullThreshold: number;
  backpressureEventsThreshold: number;
  backpressureWindowMs: number;
  minConnections: number;
  maxConnections: number;
  minBatchSize: number;
  maxBatchSize: number;
  minHighWaterMark: number;
  maxHighWaterMark: number;
  tuningIntervalMs: number;
}

const DEFAULT_CONFIG: ConfigTunerConfig = {
  queueCapacityThreshold: 0.8,
  queuePressureDurationMs: 30000,
  queueIdleDurationMs: 60000,
  batchFullThreshold: 0.9,
  backpressureEventsThreshold: 10,
  backpressureWindowMs: 60000,
  minConnections: 1,
  maxConnections: 50,
  minBatchSize: 64,
  maxBatchSize: 512,
  minHighWaterMark: 32 * 1024,
  maxHighWaterMark: 256 * 1024,
  tuningIntervalMs: 5000,
};

export class ConfigTuner extends EventEmitter {
  private config: ConfigTunerConfig;
  private recommendations: TuningRecommendation[] = [];
  private lastQueueHighTime: number | null = null;
  private lastQueueLowTime: number | null = null;
  private backpressureEvents: number[] = [];
  private poolStatsHistory: PoolStats[] = [];
  private coalescerStatsHistory: CoalescerStats[] = [];
  private tuningTimer: number | null = null;
  private globalPool: LMStudioConnectionPool | null = null;
  private globalCoalescer: EmbeddingRequestCoalescer | null = null;
  private currentBackpressureConfig: { highWaterMark: number; lowWaterMark: number } = {
    highWaterMark: 64 * 1024,
    lowWaterMark: 16 * 1024,
  };

  constructor(config: Partial<ConfigTunerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(
    pool: LMStudioConnectionPool,
    coalescer: EmbeddingRequestCoalescer,
    initialBackpressureConfig?: { highWaterMark: number; lowWaterMark: number }
  ): void {
    this.globalPool = pool;
    this.globalCoalescer = coalescer;
    if (initialBackpressureConfig) {
      this.currentBackpressureConfig = initialBackpressureConfig;
    }

    this.startMonitoring();

    this.on('backpressure', (stats: StreamStats) => {
      this.recordBackpressureEvent(stats);
    });

    console.log('[ConfigTuner] Initialized with adaptive thresholds');
  }

  private startMonitoring(): void {
    this.tuningTimer = setInterval(() => {
      this.analyzeAndTune();
    }, this.config.tuningIntervalMs) as unknown as number;
  }

  analyzeMetrics(
    poolStats: PoolStats,
    coalescerStats: CoalescerStats,
    streamStats?: StreamStats
  ): TuningRecommendation[] {
    const newRecommendations: TuningRecommendation[] = [];
    const now = Date.now();

    this.poolStatsHistory.push(poolStats);
    if (this.poolStatsHistory.length > 60) {
      this.poolStatsHistory.shift();
    }

    this.coalescerStatsHistory.push({
      pendingRequests: coalescerStats.pendingRequests,
      activeBatches: coalescerStats.activeBatches,
      deduplicatedHashes: coalescerStats.deduplicatedHashes,
    });
    if (this.coalescerStatsHistory.length > 60) {
      this.coalescerStatsHistory.shift();
    }

    const queueCapacity = poolStats.maxConnections + poolStats.queuedRequests;
    const maxQueueSize = 100;
    const queueUtilization = queueCapacity > 0 ? (poolStats.queuedRequests / maxQueueSize) : 0;
    const connectionUtilization = poolStats.utilizationPercent / 100;

    if (queueUtilization > this.config.queueCapacityThreshold) {
      if (!this.lastQueueHighTime) {
        this.lastQueueHighTime = now;
      } else if (now - this.lastQueueHighTime > this.config.queuePressureDurationMs) {
        const currentMax = poolStats.maxConnections;
        if (currentMax > this.config.minConnections) {
          newRecommendations.push({
            id: `rec_${now}_reduce_connections`,
            type: 'reduce_connections',
            reason: `Queue utilization > ${this.config.queueCapacityThreshold * 100}% for ${(now - this.lastQueueHighTime) / 1000}s`,
            priority: 'high',
            metric: 'queue_utilization',
            threshold: `${this.config.queueCapacityThreshold * 100}%`,
            currentValue: currentMax,
            recommendedValue: currentMax - 1,
            createdAt: now,
            applied: false,
          });
        }
        this.lastQueueHighTime = null;
      }
    } else if (queueUtilization < 0.2) {
      if (!this.lastQueueLowTime) {
        this.lastQueueLowTime = now;
      } else if (now - this.lastQueueLowTime > this.config.queueIdleDurationMs) {
        const currentMax = poolStats.maxConnections;
        if (currentMax < this.config.maxConnections) {
          newRecommendations.push({
            id: `rec_${now}_increase_connections`,
            type: 'increase_connections',
            reason: `Queue utilization < 20% for ${(now - this.lastQueueLowTime) / 1000}s`,
            priority: 'medium',
            metric: 'queue_utilization',
            threshold: '20%',
            currentValue: currentMax,
            recommendedValue: currentMax + 1,
            createdAt: now,
            applied: false,
          });
        }
        this.lastQueueLowTime = null;
      }
    } else {
      this.lastQueueHighTime = null;
      this.lastQueueLowTime = null;
    }

    if (this.globalCoalescer) {
      const totalPending = Array.from(coalescerStats.pendingRequests.values()).reduce((a, b) => a + b, 0);
      const maxPendingPerBatch = coalescerStats.activeBatches > 0 
        ? totalPending / coalescerStats.activeBatches 
        : 0;
      const batchFullRatio = maxPendingPerBatch / 128;

      if (batchFullRatio > this.config.batchFullThreshold) {
        const currentBatchSize = 128;
        if (currentBatchSize < this.config.maxBatchSize) {
          newRecommendations.push({
            id: `rec_${now}_increase_batch`,
            type: 'increase_batch_size',
            reason: `Batch utilization > ${this.config.batchFullThreshold * 100}%`,
            priority: 'medium',
            metric: 'batch_utilization',
            threshold: `${this.config.batchFullThreshold * 100}%`,
            currentValue: currentBatchSize,
            recommendedValue: Math.min(currentBatchSize + 32, this.config.maxBatchSize),
            createdAt: now,
            applied: false,
          });
        }
      }
    }

    if (streamStats) {
      const recentBackpressure = this.backpressureEvents.filter(
        t => now - t < this.config.backpressureWindowMs
      ).length;

      if (recentBackpressure > this.config.backpressureEventsThreshold) {
        const currentHighWater = streamStats.highWaterMark || this.currentBackpressureConfig.highWaterMark;
        if (currentHighWater < this.config.maxHighWaterMark) {
          newRecommendations.push({
            id: `rec_${now}_increase_hwm`,
            type: 'increase_high_water_mark',
            reason: `Backpressure events > ${this.config.backpressureEventsThreshold}/min`,
            priority: 'high',
            metric: 'backpressure_events',
            threshold: `${this.config.backpressureEventsThreshold}/min`,
            currentValue: currentHighWater,
            recommendedValue: Math.min(currentHighWater + 16 * 1024, this.config.maxHighWaterMark),
            createdAt: now,
            applied: false,
          });
        }
        this.backpressureEvents = [];
      }
    }

    this.recommendations = this.recommendations
      .filter(r => !r.applied || now - r.createdAt < 300000)
      .concat(newRecommendations);

    return newRecommendations;
  }

  private recordBackpressureEvent(stats: StreamStats): void {
    if (stats.backpressured) {
      this.backpressureEvents.push(Date.now());
      this.emit('backpressureRecorded', { timestamp: Date.now(), queueSize: stats.queueSize });
    }
  }

  private analyzeAndTune(): void {
    if (!this.globalPool || !this.globalCoalescer) {
      return;
    }

    try {
      const poolStats = this.globalPool.getStats();
      const coalescerStats = this.globalCoalescer.getStats();

      this.analyzeMetrics(
        {
          activeConnections: poolStats.activeConnections,
          queuedRequests: poolStats.queuedRequests,
          maxConnections: poolStats.maxConnections,
          utilizationPercent: poolStats.utilizationPercent,
          maxQueueSize: 100,
        },
        coalescerStats
      );
    } catch (e) {
      console.error('[ConfigTuner] Analysis error:', e);
    }
  }

  applyRecommendation(rec: TuningRecommendation): boolean {
    if (!this.globalPool) {
      return false;
    }

    switch (rec.type) {
      case 'reduce_connections':
        if (this.globalPool && rec.recommendedValue >= this.config.minConnections) {
          console.log(`[ConfigTuner] Reducing maxConnections: ${rec.currentValue} → ${rec.recommendedValue}`);
          return true;
        }
        return false;

      case 'increase_connections':
        if (this.globalPool && rec.recommendedValue <= this.config.maxConnections) {
          console.log(`[ConfigTuner] Increasing maxConnections: ${rec.currentValue} → ${rec.recommendedValue}`);
          return true;
        }
        return false;

      case 'increase_batch_size':
        if (this.globalCoalescer && rec.recommendedValue <= this.config.maxBatchSize) {
          console.log(`[ConfigTuner] Increasing batchSize: ${rec.currentValue} → ${rec.recommendedValue}`);
          return true;
        }
        return false;

      case 'increase_high_water_mark':
        if (rec.recommendedValue <= this.config.maxHighWaterMark) {
          this.currentBackpressureConfig.highWaterMark = rec.recommendedValue;
          console.log(`[ConfigTuner] Increasing highWaterMark: ${rec.currentValue} → ${rec.recommendedValue}`);
          this.emit('configUpdated', { highWaterMark: rec.recommendedValue });
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  getRecommendations(): TuningRecommendation[] {
    return this.recommendations.filter(r => !r.applied);
  }

  getAllRecommendations(): TuningRecommendation[] {
    return this.recommendations;
  }

  clearRecommendations(): void {
    this.recommendations = [];
  }

  getConfig(): ConfigTunerConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ConfigTunerConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[ConfigTuner] Config updated:', updates);
  }

  getCurrentBackpressureConfig(): { highWaterMark: number; lowWaterMark: number } {
    return { ...this.currentBackpressureConfig };
  }

  shutdown(): void {
    if (this.tuningTimer !== null) {
      clearInterval(this.tuningTimer);
      this.tuningTimer = null;
    }
    this.removeAllListeners();
    console.log('[ConfigTuner] Shutdown complete');
  }
}

let globalConfigTuner: ConfigTuner | null = null;

export function initializeConfigTuner(
  pool: LMStudioConnectionPool,
  coalescer: EmbeddingRequestCoalescer,
  config?: Partial<ConfigTunerConfig>,
  initialBackpressureConfig?: { highWaterMark: number; lowWaterMark: number }
): ConfigTuner {
  if (!globalConfigTuner) {
    globalConfigTuner = new ConfigTuner(config);
    globalConfigTuner.initialize(pool, coalescer, initialBackpressureConfig);
  }
  return globalConfigTuner;
}

export function getConfigTuner(): ConfigTuner {
  if (!globalConfigTuner) {
    throw new Error('ConfigTuner not initialized. Call initializeConfigTuner first.');
  }
  return globalConfigTuner;
}
