/**
 * LMStudio Proxy Bridge - Stateful Observability System
 * 
 * A comprehensive observability layer providing:
 * - Three-Time Horizon (Now/Recent/Deep)
 * - Adaptive VRAM Modes
 * - Confidence Cascade
 * - Living Presets with Lineage
 * - Tool Social Entities
 * - Session Narrative
 * - Failure Learning System
 * - Dual-Purpose Endpoint Wrapper
 * - System Negotiation Interface
 */

import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";

// ============== Configuration ==============

const VRAM_BUDGET_MB = 8192; // Quadro M4000 8GB
const ANOMALY_CHECK_WINDOW_MS = 60000; // 1 minute
const RECENT_WINDOW_MS = 300000; // 5 minutes
const DEEP_WINDOW_MS = 86400000; // 24 hours
const MAX_METRICS_IN_MEMORY = 10000;
const MAX_PATTERNS_IN_MEMORY = 1000;

// ============== Type Definitions ==============

// --- 1. THREE-TIME HORIZON ---

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  source: string;
  detected_at: number;
  acknowledged: boolean;
  auto_resolved: boolean;
}

interface Anomaly {
  id: string;
  metric_name: string;
  expected_value: number;
  actual_value: number;
  deviation_percent: number;
  detected_at: number;
  context: Record<string, unknown>;
}

interface Trend {
  metric_name: string;
  direction: "up" | "down" | "stable";
  slope: number;
  confidence: number;
  data_points: number;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  last_seen: number;
  impact: "high" | "medium" | "low";
}

interface EvolutionMetric {
  metric_name: string;
  baseline_value: number;
  current_value: number;
  evolution_rate: number;
  samples: number;
  period_start: number;
  period_end: number;
}

interface PresetLineage {
  preset_id: string;
  ancestor_ids: string[];
  total_mutations: number;
  successful_mutations: number;
  rolled_back_mutations: number;
  created_at: number;
}

interface LearnedPattern {
  id: string;
  pattern_type: "usage" | "failure" | "optimization" | "correlation";
  pattern_data: Record<string, unknown>;
  confidence: number;
  occurrences: number;
  first_seen: number;
  last_seen: number;
  actionable: boolean;
}

interface TimeHorizon {
  now: {
    alerts: Alert[];
    anomalies: Anomaly[];
    hot_channels: string[];
  };
  recent: {
    health_trends: Trend[];
    patterns: Pattern[];
    optimization_hints: string[];
  };
  deep: {
    evolution: EvolutionMetric[];
    preset_lineage: PresetLineage[];
    learned_patterns: LearnedPattern[];
  };
}

// --- 2. ADAPTIVE VRAM MODES ---

type VRAMMode = "generous" | "stingy" | "emergency";

interface VRAMPersonality {
  mode: VRAMMode;
  reason: string;
  models_resident: string[];
  models_evicted: string[];
  pre_warming_enabled: boolean;
  fragmentation_mb: number;
  pressure_percent: number;
  last_updated: number;
}

// --- 3. CONFIDENCE CASCADE ---

interface HardwareReading {
  timestamp: number;
  vram_used_mb: number;
  vram_total_mb: number;
  gpu_utilization: number;
  memory_bandwidth: number;
  temperature: number;
  power_draw: number;
}

interface SystemDeduction {
  vram_pressure_level: "low" | "medium" | "high" | "critical";
  model_contention: string[];
  predicted_saturation_ms: number;
  optimal_model_set: string[];
  eviction_candidates: string[];
}

interface PredictedState {
  vram_in_30s: number;
  vram_in_60s: number;
  likely_actions: string[];
  confidence: number;
  based_on_patterns: string[];
}

interface ValidationResult {
  prediction_accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  calibration_score: number;
}

interface ConfidenceCascade {
  raw: HardwareReading;
  inferred: SystemDeduction;
  predicted: PredictedState;
  validated: ValidationResult;
}

// --- 4. LIVING PRESETS WITH LINEAGE ---

type PresetStatus = "testing" | "committed" | "rolled_back";

interface Mutation {
  id: string;
  parameter: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  created_at: number;
}

interface TestResult {
  id: string;
  test_type: string;
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  executed_at: number;
}

interface LivingPreset {
  id: string;
  parent_id?: string;
  name: string;
  config: Record<string, unknown>;
  mutations: Mutation[];
  benchmark_score: number;
  status: PresetStatus;
  created_at: number;
  updated_at: number;
  test_results: TestResult[];
  usage_count: number;
}

// --- 5. TOOL SOCIAL ENTITIES ---

type RelationshipType = "dependency" | "substitution" | "conflict" | "synergy";

interface ToolRelationship {
  tool_a: string;
  tool_b: string;
  type: RelationshipType;
  strength: number;
  observations: number;
  last_observed: number;
}

interface ToolRelationships {
  dependencies: Map<string, string[]>;  // Tool A often calls Tool B
  substitutions: Map<string, string[]>; // Tool C can replace Tool A
  conflicts: Map<string, string[]>;     // Tool D and E compete for VRAM
  synergies: Map<string, string[]>;     // Tool F + G together exceed sum
}

// --- 6. SESSION NARRATIVE ---

type NarrativePhaseType = "opening" | "rising_action" | "climax" | "resolution" | "denouement";

interface NarrativePhase {
  type: string;
  start_turn: number;
  end_turn?: number;
  tools_used: string[];
  insights_gained: string[];
  peak_confidence: number;
  key_events: string[];
}

interface SessionNarrative {
  session_id: string;
  phases: NarrativePhase[];
  current_phase: NarrativePhaseType;
  arc_quality: number;
  total_turns: number;
  created_at: number;
  updated_at: number;
}

// --- 7. FAILURE LEARNING SYSTEM ---

interface RemediationAction {
  action: string;
  success: boolean;
  time_ms: number;
  side_effects?: string[];
}

interface FailureRecord {
  id: string;
  detected_at: number;
  type: string;
  characterization: string;
  context: Record<string, unknown>;
  remediation: RemediationAction[];
  pattern_id?: string;
  learning: string;
  recurrence_count: number;
  last_recurrence?: number;
}

// --- 8. TELEMETRY PAYLOAD ---

interface MetricTag {
  key: string;
  value: string;
}

interface MetricRecord {
  name: string;
  value: number;
  tags: MetricTag[];
  timestamp: number;
}

interface TelemetryPayload {
  endpoint: string;
  duration_ms: number;
  success: boolean;
  metrics: MetricRecord[];
  anomalies_detected: Anomaly[];
  vram_delta: number;
  confidence: number;
  timestamp: number;
}

// --- 9. SYSTEM NEGOTIATION ---

interface NegotiationOption {
  id: string;
  label: string;
  description: string;
  impact: string;
  recommended: boolean;
}

interface SystemNegotiation {
  id: string;
  question: string;
  options: NegotiationOption[];
  user_response?: string;
  system_action?: string;
  created_at: number;
  resolved_at?: number;
}

// --- 10. SYSTEM HEALTH ---

