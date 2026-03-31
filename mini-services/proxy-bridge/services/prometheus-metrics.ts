/**
 * Prometheus Metrics for Phase 8 Services
 * Provides Prometheus-compatible metrics for connection pool and embedding coalescer
 */

interface MetricValue {
  value: number;
  timestamp: number;
}

interface Counter {
  value: number;
}

interface Gauge {
  value: number;
}

class PrometheusRegistry {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private helpTexts: Map<string, string> = new Map();
  private metricTypes: Map<string, string> = new Map();

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { value: 0 });
      this.helpTexts.set(name, help);
      this.metricTypes.set(name, 'counter');
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { value: 0 });
      this.helpTexts.set(name, help);
      this.metricTypes.set(name, 'gauge');
    }
  }

  incCounter(name: string, delta: number = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.value += delta;
    }
  }

  setGauge(name: string, value: number): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.value = value;
    }
  }

  getCounter(name: string): number {
    return this.counters.get(name)?.value ?? 0;
  }

  getGauge(name: string): number {
    return this.gauges.get(name)?.value ?? 0;
  }

  formatMetrics(): string {
    const lines: string[] = [];

    lines.push('# HELP lmstudio_info LM Studio Proxy Bridge info');
    lines.push('# TYPE lmstudio_info gauge');
    lines.push('lmstudio_info{version="1.0.0"} 1');
    lines.push('');

    for (const [name, help] of this.helpTexts) {
      const type = this.metricTypes.get(name);
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);

      if (type === 'counter') {
        lines.push(`${name} ${this.counters.get(name)?.value ?? 0}`);
      } else if (type === 'gauge') {
        lines.push(`${name} ${this.gauges.get(name)?.value ?? 0}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  reset(): void {
    for (const counter of this.counters.values()) {
      counter.value = 0;
    }
    for (const gauge of this.gauges.values()) {
      gauge.value = 0;
    }
  }
}

let registry: PrometheusRegistry | null = null;

function getRegistry(): PrometheusRegistry {
  if (!registry) {
    registry = new PrometheusRegistry();
    initializeMetrics();
  }
  return registry;
}

function initializeMetrics(): void {
  const reg = registry!;

  reg.registerGauge('lmstudio_connection_pool_active', 'Number of active connections in the pool');
  reg.registerGauge('lmstudio_connection_pool_queue_size', 'Number of requests queued');
  reg.registerGauge('lmstudio_connection_pool_utilization_percent', 'Connection pool utilization percentage');
  reg.registerCounter('lmstudio_connection_pool_requests_total', 'Total number of requests processed');
  reg.registerCounter('lmstudio_connection_pool_retries_total', 'Total number of request retries');
  reg.registerCounter('lmstudio_connection_pool_errors_total', 'Total number of request errors');

  reg.registerGauge('lmstudio_embedding_pending_requests', 'Number of pending embedding requests');
  reg.registerGauge('lmstudio_embedding_active_batches', 'Number of active embedding batches');
  reg.registerCounter('lmstudio_embedding_deduplicated_total', 'Total number of deduplicated embedding requests');
  reg.registerCounter('lmstudio_embedding_batches_processed_total', 'Total number of batches processed');
  reg.registerCounter('lmstudio_embedding_texts_processed_total', 'Total number of texts processed in embeddings');
}

export class PrometheusMetrics {
  private poolActiveConnections = 0;
  private poolQueueSize = 0;
  private poolUtilization = 0;
  private poolRequestsTotal = 0;
  private poolRetriesTotal = 0;
  private poolErrorsTotal = 0;

  private embeddingPendingRequests = 0;
  private embeddingActiveBatches = 0;
  private embeddingDeduplicatedTotal = 0;
  private embeddingBatchesProcessedTotal = 0;
  private embeddingTextsProcessedTotal = 0;

  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[Prometheus] Metrics service initialized');
  }

  recordPoolConnectionStart(active: number): void {
    this.poolActiveConnections = active;
    const reg = getRegistry();
    reg.setGauge('lmstudio_connection_pool_active', active);
    reg.incCounter('lmstudio_connection_pool_requests_total');
    this.poolRequestsTotal++;
  }

  recordPoolConnectionEnd(active: number): void {
    this.poolActiveConnections = active;
    const reg = getRegistry();
    reg.setGauge('lmstudio_connection_pool_active', active);
  }

  recordPoolQueueUpdate(queueSize: number): void {
    this.poolQueueSize = queueSize;
    const reg = getRegistry();
    reg.setGauge('lmstudio_connection_pool_queue_size', queueSize);
  }

  recordPoolUtilization(percent: number): void {
    this.poolUtilization = percent;
    const reg = getRegistry();
    reg.setGauge('lmstudio_connection_pool_utilization_percent', percent);
  }

  recordPoolRetry(): void {
    this.poolRetriesTotal++;
    const reg = getRegistry();
    reg.incCounter('lmstudio_connection_pool_retries_total');
  }

  recordPoolError(): void {
    this.poolErrorsTotal++;
    const reg = getRegistry();
    reg.incCounter('lmstudio_connection_pool_errors_total');
  }

  recordEmbeddingPending(pending: number): void {
    this.embeddingPendingRequests = pending;
    const reg = getRegistry();
    reg.setGauge('lmstudio_embedding_pending_requests', pending);
  }

  recordEmbeddingActiveBatches(active: number): void {
    this.embeddingActiveBatches = active;
    const reg = getRegistry();
    reg.setGauge('lmstudio_embedding_active_batches', active);
  }

  recordEmbeddingDeduplicated(): void {
    this.embeddingDeduplicatedTotal++;
    const reg = getRegistry();
    reg.incCounter('lmstudio_embedding_deduplicated_total');
  }

  recordEmbeddingBatchProcessed(textCount: number): void {
    this.embeddingBatchesProcessedTotal++;
    this.embeddingTextsProcessedTotal += textCount;
    const reg = getRegistry();
    reg.incCounter('lmstudio_embedding_batches_processed_total');
    reg.incCounter('lmstudio_embedding_texts_processed_total', textCount);
  }

  updateFromPoolStats(stats: {
    activeConnections: number;
    queuedRequests: number;
    maxConnections: number;
    utilizationPercent: number;
  }): void {
    this.poolActiveConnections = stats.activeConnections;
    this.poolQueueSize = stats.queuedRequests;
    this.poolUtilization = stats.utilizationPercent;
    const reg = getRegistry();
    reg.setGauge('lmstudio_connection_pool_active', stats.activeConnections);
    reg.setGauge('lmstudio_connection_pool_queue_size', stats.queuedRequests);
    reg.setGauge('lmstudio_connection_pool_utilization_percent', stats.utilizationPercent);
  }

  updateFromCoalescerStats(stats: {
    pendingRequests: Map<string, number>;
    activeBatches: number;
    deduplicatedHashes: number;
  }): void {
    let totalPending = 0;
    for (const count of stats.pendingRequests.values()) {
      totalPending += count;
    }
    this.embeddingPendingRequests = totalPending;
    this.embeddingActiveBatches = stats.activeBatches;
    const reg = getRegistry();
    reg.setGauge('lmstudio_embedding_pending_requests', totalPending);
    reg.setGauge('lmstudio_embedding_active_batches', stats.activeBatches);
  }

  getMetrics(): string {
    return getRegistry().formatMetrics();
  }

  getSnapshot(): {
    connectionPool: {
      activeConnections: number;
      queueSize: number;
      utilization: number;
      requestsTotal: number;
      retriesTotal: number;
      errorsTotal: number;
    };
    embeddingCoalescer: {
      pendingRequests: number;
      activeBatches: number;
      deduplicatedTotal: number;
      batchesProcessedTotal: number;
      textsProcessedTotal: number;
    };
  } {
    return {
      connectionPool: {
        activeConnections: this.poolActiveConnections,
        queueSize: this.poolQueueSize,
        utilization: this.poolUtilization,
        requestsTotal: this.poolRequestsTotal,
        retriesTotal: this.poolRetriesTotal,
        errorsTotal: this.poolErrorsTotal,
      },
      embeddingCoalescer: {
        pendingRequests: this.embeddingPendingRequests,
        activeBatches: this.embeddingActiveBatches,
        deduplicatedTotal: this.embeddingDeduplicatedTotal,
        batchesProcessedTotal: this.embeddingBatchesProcessedTotal,
        textsProcessedTotal: this.embeddingTextsProcessedTotal,
      },
    };
  }
}

let globalMetrics: PrometheusMetrics | null = null;

export function initializePrometheusMetrics(): PrometheusMetrics {
  if (!globalMetrics) {
    globalMetrics = new PrometheusMetrics();
    globalMetrics.initialize();
  }
  return globalMetrics;
}

export function getPrometheusMetrics(): PrometheusMetrics {
  if (!globalMetrics) {
    throw new Error('Prometheus metrics not initialized. Call initializePrometheusMetrics first.');
  }
  return globalMetrics;
}

export function formatPrometheusMetrics(): string {
  return getPrometheusMetrics().getMetrics();
}
