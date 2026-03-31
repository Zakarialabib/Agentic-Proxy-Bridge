/**
 * Performance Advisor Service
 * Analyzes metrics and provides optimization recommendations
 */

import { getPrometheusMetrics } from "./prometheus-metrics";

export type Priority = "high" | "medium" | "low";

export interface Rule {
  id: string;
  name: string;
  check: (metrics: MetricsSnapshot) => boolean;
  recommendation: string;
  priority: Priority;
  estimatedImpact: string;
  action?: () => void;
}

export interface MetricsSnapshot {
  connectionPool: {
    activeConnections: number;
    queueSize: number;
    utilization: number;
    maxConnections: number;
    requestsTotal: number;
    retriesTotal: number;
    errorsTotal: number;
  };
  embeddingCoalescer: {
    pendingRequests: number;
    activeBatches: number;
    batchSize: number;
    batchTimeoutMs: number;
    deduplicatedTotal: number;
    batchesProcessedTotal: number;
    textsProcessedTotal: number;
  };
  streaming?: {
    highWaterMark: number;
    chunkSize: number;
    bufferPressure: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    pressure: "low" | "medium" | "high";
  };
}

export interface Recommendation {
  ruleId: string;
  name: string;
  recommendation: string;
  priority: Priority;
  estimatedImpact: string;
  triggered: boolean;
  currentValue?: string;
  suggestedValue?: string;
}

function getMemoryUsage(): { heapUsed: number; heapTotal: number; pressure: "low" | "medium" | "high" } {
  const heapUsed = 150;
  const heapTotal = 512;
  let pressure: "low" | "medium" | "high" = "low";
  if (heapUsed > 300) pressure = "high";
  else if (heapUsed > 150) pressure = "medium";
  return { heapUsed, heapTotal, pressure };
}

const RULES: Rule[] = [
  {
    id: "high-queue-usage",
    name: "High Queue Usage",
    check: (m) => m.connectionPool.utilization > 80 && m.connectionPool.queueSize > 5,
    recommendation: "Reduce maxConnections or increase queue size to handle request bursts",
    priority: "high",
    estimatedImpact: "This could improve P99 latency by 20-30% and reduce request timeouts"
  },
  {
    id: "connection-pool-saturation",
    name: "Connection Pool Saturation",
    check: (m) => m.connectionPool.utilization > 90,
    recommendation: "Increase maxConnections from current value to handle higher concurrency",
    priority: "high",
    estimatedImpact: "This could improve throughput by 40-50% under load"
  },
  {
    id: "low-batching-efficiency",
    name: "Low Batching Efficiency",
    check: (m) => m.embeddingCoalescer.batchSize < 8 && m.embeddingCoalescer.activeBatches > 2,
    recommendation: "Increase batchSize or reduce batchTimeoutMs to improve batching efficiency",
    priority: "medium",
    estimatedImpact: "This could improve embedding throughput by 15-25%"
  },
  {
    id: "high-batch-timeout",
    name: "High Batch Timeout",
    check: (m) => m.embeddingCoalescer.batchTimeoutMs > 200,
    recommendation: "Consider reducing batchTimeoutMs for lower latency, or increase for better throughput",
    priority: "low",
    estimatedImpact: "This could reduce average latency by 10-15% with optimized timeout"
  },
  {
    id: "streaming-backpressure",
    name: "Streaming Backpressure",
    check: (m) => m.streaming && m.streaming.bufferPressure > 80,
    recommendation: "Increase highWaterMark or reduce chunkSize to handle streaming backpressure",
    priority: "high",
    estimatedImpact: "This could improve streaming throughput by 25-35%"
  },
  {
    id: "memory-pressure",
    name: "Memory Pressure",
    check: (m) => m.memory.pressure === "high" || m.memory.pressure === "medium",
    recommendation: "Reduce concurrent batches or maxConnections to alleviate memory pressure",
    priority: "high",
    estimatedImpact: "This could improve stability and reduce OOM errors by 60-70%"
  },
  {
    id: "high-retry-rate",
    name: "High Retry Rate",
    check: (m) => m.connectionPool.requestsTotal > 0 && (m.connectionPool.retriesTotal / m.connectionPool.requestsTotal) > 0.1,
    recommendation: "Review retry configuration and connection timeout settings",
    priority: "medium",
    estimatedImpact: "This could reduce unnecessary load and improve response times by 10-20%"
  },
  {
    id: "high-error-rate",
    name: "High Error Rate",
    check: (m) => m.connectionPool.requestsTotal > 0 && (m.connectionPool.errorsTotal / m.connectionPool.requestsTotal) > 0.05,
    recommendation: "Investigate error logs and check LM Studio connectivity",
    priority: "high",
    estimatedImpact: "This could improve success rate and reduce failed requests by 50-60%"
  },
  {
    id: "low-deduplication",
    name: "Low Request Deduplication",
    check: (m) => m.embeddingCoalescer.pendingRequests > 20 && m.embeddingCoalescer.deduplicatedTotal < m.embeddingCoalescer.pendingRequests * 0.1,
    recommendation: "Review request coalescing window and similarity threshold",
    priority: "low",
    estimatedImpact: "This could reduce redundant embedding computations by 10-20%"
  }
];

export class PerformanceAdvisor {
  private rules: Rule[] = RULES;
  private streamingMetrics: { highWaterMark: number; chunkSize: number; bufferPressure: number } = {
    highWaterMark: 16,
    chunkSize: 4096,
    bufferPressure: 0
  };