interface SystemHealth {
  overall_score: number;
  status: "healthy" | "degraded" | "critical";
  components: {
    vram: { score: number; status: string; message: string };
    models: { score: number; status: string; message: string };
    tools: { score: number; status: string; message: string };
    knowledge: { score: number; status: string; message: string };
    protocols: { score: number; status: string; message: string };
  };
  active_alerts: number;
  recommendations: string[];
  last_updated: number;
}

// ============== Database Schema ==============

function initializeDatabase(db: Database): void {
  // Metrics table
  db.run(`CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    tags TEXT,
    timestamp INTEGER NOT NULL
  )`);
  
  // Alerts table
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    detected_at INTEGER NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    auto_resolved INTEGER DEFAULT 0
  )`);
  
  // Anomalies table
  db.run(`CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    expected_value REAL NOT NULL,
    actual_value REAL NOT NULL,
    deviation_percent REAL NOT NULL,
    detected_at INTEGER NOT NULL,
    context TEXT
  )`);
  
  // Living presets table
  db.run(`CREATE TABLE IF NOT EXISTS living_presets (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    mutations TEXT,
    benchmark_score REAL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    test_results TEXT,
    usage_count INTEGER DEFAULT 0
  )`);
  
  // Tool relationships table
  db.run(`CREATE TABLE IF NOT EXISTS tool_relationships (
    id TEXT PRIMARY KEY,
    tool_a TEXT NOT NULL,
    tool_b TEXT NOT NULL,
    type TEXT NOT NULL,
    strength REAL DEFAULT 1.0,
    observations INTEGER DEFAULT 1,
    last_observed INTEGER NOT NULL
  )`);
  
  // Session narratives table
  db.run(`CREATE TABLE IF NOT EXISTS session_narratives (
    session_id TEXT PRIMARY KEY,
    phases TEXT NOT NULL,
    current_phase TEXT NOT NULL,
    arc_quality REAL NOT NULL,
    total_turns INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  
  // Failure records table
  db.run(`CREATE TABLE IF NOT EXISTS failure_records (
    id TEXT PRIMARY KEY,
    detected_at INTEGER NOT NULL,
    type TEXT NOT NULL,
    characterization TEXT NOT NULL,
    context TEXT,
    remediation TEXT,
    pattern_id TEXT,
    learning TEXT,
    recurrence_count INTEGER DEFAULT 1,
    last_recurrence INTEGER
  )`);
  
  // Learned patterns table
  db.run(`CREATE TABLE IF NOT EXISTS learned_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    pattern_data TEXT NOT NULL,
    confidence REAL NOT NULL,
    occurrences INTEGER DEFAULT 1,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    actionable INTEGER DEFAULT 0
  )`);
  
  // System negotiations table
  db.run(`CREATE TABLE IF NOT EXISTS system_negotiations (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    user_response TEXT,
    system_action TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  )`);
  
  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_failures_type ON failure_records(type)`);
}

// ============== Anomaly Thresholds ==============

interface AnomalyThreshold {
  metric: string;
  min_value?: number;
  max_value?: number;
  max_deviation_percent?: number;
  min_samples: number;
}

const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThreshold[] = [
  { metric: "vram_usage_percent", max_value: 95, max_deviation_percent: 20, min_samples: 5 },
  { metric: "latency_ms", max_value: 30000, max_deviation_percent: 50, min_samples: 3 },
  { metric: "error_rate", max_value: 0.1, max_deviation_percent: 100, min_samples: 3 },
  { metric: "throughput_tps", min_value: 1, max_deviation_percent: 50, min_samples: 5 },
  { metric: "context_window_usage", max_value: 95, max_deviation_percent: 30, min_samples: 3 },
  { metric: "tool_success_rate", min_value: 0.8, max_deviation_percent: 30, min_samples: 5 },
  { metric: "model_load_time_ms", max_value: 10000, max_deviation_percent: 50, min_samples: 3 },
  { metric: "embedding_latency_ms", max_value: 500, max_deviation_percent: 50, min_samples: 5 },
];

// ============== ObservabilitySystem Class ==============

export class ObservabilitySystem {
  private db: Database;
  private metricsCache: MetricRecord[] = [];
  private alerts: Alert[] = [];
  private anomalies: Anomaly[] = [];
  private livingPresets: Map<string, LivingPreset> = new Map();
  private toolRelationships: ToolRelationships = {
    dependencies: new Map(),
    substitutions: new Map(),
    conflicts: new Map(),
    synergies: new Map()
  };
  private sessionNarratives: Map<string, SessionNarrative> = new Map();
  private failures: FailureRecord[] = [];
  private negotiations: SystemNegotiation[] = [];
  private vramPersonality: VRAMPersonality;
  private hardwareReadings: HardwareReading[] = [];
  private predictionHistory: { predicted: number; actual: number; timestamp: number }[] = [];
  
  private anomalyThresholds: Map<string, AnomalyThreshold> = new Map();
  
  constructor(dbPath: string = join(import.meta.dir, "../../db/observability.db")) {
    this.db = new Database(dbPath);
    initializeDatabase(this.db);
    this.loadFromDatabase();
    this.initializeThresholds();
    this.vramPersonality = this.initializeVRAMPersonality();
    
    console.log("[Observability] System initialized");
  }
  
  // ============== Initialization ==============
  
  private initializeThresholds(): void {
    for (const threshold of DEFAULT_ANOMALY_THRESHOLDS) {
      this.anomalyThresholds.set(threshold.metric, threshold);
    }
  }
  
  private initializeVRAMPersonality(): VRAMPersonality {
    return {
      mode: "generous",
      reason: "Initial state - no pressure detected",
      models_resident: [],
      models_evicted: [],
      pre_warming_enabled: true,
      fragmentation_mb: 0,
      pressure_percent: 0,
      last_updated: Date.now()
    };
  }
  
  private loadFromDatabase(): void {
    // Load living presets
    const presets = this.db.prepare("SELECT * FROM living_presets WHERE status != 'rolled_back'").all() as any[];
    for (const preset of presets) {
      this.livingPresets.set(preset.id, {
        ...preset,
        config: JSON.parse(preset.config),
        mutations: JSON.parse(preset.mutations || "[]"),
        test_results: JSON.parse(preset.test_results || "[]")
      });
    }
    
    // Load tool relationships
    const relationships = this.db.prepare("SELECT * FROM tool_relationships").all() as ToolRelationship[];
    for (const rel of relationships) {
      this.addRelationshipToMap(rel);
    }
    
    // Load session narratives
    const narratives = this.db.prepare("SELECT * FROM session_narratives").all() as any[];
    for (const narrative of narratives) {
      this.sessionNarratives.set(narrative.session_id, {
        ...narrative,
        phases: JSON.parse(narrative.phases)
      });
    }
    
    // Load recent failures
    const failures = this.db.prepare(`
      SELECT * FROM failure_records 
      WHERE detected_at > ? 
      ORDER BY detected_at DESC 
      LIMIT 100
    `).all(Date.now() - DEEP_WINDOW_MS) as any[];
    
    for (const failure of failures) {
      this.failures.push({
        ...failure,
        context: JSON.parse(failure.context || "{}"),
        remediation: JSON.parse(failure.remediation || "[]")
      });
    }
    
    console.log(`[Observability] Loaded ${presets.length} presets, ${relationships.length} relationships, ${narratives.length} narratives, ${failures.length} failures`);
  }
  
  private addRelationshipToMap(rel: ToolRelationship): void {
    const mapMap: Record<RelationshipType, Map<string, string[]>> = {
      dependency: this.toolRelationships.dependencies,
      substitution: this.toolRelationships.substitutions,
      conflict: this.toolRelationships.conflicts,
      synergy: this.toolRelationships.synergies
    };
    
    const map = mapMap[rel.type];
    if (!map.has(rel.tool_a)) {
      map.set(rel.tool_a, []);
    }
    const arr = map.get(rel.tool_a)!;
    if (!arr.includes(rel.tool_b)) {
      arr.push(rel.tool_b);
    }
  }
  
  // ============== Core Methods ==============
  
  /**
   * Record a metric with optional tags
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: MetricRecord = {
      name,
      value,
      tags: Object.entries(tags).map(([key, value]) => ({ key, value })),
      timestamp: Date.now()
    };
    
    // Add to cache
    this.metricsCache.push(metric);
    if (this.metricsCache.length > MAX_METRICS_IN_MEMORY) {
      this.flushMetrics();
    }
    
    // Store in database
    this.db.prepare(`
      INSERT INTO metrics (id, name, value, tags, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), name, value, JSON.stringify(tags), metric.timestamp);
    
    // Check for anomalies
    this.checkMetricForAnomaly(metric);
  }
  
  private flushMetrics(): void {
    // Keep only recent metrics in memory
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    this.metricsCache = this.metricsCache.filter(m => m.timestamp > cutoff);
  }
  
  /**
   * Detect anomaly for a specific metric
   */
  detectAnomaly(metricName: string, threshold?: number): Anomaly | null {
    const thresholdConfig = this.anomalyThresholds.get(metricName);
    if (!thresholdConfig) return null;
    
    // Get recent values
    const recentValues = this.metricsCache
      .filter(m => m.name === metricName)
      .slice(-thresholdConfig.min_samples)
      .map(m => m.value);
    
    if (recentValues.length < thresholdConfig.min_samples) return null;
    
    const currentValue = recentValues[recentValues.length - 1];
    const avgValue = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    // Check absolute thresholds
    if (thresholdConfig.max_value !== undefined && currentValue > thresholdConfig.max_value) {
      return this.createAnomaly(metricName, avgValue, currentValue, "exceeds_max");
    }
    if (thresholdConfig.min_value !== undefined && currentValue < thresholdConfig.min_value) {
      return this.createAnomaly(metricName, avgValue, currentValue, "below_min");
    }
    
    // Check deviation
    if (thresholdConfig.max_deviation_percent !== undefined && avgValue !== 0) {
      const deviation = Math.abs(currentValue - avgValue) / avgValue * 100;
      const effectiveThreshold = threshold ?? thresholdConfig.max_deviation_percent;
      if (deviation > effectiveThreshold) {
        return this.createAnomaly(metricName, avgValue, currentValue, "high_deviation", {
          deviation_percent: deviation
        });
      }
    }
    
    return null;
  }
  
  private createAnomaly(
    metricName: string,
    expected: number,
    actual: number,
    type: string,
    extraContext: Record<string, unknown> = {}
  ): Anomaly {
    const anomaly: Anomaly = {
      id: uuidv4(),
      metric_name: metricName,
      expected_value: expected,
      actual_value: actual,
      deviation_percent: expected !== 0 ? Math.abs(actual - expected) / expected * 100 : 0,
      detected_at: Date.now(),
      context: { type, ...extraContext }
    };
    
    this.anomalies.push(anomaly);
    
    // Store in database
    this.db.prepare(`
      INSERT INTO anomalies (id, metric_name, expected_value, actual_value, deviation_percent, detected_at, context)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(anomaly.id, anomaly.metric_name, anomaly.expected_value, anomaly.actual_value, 
           anomaly.deviation_percent, anomaly.detected_at, JSON.stringify(anomaly.context));
    
    // Create alert if significant
    if (anomaly.deviation_percent > 50 || anomaly.context.type === "exceeds_max") {
      this.createAlert("warning", `Anomaly detected in ${metricName}: ${actual.toFixed(2)} (expected ~${expected.toFixed(2)})`, "anomaly_detector");
    }
    
    return anomaly;
  }
  
  private checkMetricForAnomaly(metric: MetricRecord): void {
    const anomaly = this.detectAnomaly(metric.name);
    if (anomaly) {
      console.log(`[Observability] Anomaly detected: ${anomaly.metric_name} = ${anomaly.actual_value}`);
    }
  }
  
  private createAlert(severity: Alert["severity"], message: string, source: string): Alert {
    const alert: Alert = {
      id: uuidv4(),
      severity,
      message,
      source,
      detected_at: Date.now(),
      acknowledged: false,
      auto_resolved: false
    };
    
    this.alerts.unshift(alert);
    if (this.alerts.length > 100) this.alerts.pop();
    
    // Store in database
    this.db.prepare(`
      INSERT INTO alerts (id, severity, message, source, detected_at, acknowledged, auto_resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(alert.id, alert.severity, alert.message, alert.source, alert.detected_at, 0, 0);
    
    return alert;
  }
  
  /**
   * Predict next system state based on current state
   */
  predictNextState(currentState: Record<string, number>): PredictedState {
    const predictions: number[] = [];
    const patterns: string[] = [];
    
    // Get recent trends for key metrics
    const vramTrend = this.calculateTrend("vram_usage_percent");
    const latencyTrend = this.calculateTrend("latency_ms");
    
    // Predict VRAM in 30s and 60s
    const currentVram = currentState.vram_usage_percent ?? 50;
    const vramDelta = vramTrend?.slope ?? 0;
    
    const vramIn30s = Math.min(100, Math.max(0, currentVram + vramDelta * 0.5));
    const vramIn60s = Math.min(100, Math.max(0, currentVram + vramDelta));
    
    predictions.push(vramIn30s, vramIn60s);
    
    // Determine likely actions
    const likelyActions: string[] = [];
    if (vramIn60s > 90) {
      likelyActions.push("evict_cold_models");
      patterns.push("vram_pressure_escalation");
    }
    if (latencyTrend && latencyTrend.slope > 100) {
      likelyActions.push("reduce_context_window");
      patterns.push("latency_degradation");
    }
    if (currentState.error_rate && currentState.error_rate > 0.05) {
      likelyActions.push("enable_fallback_mode");
      patterns.push("error_rate_spike");
    }
    
    // Find matching patterns from history
    const matchedPatterns = this.matchHistoricalPatterns(currentState);
    patterns.push(...matchedPatterns);
    
    // Calculate confidence based on data quality
    const recentMetrics = this.metricsCache.filter(m => m.timestamp > Date.now() - RECENT_WINDOW_MS);
    const confidence = Math.min(0.95, 0.5 + (recentMetrics.length / 1000));
    
    return {
      vram_in_30s: vramIn30s,
      vram_in_60s: vramIn60s,
      likely_actions: likelyActions,
      confidence,
      based_on_patterns: patterns
    };
  }
  
  private calculateTrend(metricName: string): Trend | null {
    const values = this.metricsCache
      .filter(m => m.name === metricName && m.timestamp > Date.now() - RECENT_WINDOW_MS)
      .slice(-20)
      .map(m => ({ value: m.value, time: m.timestamp }));
    
    if (values.length < 3) return null;
    
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((acc, v, i) => acc + i, 0);
    const sumY = values.reduce((acc, v) => acc + v.value, 0);
    const sumXY = values.reduce((acc, v, i) => acc + i * v.value, 0);
    const sumX2 = values.reduce((acc, _, i) => acc + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    let direction: "up" | "down" | "stable" = "stable";
    if (slope > avgY * 0.01) direction = "up";
    else if (slope < -avgY * 0.01) direction = "down";
    
    return {
      metric_name: metricName,
      direction,
      slope,
      confidence: Math.min(0.95, values.length / 20),
      data_points: values.length
    };
  }
  
  private matchHistoricalPatterns(currentState: Record<string, number>): string[] {
    const patterns: string[] = [];
    
    // Check learned patterns
    const learnedPatterns = this.db.prepare(`
      SELECT * FROM learned_patterns 
      WHERE actionable = 1 AND confidence > 0.7
      ORDER BY occurrences DESC
      LIMIT 10
    `).all() as any[];
    
    for (const pattern of learnedPatterns) {
      const data = JSON.parse(pattern.pattern_data);
      // Simple matching - in production would be more sophisticated
      if (data.trigger_conditions) {
        const matches = Object.entries(data.trigger_conditions).every(([key, value]) => {
          return currentState[key] !== undefined && 
                 Math.abs(currentState[key] - (value as number)) < (value as number) * 0.2;
        });
        if (matches) {
          patterns.push(`learned:${pattern.id}`);
        }
      }
    }
    
    return patterns;
  }
  
  // ============== VRAM Management ==============
  
  /**
   * Update VRAM mode based on pressure
   */
  updateVRAMMode(pressure: number): VRAMPersonality {
    const previousMode = this.vramPersonality.mode;
    
    // Determine mode based on pressure
    let newMode: VRAMMode;
    let reason: string;
    
    if (pressure > 90) {
      newMode = "emergency";
      reason = `Critical VRAM pressure at ${pressure.toFixed(1)}%`;
      this.createAlert("critical", reason, "vram_manager");
    } else if (pressure > 75) {
      newMode = "stingy";
      reason = `High VRAM pressure at ${pressure.toFixed(1)}%`;
    } else {
      newMode = "generous";
      reason = `Normal VRAM pressure at ${pressure.toFixed(1)}%`;
    }
    
    // Update personality
    this.vramPersonality = {
      ...this.vramPersonality,
      mode: newMode,
      reason,
      pressure_percent: pressure,
      pre_warming_enabled: newMode === "generous",
      last_updated: Date.now()
    };
    
    // Log mode change
    if (previousMode !== newMode) {
      console.log(`[Observability] VRAM mode changed: ${previousMode} → ${newMode}`);
      this.recordMetric("vram_mode_change", 1, { from: previousMode, to: newMode });
    }
    
    return this.vramPersonality;
  }
  
  /**
   * Get current VRAM personality
   */
  getVRAMPersonality(): VRAMPersonality {
    return { ...this.vramPersonality };
  }
  
  // ============== Preset Evolution ==============
  
  /**
   * Evolve a preset with a mutation
   */
  evolvePreset(presetId: string, mutation: Omit<Mutation, "id" | "created_at">): LivingPreset | null {
    const preset = this.livingPresets.get(presetId);
    if (!preset) {
      // Create new preset
      return this.createPreset(presetId, mutation);
    }
    
    // Create mutation record
    const fullMutation: Mutation = {
      id: uuidv4(),
      ...mutation,
      created_at: Date.now()
    };
    
    // Apply mutation
    const oldConfig = { ...preset.config };
    preset.config[mutation.parameter] = mutation.new_value;
    preset.mutations.push(fullMutation);
    preset.updated_at = Date.now();
    preset.status = "testing";
    
    // Update in memory and database
    this.livingPresets.set(presetId, preset);
    
    this.db.prepare(`
      UPDATE living_presets 
      SET config = ?, mutations = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(preset.config),
      JSON.stringify(preset.mutations),
      preset.status,
      preset.updated_at,
      presetId
    );
    
    console.log(`[Observability] Evolved preset ${presetId}: ${mutation.parameter} = ${JSON.stringify(mutation.new_value)}`);
    
    this.recordMetric("preset_mutation", 1, { preset_id: presetId, parameter: mutation.parameter });
    
    return preset;
  }
  
  private createPreset(presetId: string, mutation: Omit<Mutation, "id" | "created_at">): LivingPreset {
    const now = Date.now();
    const preset: LivingPreset = {
      id: presetId,
      name: `Preset-${presetId.substring(0, 8)}`,
      config: { [mutation.parameter]: mutation.new_value },
      mutations: [{
        id: uuidv4(),
        ...mutation,
        created_at: now
      }],
      benchmark_score: 0,
      status: "testing",
      created_at: now,
      updated_at: now,
      test_results: [],
      usage_count: 0
    };
    
    this.livingPresets.set(presetId, preset);
    
    this.db.prepare(`
      INSERT INTO living_presets (id, name, config, mutations, benchmark_score, status, created_at, updated_at, test_results, usage_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      preset.id,
      preset.name,
      JSON.stringify(preset.config),
      JSON.stringify(preset.mutations),
      preset.benchmark_score,
      preset.status,
      preset.created_at,
      preset.updated_at,
      JSON.stringify(preset.test_results),
      preset.usage_count
    );
    
    return preset;
  }
  
  /**
   * Commit or rollback a preset based on test results
   */
  setPresetStatus(presetId: string, status: PresetStatus, testResults?: TestResult): LivingPreset | null {
    const preset = this.livingPresets.get(presetId);
    if (!preset) return null;
    
    preset.status = status;
    preset.updated_at = Date.now();
    
    if (testResults) {
      preset.test_results.push(testResults);
      if (testResults.passed) {
        preset.benchmark_score = (preset.benchmark_score + testResults.score) / 2;
      }
    }
    
    this.db.prepare(`
      UPDATE living_presets 
      SET status = ?, updated_at = ?, test_results = ?, benchmark_score = ?
      WHERE id = ?
    `).run(preset.status, preset.updated_at, JSON.stringify(preset.test_results), preset.benchmark_score, presetId);
    
    return preset;
  }
  
  // ============== Tool Relationships ==============
  
  /**
   * Record a relationship between two tools
   */
  recordToolRelationship(toolA: string, toolB: string, type: RelationshipType): void {
    // Check if relationship exists
    const existing = this.db.prepare(`
      SELECT * FROM tool_relationships 
      WHERE tool_a = ? AND tool_b = ? AND type = ?
    `).get(toolA, toolB, type) as ToolRelationship | undefined;
    
    if (existing) {
      // Update observation count
      this.db.prepare(`
        UPDATE tool_relationships 
        SET observations = observations + 1, last_observed = ?, strength = strength + 0.1
        WHERE id = ?
      `).run(Date.now(), existing.id);
    } else {
      // Create new relationship
      const id = uuidv4();
      this.db.prepare(`
        INSERT INTO tool_relationships (id, tool_a, tool_b, type, strength, observations, last_observed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, toolA, toolB, type, 1.0, 1, Date.now());
      
      // Add to memory
      this.addRelationshipToMap({
        id,
        tool_a: toolA,
        tool_b: toolB,
        type,
        strength: 1.0,
        observations: 1,
        last_observed: Date.now()
      });
    }
    
    console.log(`[Observability] Recorded tool relationship: ${toolA} → ${toolB} (${type})`);
  }
  
  /**
   * Get tool relationships
   */
  getToolRelationships(): ToolRelationships {
    return {
      dependencies: new Map(this.toolRelationships.dependencies),
      substitutions: new Map(this.toolRelationships.substitutions),
      conflicts: new Map(this.toolRelationships.conflicts),
      synergies: new Map(this.toolRelationships.synergies)
    };
  }
  
  // ============== Session Narrative ==============
  
  /**
   * Update session narrative with an event
   */
  updateNarrative(sessionId: string, event: { type: string; tool?: string; insight?: string; confidence?: number }): SessionNarrative {
    let narrative = this.sessionNarratives.get(sessionId);
    
    if (!narrative) {
      narrative = {
        session_id: sessionId,
        phases: [{
          type: "opening",
          start_turn: 0,
          tools_used: [],
          insights_gained: [],
          peak_confidence: 0,
          key_events: []
        }],
        current_phase: "opening",
        arc_quality: 0.5,
        total_turns: 0,
        created_at: Date.now(),
        updated_at: Date.now()
      };
    }
    
    narrative.total_turns++;
    narrative.updated_at = Date.now();
    
    // Get current phase
    const currentPhase = narrative.phases[narrative.phases.length - 1];
    
    // Record event
    if (event.tool) {
      currentPhase.tools_used.push(event.tool);
    }
    if (event.insight) {
      currentPhase.insights_gained.push(event.insight);
    }
    if (event.confidence !== undefined) {
      currentPhase.peak_confidence = Math.max(currentPhase.peak_confidence, event.confidence);
    }
    currentPhase.key_events.push(`${event.type} at turn ${narrative.total_turns}`);
    
    // Determine phase transition
    const newPhase = this.determineNarrativePhase(narrative);
    if (newPhase !== narrative.current_phase) {
      currentPhase.end_turn = narrative.total_turns;
      narrative.phases.push({
        type: newPhase,
        start_turn: narrative.total_turns + 1,
        tools_used: [],
        insights_gained: [],
        peak_confidence: 0,
        key_events: []
      });
      narrative.current_phase = newPhase;
      console.log(`[Observability] Session ${sessionId} entered ${newPhase} phase`);
    }
    
    // Calculate arc quality
    narrative.arc_quality = this.calculateArcQuality(narrative);
    
    // Save to memory and database
    this.sessionNarratives.set(sessionId, narrative);
    
    this.db.prepare(`
      INSERT OR REPLACE INTO session_narratives (session_id, phases, current_phase, arc_quality, total_turns, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      narrative.session_id,
      JSON.stringify(narrative.phases),
      narrative.current_phase,
      narrative.arc_quality,
      narrative.total_turns,
      narrative.created_at,
      narrative.updated_at
    );
    
    return narrative;
  }
  
  private determineNarrativePhase(narrative: SessionNarrative): NarrativePhaseType {
    const { total_turns, phases } = narrative;
    const toolsUsed = phases.flatMap(p => p.tools_used).length;
    const insights = phases.flatMap(p => p.insights_gained).length;
    const currentPhase = narrative.current_phase;
    
    // Phase progression logic
    if (currentPhase === "opening" && total_turns > 3) {
      return "rising_action";
    }
    if (currentPhase === "rising_action" && (toolsUsed > 5 || insights > 3)) {
      return "climax";
    }
    if (currentPhase === "climax" && total_turns > 10) {
      return "resolution";
    }
    if (currentPhase === "resolution" && phases[phases.length - 1].key_events.length > 5) {
      return "denouement";
    }
    
    return currentPhase;
  }
  
  private calculateArcQuality(narrative: SessionNarrative): number {
    const phasesCompleted = narrative.phases.filter(p => p.end_turn !== undefined).length;
    const totalToolsUsed = narrative.phases.flatMap(p => p.tools_used).length;
    const totalInsights = narrative.phases.flatMap(p => p.insights_gained).length;
    const avgConfidence = narrative.phases.reduce((acc, p) => acc + p.peak_confidence, 0) / narrative.phases.length;
    
    // Quality score based on narrative completeness and value
    const completeness = phasesCompleted / 5; // 5 possible phases
    const value = Math.min(1, (totalToolsUsed * 0.05 + totalInsights * 0.1));
    const confidence = avgConfidence;
    
    return (completeness * 0.3 + value * 0.4 + confidence * 0.3);
  }
  
  // ============== Failure Learning ==============
  
  /**
   * Record a failure and its remediation
   */
  recordFailure(failure: Omit<FailureRecord, "id" | "detected_at" | "recurrence_count">, remediation: RemediationAction[]): FailureRecord {
    // Check for similar existing failure
    const existingFailure = this.failures.find(f => 
      f.type === failure.type && 
      f.characterization === failure.characterization
    );
    
    if (existingFailure) {
      // Update recurrence
      existingFailure.recurrence_count++;
      existingFailure.last_recurrence = Date.now();
      existingFailure.remediation.push(...remediation);
      
      this.db.prepare(`
        UPDATE failure_records 
        SET recurrence_count = ?, last_recurrence = ?, remediation = ?
        WHERE id = ?
      `).run(
        existingFailure.recurrence_count,
        existingFailure.last_recurrence,
        JSON.stringify(existingFailure.remediation),
        existingFailure.id
      );
      
      console.log(`[Observability] Failure recurrence: ${failure.type} (${existingFailure.recurrence_count} times)`);
      return existingFailure;
    }
    
    // Create new failure record
    const record: FailureRecord = {
      id: uuidv4(),
      detected_at: Date.now(),
      ...failure,
      remediation,
      recurrence_count: 1
    };
    
    this.failures.unshift(record);
    if (this.failures.length > 100) this.failures.pop();
    
    // Store in database
    this.db.prepare(`
      INSERT INTO failure_records (id, detected_at, type, characterization, context, remediation, pattern_id, learning, recurrence_count, last_recurrence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.detected_at,
      record.type,
      record.characterization,
      JSON.stringify(record.context),
      JSON.stringify(record.remediation),
      record.pattern_id || null,
      record.learning,
      record.recurrence_count,
      record.last_recurrence || null
    );
    
    // Learn from failure
    this.learnFromFailure(record);
    
    // Create alert for significant failures
    if (failure.type === "critical" || failure.type === "vram_exhaustion") {
      this.createAlert("critical", `Failure: ${failure.characterization}`, "failure_detector");
    }
    
    console.log(`[Observability] Recorded failure: ${failure.type} - ${failure.characterization}`);
    return record;
  }
  
  private learnFromFailure(failure: FailureRecord): void {
    // Extract pattern from failure
    const patternData = {
      trigger_conditions: failure.context,
      failure_type: failure.type,
      successful_remediation: failure.remediation.filter(r => r.success).map(r => r.action)
    };
    
    // Check if pattern exists
    const existingPattern = this.db.prepare(`
      SELECT * FROM learned_patterns WHERE pattern_data = ?
    `).get(JSON.stringify(patternData)) as any;
    
    if (existingPattern) {
      // Update occurrences
      this.db.prepare(`
        UPDATE learned_patterns 
        SET occurrences = occurrences + 1, last_seen = ?, confidence = MIN(1.0, confidence + 0.05)
        WHERE id = ?
      `).run(Date.now(), existingPattern.id);
    } else {
      // Create new pattern
      const patternId = uuidv4();
      this.db.prepare(`
        INSERT INTO learned_patterns (id, pattern_type, pattern_data, confidence, occurrences, first_seen, last_seen, actionable)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        patternId,
        "failure",
        JSON.stringify(patternData),
        0.5,
        1,
        Date.now(),
        Date.now(),
        failure.remediation.some(r => r.success) ? 1 : 0
      );
    }
  }
  
  // ============== System Negotiation ==============
  
  /**
   * Create a negotiation for user decision
   */
  createNegotiation(question: string, options: NegotiationOption[]): SystemNegotiation {
    const negotiation: SystemNegotiation = {
      id: uuidv4(),
      question,
      options,
      created_at: Date.now()
    };
    
    this.negotiations.push(negotiation);
    
    // Store in database
    this.db.prepare(`
      INSERT INTO system_negotiations (id, question, options, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      negotiation.id,
      negotiation.question,
      JSON.stringify(negotiation.options),
      negotiation.created_at
    );
    
    console.log(`[Observability] Created negotiation: ${question}`);
    return negotiation;
  }
  
  /**
   * Resolve a negotiation
   */
  resolveNegotiation(negotiationId: string, userResponse: string, systemAction?: string): SystemNegotiation | null {
    const negotiation = this.negotiations.find(n => n.id === negotiationId);
    if (!negotiation) return null;
    
    negotiation.user_response = userResponse;
    negotiation.system_action = systemAction;
    negotiation.resolved_at = Date.now();
    
    this.db.prepare(`
      UPDATE system_negotiations 
      SET user_response = ?, system_action = ?, resolved_at = ?
      WHERE id = ?
    `).run(userResponse, systemAction || null, negotiation.resolved_at, negotiationId);
    
    return negotiation;
  }
  
  // ============== Time Horizon ==============
  
  /**
   * Get three-time horizon data
   */
  getTimeHorizon(): TimeHorizon {
    const now = Date.now();
    
    // NOW: Last minute
    const nowAlerts = this.alerts.filter(a => a.detected_at > now - ANOMALY_CHECK_WINDOW_MS);
    const nowAnomalies = this.anomalies.filter(a => a.detected_at > now - ANOMALY_CHECK_WINDOW_MS);
    
    // Get hot channels (metrics with recent activity)
    const hotChannels = [...new Set(
      this.metricsCache
        .filter(m => m.timestamp > now - ANOMALY_CHECK_WINDOW_MS)
        .map(m => m.name)
    )];
    
    // RECENT: Last 5 minutes
    const recentTrends = this.calculateRecentTrends();
    const recentPatterns = this.getRecentPatterns();
    const optimizationHints = this.generateOptimizationHints();
    
    // DEEP: Last 24 hours
    const evolutionMetrics = this.calculateEvolutionMetrics();
    const presetLineage = this.getPresetLineage();
    const learnedPatterns = this.getLearnedPatterns();
    
    return {
      now: {
        alerts: nowAlerts,
        anomalies: nowAnomalies,
        hot_channels: hotChannels
      },
      recent: {
        health_trends: recentTrends,
        patterns: recentPatterns,
        optimization_hints: optimizationHints
      },
      deep: {
        evolution: evolutionMetrics,
        preset_lineage: presetLineage,
        learned_patterns: learnedPatterns
      }
    };
  }
  
  private calculateRecentTrends(): Trend[] {
    const trends: Trend[] = [];
    const metricNames = [...new Set(this.metricsCache.map(m => m.name))];
    
    for (const name of metricNames.slice(0, 10)) {
      const trend = this.calculateTrend(name);
      if (trend) trends.push(trend);
    }
    
    return trends;
  }
  
  private getRecentPatterns(): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Get from learned patterns
    const learnedPatterns = this.db.prepare(`
      SELECT * FROM learned_patterns 
      WHERE last_seen > ? AND confidence > 0.5
      ORDER BY occurrences DESC
      LIMIT 10
    `).all(Date.now() - RECENT_WINDOW_MS) as any[];
    
    for (const lp of learnedPatterns) {
      patterns.push({
        id: lp.id,
        name: `${lp.pattern_type}_pattern`,
        description: `Observed ${lp.occurrences} times`,
        frequency: lp.occurrences,
        last_seen: lp.last_seen,
        impact: lp.actionable ? "high" : "medium"
      });
    }
    
    return patterns;
  }
  
  private generateOptimizationHints(): string[] {
    const hints: string[] = [];
    
    // Check VRAM efficiency
    const vramTrend = this.calculateTrend("vram_usage_percent");
    if (vramTrend && vramTrend.direction === "up" && vramTrend.slope > 5) {
      hints.push("Consider evicting cold models to reduce VRAM pressure");
    }
    
    // Check latency trends
    const latencyTrend = this.calculateTrend("latency_ms");
    if (latencyTrend && latencyTrend.direction === "up") {
      hints.push("Latency increasing - consider reducing context window or using smaller model");
    }
    
    // Check error patterns
    const recentFailures = this.failures.filter(f => f.detected_at > Date.now() - RECENT_WINDOW_MS);
    const failureTypes = [...new Set(recentFailures.map(f => f.type))];
    for (const type of failureTypes) {
      hints.push(`Recent failures detected: ${type} - review remediation strategies`);
    }
    
    // Check tool efficiency
    const toolRelationships = this.getToolRelationships();
    for (const [tool, conflicts] of toolRelationships.conflicts) {
      if (conflicts.length > 0) {
        hints.push(`Tool conflict detected: ${tool} conflicts with ${conflicts.join(", ")}`);
      }
    }
    
    return hints;
  }
  
  private calculateEvolutionMetrics(): EvolutionMetric[] {
    const metrics: EvolutionMetric[] = [];
    
    // Get metrics from deep window
    const deepMetrics = this.db.prepare(`
      SELECT name, AVG(value) as avg_value, MIN(value) as min_value, MAX(value) as max_value, COUNT(*) as samples
      FROM metrics 
      WHERE timestamp > ?
      GROUP BY name
    `).all(Date.now() - DEEP_WINDOW_MS) as any[];
    
    for (const row of deepMetrics) {
      const recentMetrics = this.metricsCache.filter(m => m.name === row.name);
      const currentValue = recentMetrics.length > 0 
        ? recentMetrics.reduce((a, b) => a + b.value, 0) / recentMetrics.length 
        : row.avg_value;
      
      const evolutionRate = row.avg_value !== 0 
        ? (currentValue - row.avg_value) / row.avg_value * 100 
        : 0;
      
      metrics.push({
        metric_name: row.name,
        baseline_value: row.avg_value,
        current_value: currentValue,
        evolution_rate: evolutionRate,
        samples: row.samples,
        period_start: Date.now() - DEEP_WINDOW_MS,
        period_end: Date.now()
      });
    }
    
    return metrics;
  }
  
  private getPresetLineage(): PresetLineage[] {
    const lineages: PresetLineage[] = [];
    
    for (const preset of this.livingPresets.values()) {
      const ancestorIds = preset.parent_id ? [preset.parent_id] : [];
      const mutations = preset.mutations;
      
      lineages.push({
        preset_id: preset.id,
        ancestor_ids: ancestorIds,
        total_mutations: mutations.length,
        successful_mutations: preset.test_results.filter(t => t.passed).length,
        rolled_back_mutations: preset.status === "rolled_back" ? 1 : 0,
        created_at: preset.created_at
      });
    }
    
    return lineages;
  }
  
  private getLearnedPatterns(): LearnedPattern[] {
    const patterns = this.db.prepare(`
      SELECT * FROM learned_patterns
      ORDER BY occurrences DESC, confidence DESC
      LIMIT 20
    `).all() as any[];
    
    return patterns.map(p => ({
      id: p.id,
      pattern_type: p.pattern_type,
      pattern_data: JSON.parse(p.pattern_data),
      confidence: p.confidence,
      occurrences: p.occurrences,
      first_seen: p.first_seen,
      last_seen: p.last_seen,
      actionable: p.actionable === 1
    }));
  }
  
  // ============== Confidence Cascade ==============
  
  /**
   * Get confidence cascade (Raw → Inferred → Predicted → Validated)
   */
  getConfidenceCascade(): ConfidenceCascade {
    // Raw: Current hardware reading
    const raw: HardwareReading = this.getCurrentHardwareReading();
    
    // Inferred: System deduction from raw data
    const inferred: SystemDeduction = this.inferFromHardware(raw);
    
    // Predicted: Future state prediction
    const predicted: PredictedState = this.predictNextState({
      vram_usage_percent: raw.vram_used_mb / raw.vram_total_mb * 100,
      gpu_utilization: raw.gpu_utilization
    });
    
    // Validated: Historical accuracy
    const validated: ValidationResult = this.validatePredictions();
    
    return { raw, inferred, predicted, validated };
  }
  
  private getCurrentHardwareReading(): HardwareReading {
    // In production, this would read from actual hardware
    // For now, use simulated/metric-based values
    const vramMetrics = this.metricsCache.filter(m => m.name === "vram_usage_percent");
    const lastVram = vramMetrics.length > 0 ? vramMetrics[vramMetrics.length - 1].value : 50;
    
    return {
      timestamp: Date.now(),
      vram_used_mb: VRAM_BUDGET_MB * lastVram / 100,
      vram_total_mb: VRAM_BUDGET_MB,
      gpu_utilization: 75, // Simulated
      memory_bandwidth: 320, // GB/s simulated
      temperature: 65, // Celsius simulated
      power_draw: 120 // Watts simulated
    };
  }
  
  private inferFromHardware(reading: HardwareReading): SystemDeduction {
    const vramPercent = reading.vram_used_mb / reading.vram_total_mb * 100;
    
    let pressureLevel: SystemDeduction["vram_pressure_level"];
    if (vramPercent > 90) pressureLevel = "critical";
    else if (vramPercent > 75) pressureLevel = "high";
    else if (vramPercent > 50) pressureLevel = "medium";
    else pressureLevel = "low";
    
    // Determine contention from tool conflicts
    const contention: string[] = [];
    const conflicts = this.toolRelationships.conflicts;
    for (const [tool, competitors] of conflicts) {
      contention.push(`${tool} vs ${competitors.join(", ")}`);
    }
    
    // Calculate time to saturation
    const vramTrend = this.calculateTrend("vram_usage_percent");
    const slope = vramTrend?.slope ?? 0;
    const timeToSaturation = slope > 0 
      ? (90 - vramPercent) / slope * 60000 // Convert to ms
      : Infinity;
    
    // Determine optimal model set
    const optimalModels: string[] = [];
    const evictionCandidates: string[] = [];
    
    if (pressureLevel === "critical" || pressureLevel === "high") {
      // Suggest smaller models
      evictionCandidates.push("large_model");
    } else {
      optimalModels.push("balanced_model");
    }
    
    return {
      vram_pressure_level: pressureLevel,
      model_contention: contention,
      predicted_saturation_ms: timeToSaturation,
      optimal_model_set: optimalModels,
      eviction_candidates: evictionCandidates
    };
  }
  
  private validatePredictions(): ValidationResult {
    if (this.predictionHistory.length < 10) {
      return {
        prediction_accuracy: 0.5,
        false_positive_rate: 0.5,
        false_negative_rate: 0.5,
        calibration_score: 0.5
      };
    }
    
    let correct = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    for (const { predicted, actual } of this.predictionHistory) {
      const error = Math.abs(predicted - actual);
      if (error < 10) correct++;
      else if (predicted > actual) falsePositives++;
      else falseNegatives++;
    }
    
    const total = this.predictionHistory.length;
    
    return {
      prediction_accuracy: correct / total,
      false_positive_rate: falsePositives / total,
      false_negative_rate: falseNegatives / total,
      calibration_score: correct / total
    };
  }
  
  // ============== System Health ==============
  
  /**
   * Get overall system health assessment
   */
  getSystemHealth(): SystemHealth {
    const cascade = this.getConfidenceCascade();
    const now = Date.now();
    
    // Calculate component scores
    const vramScore = 100 - cascade.raw.vram_used_mb / cascade.raw.vram_total_mb * 100;
    const vramStatus = cascade.inferred.vram_pressure_level;
    const vramMessage = vramStatus === "critical" 
      ? "VRAM critically low - immediate action required"
      : vramStatus === "high"
      ? "VRAM pressure high - consider model eviction"
      : "VRAM usage normal";
    
    const modelsScore = this.livingPresets.size > 0 
      ? [...this.livingPresets.values()].reduce((acc, p) => acc + p.benchmark_score, 0) / this.livingPresets.size * 100
      : 70;
    const modelsStatus = modelsScore > 80 ? "healthy" : modelsScore > 50 ? "degraded" : "critical";
    const modelsMessage = `${this.livingPresets.size} presets loaded, avg score: ${modelsScore.toFixed(0)}`;
    
    const toolsScore = this.calculateToolsHealth();
    const toolsStatus = toolsScore > 80 ? "healthy" : toolsScore > 50 ? "degraded" : "critical";
    const toolsMessage = `${this.toolRelationships.dependencies.size} tool relationships tracked`;
    
    const knowledgeScore = 85; // Would be based on knowledge graph stats
    const knowledgeStatus = "healthy";
    const knowledgeMessage = "Knowledge graph operational";
    
    const protocolsScore = 90; // Would be based on MCP/A2A status
    const protocolsStatus = "healthy";
    const protocolsMessage = "MCP and A2A protocols available";
    
    // Calculate overall score
    const overallScore = (vramScore + modelsScore + toolsScore + knowledgeScore + protocolsScore) / 5;
    
    // Determine overall status
    let status: SystemHealth["status"];
    if (cascade.inferred.vram_pressure_level === "critical" || overallScore < 50) {
      status = "critical";
    } else if (cascade.inferred.vram_pressure_level === "high" || overallScore < 75) {
      status = "degraded";
    } else {
      status = "healthy";
    }
    
    // Count active alerts
    const activeAlerts = this.alerts.filter(a => !a.acknowledged && a.detected_at > now - RECENT_WINDOW_MS).length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (vramScore < 50) recommendations.push("Free up VRAM by evicting cold models");
    if (modelsScore < 60) recommendations.push("Review and optimize model presets");
    if (activeAlerts > 3) recommendations.push("Review and acknowledge alerts");
    if (this.failures.filter(f => f.detected_at > now - RECENT_WINDOW_MS).length > 5) {
      recommendations.push("Investigate recent failure pattern");
    }
    
    return {
      overall_score: overallScore,
      status,
      components: {
        vram: { score: vramScore, status: vramStatus, message: vramMessage },
        models: { score: modelsScore, status: modelsStatus, message: modelsMessage },
        tools: { score: toolsScore, status: toolsStatus, message: toolsMessage },
        knowledge: { score: knowledgeScore, status: knowledgeStatus, message: knowledgeMessage },
        protocols: { score: protocolsScore, status: protocolsStatus, message: protocolsMessage }
      },
      active_alerts: activeAlerts,
      recommendations,
      last_updated: now
    };
  }
  
  private calculateToolsHealth(): number {
    // Base score on relationship quality
    const totalRelationships = 
      this.toolRelationships.dependencies.size +
      this.toolRelationships.substitutions.size +
      this.toolRelationships.synergies.size;
    
    const conflicts = this.toolRelationships.conflicts.size;
    
    // More relationships (except conflicts) is better
    const relationshipScore = Math.min(100, totalRelationships * 5);
    const conflictPenalty = conflicts * 10;
    
    return Math.max(0, Math.min(100, relationshipScore - conflictPenalty));
  }
  
  // ============== Dual-Purpose Endpoint Wrapper ==============
  
  /**
   * Wrap an endpoint handler with observability
   */
  async withObservability<T>(
    endpoint: string,
    handler: () => Promise<T>
  ): Promise<{ response: T; telemetry: TelemetryPayload }> {
    const startTime = Date.now();
    const startVram = this.getCurrentHardwareReading().vram_used_mb;
    const metrics: MetricRecord[] = [];
    const anomaliesDetected: Anomaly[] = [];
    
    let success = true;
    let confidence = 1.0;
    let response: T;
    
    try {
      response = await handler();
      
      // Record success metrics
      this.recordMetric("endpoint_success", 1, { endpoint });
      
    } catch (error) {
      success = false;
      confidence = 0;
      
      // Record failure
      this.recordMetric("endpoint_failure", 1, { endpoint });
      
      // Record failure in learning system
      this.recordFailure(
        {
          type: "endpoint_error",
          characterization: `Error in ${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
          context: { endpoint },
          learning: "Investigate endpoint implementation"
        },
        [{
          action: "retry",
          success: false,
          time_ms: 0
        }]
      );
      
      throw error;
    }
    
    const duration = Date.now() - startTime;
    const endVram = this.getCurrentHardwareReading().vram_used_mb;
    const vramDelta = endVram - startVram;
    
    // Record timing metric
    this.recordMetric("endpoint_latency_ms", duration, { endpoint });
    
    // Check for anomalies
    const latencyAnomaly = this.detectAnomaly("endpoint_latency_ms");
    if (latencyAnomaly) {
      anomaliesDetected.push(latencyAnomaly);
      confidence *= 0.8;
    }
    
    // Calculate confidence based on performance
    if (duration > 10000) confidence *= 0.7;
    if (vramDelta > 500) confidence *= 0.8;
    
    const telemetry: TelemetryPayload = {
      endpoint,
      duration_ms: duration,
      success,
      metrics,
      anomalies_detected: anomaliesDetected,
      vram_delta: vramDelta,
      confidence,
      timestamp: Date.now()
    };
    
    return { response, telemetry };
  }
  
  // ============== Utility Methods ==============
  
  /**
   * Get all presets
   */
  getPresets(): LivingPreset[] {
    return [...this.livingPresets.values()];
  }
  
  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    this.db.prepare(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`).run(alertId);
    
    return true;
  }
  
  /**
   * Get session narrative
   */
  getNarrative(sessionId: string): SessionNarrative | undefined {
    return this.sessionNarratives.get(sessionId);
  }
  
  /**
   * Get all failure records
   */
  getFailures(): FailureRecord[] {
    return [...this.failures];
  }
  
  /**
   * Add hardware reading (for external monitoring)
   */
  addHardwareReading(reading: Partial<HardwareReading>): void {
    const fullReading: HardwareReading = {
      timestamp: Date.now(),
      vram_used_mb: reading.vram_used_mb ?? 0,
      vram_total_mb: reading.vram_total_mb ?? VRAM_BUDGET_MB,
      gpu_utilization: reading.gpu_utilization ?? 0,
      memory_bandwidth: reading.memory_bandwidth ?? 0,
      temperature: reading.temperature ?? 0,
      power_draw: reading.power_draw ?? 0
    };
    
    this.hardwareReadings.push(fullReading);
    if (this.hardwareReadings.length > 1000) {
      this.hardwareReadings.shift();
    }
    
    // Record metrics
    this.recordMetric("vram_usage_percent", fullReading.vram_used_mb / fullReading.vram_total_mb * 100);
    this.recordMetric("gpu_utilization", fullReading.gpu_utilization);
    this.recordMetric("gpu_temperature", fullReading.temperature);
  }
  
  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    console.log("[Observability] System shutdown");
  }
}

// ============== Singleton Instance ==============

let instance: ObservabilitySystem | null = null;

export function getObservabilitySystem(): ObservabilitySystem {
  if (!instance) {
    instance = new ObservabilitySystem();
  }
  return instance;
}

// Export types
export type {
  TimeHorizon,
  Alert,
  Anomaly,
  Trend,
  Pattern,
  EvolutionMetric,
  PresetLineage,
  LearnedPattern,
  VRAMMode,
  VRAMPersonality,
  HardwareReading,
  SystemDeduction,
  PredictedState,
  ValidationResult,
  ConfidenceCascade,
  LivingPreset,
  Mutation,
  TestResult,
  ToolRelationship,
  ToolRelationships,
  RelationshipType,
  SessionNarrative,
  NarrativePhase,
  NarrativePhaseType,
  FailureRecord,
  RemediationAction,
  MetricRecord,
  TelemetryPayload,
  SystemNegotiation,
  NegotiationOption,
  SystemHealth
};