  setStreamingMetrics(metrics: { highWaterMark?: number; chunkSize?: number; bufferPressure?: number }): void {
    if (metrics.highWaterMark) this.streamingMetrics.highWaterMark = metrics.highWaterMark;
    if (metrics.chunkSize) this.streamingMetrics.chunkSize = metrics.chunkSize;
    if (metrics.bufferPressure !== undefined) this.streamingMetrics.bufferPressure = metrics.bufferPressure;
  }

  getMetricsSnapshot(): MetricsSnapshot {
    const promMetrics = getPrometheusMetrics().getSnapshot();
    const memory = getMemoryUsage();

    return {
      connectionPool: {
        activeConnections: promMetrics.connectionPool.activeConnections,
        queueSize: promMetrics.connectionPool.queueSize,
        utilization: promMetrics.connectionPool.utilization,
        maxConnections: 10,
        requestsTotal: promMetrics.connectionPool.requestsTotal,
        retriesTotal: promMetrics.connectionPool.retriesTotal,
        errorsTotal: promMetrics.connectionPool.errorsTotal
      },
      embeddingCoalescer: {
        pendingRequests: promMetrics.embeddingCoalescer.pendingRequests,
        activeBatches: promMetrics.embeddingCoalescer.activeBatches,
        batchSize: 10,
        batchTimeoutMs: 100,
        deduplicatedTotal: promMetrics.embeddingCoalescer.deduplicatedTotal,
        batchesProcessedTotal: promMetrics.embeddingCoalescer.batchesProcessedTotal,
        textsProcessedTotal: promMetrics.embeddingCoalescer.textsProcessedTotal
      },
      streaming: this.streamingMetrics,
      memory
    };
  }

  getRecommendations(): Recommendation[] {
    const metrics = this.getMetricsSnapshot();
    const results: Recommendation[] = [];

    for (const rule of this.rules) {
      const triggered = rule.check(metrics);
      results.push({
        ruleId: rule.id,
        name: rule.name,
        recommendation: rule.recommendation,
        priority: rule.priority,
        estimatedImpact: rule.estimatedImpact,
        triggered,
        currentValue: this.getCurrentValue(rule.id, metrics),
        suggestedValue: this.getSuggestedValue(rule.id)
      });
    }

    return results.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  getRecommendation(ruleId: string): Recommendation | null {
    const metrics = this.getMetricsSnapshot();
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return null;

    const triggered = rule.check(metrics);
    return {
      ruleId: rule.id,
      name: rule.name,
      recommendation: rule.recommendation,
      priority: rule.priority,
      estimatedImpact: rule.estimatedImpact,
      triggered,
      currentValue: this.getCurrentValue(rule.id, metrics),
      suggestedValue: this.getSuggestedValue(rule.id)
    };
  }

  getRuleDetails(): { id: string; name: string; priority: Priority; estimatedImpact: string }[] {
    return this.rules.map(r => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      estimatedImpact: r.estimatedImpact
    }));
  }

  private getCurrentValue(ruleId: string, metrics: MetricsSnapshot): string | undefined {
    switch (ruleId) {
      case "high-queue-usage":
        return `${metrics.connectionPool.queueSize} queued, ${metrics.connectionPool.utilization.toFixed(1)}% utilization`;
      case "connection-pool-saturation":
        return `${metrics.connectionPool.activeConnections}/${metrics.connectionPool.maxConnections}`;
      case "low-batching-efficiency":
        return `batchSize: ${metrics.embeddingCoalescer.batchSize}, active: ${metrics.embeddingCoalescer.activeBatches}`;
      case "high-batch-timeout":
        return `${metrics.embeddingCoalescer.batchTimeoutMs}ms`;
      case "streaming-backpressure":
        return `${metrics.streaming?.bufferPressure}% buffer pressure`;
      case "memory-pressure":
        return `${metrics.memory.heapUsed.toFixed(1)}MB heap used`;
      case "high-retry-rate":
        return `${((metrics.connectionPool.retriesTotal / Math.max(1, metrics.connectionPool.requestsTotal)) * 100).toFixed(1)}%`;
      case "high-error-rate":
        return `${((metrics.connectionPool.errorsTotal / Math.max(1, metrics.connectionPool.requestsTotal)) * 100).toFixed(1)}%`;
      case "low-deduplication":
        return `${metrics.embeddingCoalescer.deduplicatedTotal} deduplicated / ${metrics.embeddingCoalescer.pendingRequests} pending`;
      default:
        return undefined;
    }
  }

  private getSuggestedValue(ruleId: string): string | undefined {
    switch (ruleId) {
      case "high-queue-usage":
        return "Increase maxConnections to 15 or queueSize to 50";
      case "connection-pool-saturation":
        return "Increase maxConnections to 20";
      case "low-batching-efficiency":
        return "Increase batchSize to 16 or reduce batchTimeoutMs to 50";
      case "high-batch-timeout":
        return "Adjust based on latency vs throughput tradeoff";
      case "streaming-backpressure":
        return "Increase highWaterMark to 32 or reduce chunkSize to 2048";
      case "memory-pressure":
        return "Reduce maxConnections to 8 or concurrent batches to 2";
      default:
        return undefined;
    }
  }

  applyAction(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule?.action) {
      rule.action();
      return true;
    }
    return false;
  }
}

let advisorInstance: PerformanceAdvisor | null = null;

export function getPerformanceAdvisor(): PerformanceAdvisor {
  if (!advisorInstance) {
    advisorInstance = new PerformanceAdvisor();
  }
  return advisorInstance;
}

export function initializePerformanceAdvisor(): PerformanceAdvisor {
  return getPerformanceAdvisor();
}