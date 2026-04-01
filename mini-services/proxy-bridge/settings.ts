/**
 * LMStudio Proxy Bridge - Settings Management System
 * 
 * Handles:
 * - LM Studio connection settings
 * - Model presets and configurations
 * - Proxy gateway settings
 * - User preferences
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ============== Types ==============

export interface LMStudioConnection {
  host: string;
  port: number;
  auto_connect: boolean;
  retry_interval_ms: number;
  timeout_ms: number;
}

export interface ModelPreset {
  id: string;
  name: string;
  model_key: string;
  context_length: number;
  gpu_offload_ratio: number;
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  max_tokens: number;
  system_prompt?: string;
  is_default: boolean;
  created_at: number;
  last_used: number;
  usage_count: number;
}

export interface ProxySettings {
  port: number;
  cors_enabled: boolean;
  cors_origins: string[];
  rate_limit_enabled: boolean;
  rate_limit_requests_per_minute: number;
  logging_enabled: boolean;
  log_level: "debug" | "info" | "warn" | "error";
  streaming_enabled: boolean;
  max_stream_tokens: number;
}

export interface VRAMSettings {
  budget_mb: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  auto_evict_enabled: boolean;
  pre_warm_enabled: boolean;
  pre_warm_models: string[];
}

export interface RetrievalSettings {
  default_preset: string;
  default_mrl_dimension: number;
  default_reranker_mode: "fast" | "deep" | "cascade" | "hybrid";
  cache_embeddings: boolean;
  cache_ttl_minutes: number;
}

export interface KnowledgeGraphSettings {
  enabled: boolean;
  max_hops: number;
  auto_extract: boolean;
  persist_to_db: boolean;
}

export interface AppSettings {
  lm_studio: LMStudioConnection;
  proxy: ProxySettings;
  vram: VRAMSettings;
  retrieval: RetrievalSettings;
  knowledge_graph: KnowledgeGraphSettings;
  theme: "dark" | "light" | "system";
  language: string;
}

// ============== Defaults ==============

const DEFAULT_SETTINGS: AppSettings = {
  lm_studio: {
    host: "192.168.1.12",
    port: 1234,
    auto_connect: true,
    retry_interval_ms: 5000,
    timeout_ms: 30000
  },
  proxy: {
    port: 3001,
    cors_enabled: true,
    cors_origins: ["*"],
    rate_limit_enabled: false,
    rate_limit_requests_per_minute: 60,
    logging_enabled: true,
    log_level: "info",
    streaming_enabled: true,
    max_stream_tokens: 4096
  },
  vram: {
    budget_mb: 8192,
    warning_threshold_percent: 75,
    critical_threshold_percent: 90,
    auto_evict_enabled: true,
    pre_warm_enabled: true,
    pre_warm_models: []
  },
  retrieval: {
    default_preset: "code_search",
    default_mrl_dimension: 512,
    default_reranker_mode: "cascade",
    cache_embeddings: true,
    cache_ttl_minutes: 60
  },
  knowledge_graph: {
    enabled: true,
    max_hops: 2,
    auto_extract: true,
    persist_to_db: true
  },
  theme: "dark",
  language: "en"
};

const DEFAULT_MODEL_PRESETS: Omit<ModelPreset, "id" | "created_at" | "last_used" | "usage_count">[] = [
  {
    name: "Code Generation",
    model_key: "qwen3.5-4b",
    context_length: 8192,
    gpu_offload_ratio: 1.0,
    temperature: 0.2,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    max_tokens: 2048,
    system_prompt: "You are an expert programmer. Write clean, efficient, well-documented code.",
    is_default: true
  },
  {
    name: "Creative Writing",
    model_key: "qwen3.5-4b",
    context_length: 8192,
    gpu_offload_ratio: 1.0,
    temperature: 0.8,
    top_p: 0.95,
    top_k: 60,
    repeat_penalty: 1.15,
    max_tokens: 4096,
    system_prompt: "You are a creative writing assistant.",
    is_default: false
  },
  {
    name: "Analysis & Reasoning",
    model_key: "qwen3.5-4b",
    context_length: 8192,
    gpu_offload_ratio: 1.0,
    temperature: 0.3,
    top_p: 0.85,
    top_k: 40,
    repeat_penalty: 1.05,
    max_tokens: 2048,
    system_prompt: "You are an analytical assistant. Think step by step and provide detailed reasoning.",
    is_default: false
  },
  {
    name: "Quick Chat",
    model_key: "liquid/lfm2.5-1.2b",
    context_length: 4096,
    gpu_offload_ratio: 1.0,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    max_tokens: 1024,
    is_default: false
  },
  {
    name: "Long Context",
    model_key: "qwen3.5-4b",
    context_length: 32768,
    gpu_offload_ratio: 1.0,
    temperature: 0.5,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    max_tokens: 8192,
    system_prompt: "You are a helpful assistant with long context memory.",
    is_default: false
  }
];

// ============== Settings Manager ==============

export class SettingsManager {
  private db: Database;
  private settingsCache: AppSettings | null = null;
  private modelPresetsCache: Map<string, ModelPreset> = new Map();

  constructor(dbPath: string = join(import.meta.dir, "../../db/settings.db")) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeDatabase();
    this.loadCache();
  }

  private initializeDatabase(): void {
    // Settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Model presets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS model_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        model_key TEXT NOT NULL,
        context_length INTEGER NOT NULL,
        gpu_offload_ratio REAL NOT NULL,
        temperature REAL NOT NULL,
        top_p REAL NOT NULL,
        top_k INTEGER NOT NULL,
        repeat_penalty REAL NOT NULL,
        max_tokens INTEGER NOT NULL,
        system_prompt TEXT,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_used INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 0
      )
    `);

    // Download paths table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS download_paths (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        size_bytes INTEGER,
        downloaded_at INTEGER NOT NULL
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_presets_name ON model_presets(name)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_presets_default ON model_presets(is_default)`);
  }

  private loadCache(): void {
    // Load settings
    const rows = this.db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: any = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      try {
        const keys = row.key.split(".");
        let obj = settings;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = JSON.parse(row.value);
      } catch (e) {
        console.error(`[Settings] Failed to parse setting ${row.key}:`, e);
      }
    }

    this.settingsCache = settings as AppSettings;

    // Load model presets
    const presets = this.db.prepare("SELECT * FROM model_presets ORDER BY name").all() as any[];

    if (presets.length === 0) {
      // Insert default presets
      for (const preset of DEFAULT_MODEL_PRESETS) {
        const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();

        this.db.prepare(`
          INSERT INTO model_presets (
            id, name, model_key, context_length, gpu_offload_ratio,
            temperature, top_p, top_k, repeat_penalty, max_tokens,
            system_prompt, is_default, created_at, last_used, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, preset.name, preset.model_key, preset.context_length, preset.gpu_offload_ratio,
          preset.temperature, preset.top_p, preset.top_k, preset.repeat_penalty, preset.max_tokens,
          preset.system_prompt || null, preset.is_default ? 1 : 0, now, now, 0
        );

        this.modelPresetsCache.set(id, { ...preset, id, created_at: now, last_used: now, usage_count: 0 });
      }
      console.log(`[Settings] Created ${DEFAULT_MODEL_PRESETS.length} default model presets`);
    } else {
      for (const preset of presets) {
        this.modelPresetsCache.set(preset.id, {
          ...preset,
          is_default: preset.is_default === 1
        });
      }
      console.log(`[Settings] Loaded ${presets.length} model presets`);
    }
  }

  // ============== Settings Getters ==============

  getSettings(): AppSettings {
    return { ...this.settingsCache! };
  }

  getLMStudioConnection(): LMStudioConnection {
    return { ...this.settingsCache!.lm_studio };
  }

  getProxySettings(): ProxySettings {
    return { ...this.settingsCache!.proxy };
  }

  getVRAMSettings(): VRAMSettings {
    return { ...this.settingsCache!.vram };
  }

  getRetrievalSettings(): RetrievalSettings {
    return { ...this.settingsCache!.retrieval };
  }

  // ============== Settings Setters ==============

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    const flattened = this.flattenObject(updates);

    for (const [key, value] of Object.entries(flattened)) {
      this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run(key, JSON.stringify(value), Date.now());
    }

    // Update cache
    this.settingsCache = this.deepMerge(this.settingsCache!, updates);

    console.log(`[Settings] Updated ${Object.keys(flattened).length} settings`);
    return this.getSettings();
  }

  updateLMStudioConnection(updates: Partial<LMStudioConnection>): LMStudioConnection {
    const current = this.settingsCache!.lm_studio;
    const updated = { ...current, ...updates };
    this.updateSettings({ lm_studio: updated });
    return updated;
  }

  updateProxySettings(updates: Partial<ProxySettings>): ProxySettings {
    const current = this.settingsCache!.proxy;
    const updated = { ...current, ...updates };
    this.updateSettings({ proxy: updated });
    return updated;
  }

  // ============== Model Presets ==============

  getModelPresets(): ModelPreset[] {
    return Array.from(this.modelPresetsCache.values());
  }

  getModelPreset(id: string): ModelPreset | undefined {
    return this.modelPresetsCache.get(id);
  }

  getDefaultModelPreset(): ModelPreset | undefined {
    return Array.from(this.modelPresetsCache.values()).find(p => p.is_default);
  }

  createModelPreset(preset: Omit<ModelPreset, "id" | "created_at" | "last_used" | "usage_count">): ModelPreset {
    const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // If this is set as default, unset other defaults
    if (preset.is_default) {
      this.db.run("UPDATE model_presets SET is_default = 0");
      for (const p of this.modelPresetsCache.values()) {
        p.is_default = false;
      }
    }

    this.db.prepare(`
      INSERT INTO model_presets (
        id, name, model_key, context_length, gpu_offload_ratio,
        temperature, top_p, top_k, repeat_penalty, max_tokens,
        system_prompt, is_default, created_at, last_used, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, preset.name, preset.model_key, preset.context_length, preset.gpu_offload_ratio,
      preset.temperature, preset.top_p, preset.top_k, preset.repeat_penalty, preset.max_tokens,
      preset.system_prompt || null, preset.is_default ? 1 : 0, now, now, 0
    );

    const newPreset: ModelPreset = { ...preset, id, created_at: now, last_used: now, usage_count: 0 };
    this.modelPresetsCache.set(id, newPreset);

    console.log(`[Settings] Created model preset: ${preset.name}`);
    return newPreset;
  }

  updateModelPreset(id: string, updates: Partial<Omit<ModelPreset, "id" | "created_at">>): ModelPreset | null {
    const existing = this.modelPresetsCache.get(id);
    if (!existing) return null;

    // If setting as default, unset others
    if (updates.is_default) {
      this.db.run("UPDATE model_presets SET is_default = 0");
      for (const p of this.modelPresetsCache.values()) {
        p.is_default = false;
      }
    }

    const updated = { ...existing, ...updates, last_used: Date.now() };

    this.db.prepare(`
      UPDATE model_presets SET
        name = ?, model_key = ?, context_length = ?, gpu_offload_ratio = ?,
        temperature = ?, top_p = ?, top_k = ?, repeat_penalty = ?, max_tokens = ?,
        system_prompt = ?, is_default = ?, last_used = ?, usage_count = ?
      WHERE id = ?
    `).run(
      updated.name, updated.model_key, updated.context_length, updated.gpu_offload_ratio,
      updated.temperature, updated.top_p, updated.top_k, updated.repeat_penalty, updated.max_tokens,
      updated.system_prompt || null, updated.is_default ? 1 : 0, updated.last_used, updated.usage_count, id
    );

    this.modelPresetsCache.set(id, updated);
    console.log(`[Settings] Updated model preset: ${updated.name}`);
    return updated;
  }

  deleteModelPreset(id: string): boolean {
    const existing = this.modelPresetsCache.get(id);
    if (!existing) return false;

    this.db.prepare("DELETE FROM model_presets WHERE id = ?").run(id);
    this.modelPresetsCache.delete(id);

    console.log(`[Settings] Deleted model preset: ${existing.name}`);
    return true;
  }

  recordPresetUsage(id: string): void {
    const existing = this.modelPresetsCache.get(id);
    if (!existing) return;

    existing.usage_count++;
    existing.last_used = Date.now();

    this.db.prepare(`
      UPDATE model_presets SET usage_count = ?, last_used = ? WHERE id = ?
    `).run(existing.usage_count, existing.last_used, id);
  }

  // ============== Download Paths ==============

  registerDownload(name: string, path: string, fileType: string, sizeBytes: number): void {
    const id = `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO download_paths (id, name, path, file_type, size_bytes, downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, path, fileType, sizeBytes, Date.now());
  }

  getDownloads(): { id: string; name: string; path: string; file_type: string; size_bytes: number; downloaded_at: number }[] {
    return this.db.prepare("SELECT * FROM download_paths ORDER BY downloaded_at DESC").all() as any[];
  }

  // ============== Utility ==============

  private flattenObject(obj: any, prefix = ""): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === "object"
        ) {
          (result as any)[key] = this.deepMerge(target[key], source[key] as any);
        } else {
          (result as any)[key] = source[key];
        }
      }
    }

    return result;
  }

  // ============== Export/Import ==============

  exportSettings(): string {
    const data = {
      settings: this.settingsCache,
      model_presets: this.getModelPresets(),
      exported_at: Date.now()
    };
    return JSON.stringify(data, null, 2);
  }

  importSettings(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.settings) {
        this.updateSettings(data.settings);
      }

      if (data.model_presets) {
        for (const preset of data.model_presets) {
          if (!preset.id || !this.modelPresetsCache.has(preset.id)) {
            this.createModelPreset(preset);
          }
        }
      }

      console.log("[Settings] Imported settings successfully");
      return true;
    } catch (e) {
      console.error("[Settings] Failed to import settings:", e);
      return false;
    }
  }

  resetToDefaults(): AppSettings {
    // Clear settings
    this.db.run("DELETE FROM settings");

    // Reset cache
    this.settingsCache = { ...DEFAULT_SETTINGS };

    // Save defaults
    this.updateSettings(DEFAULT_SETTINGS);

    console.log("[Settings] Reset to defaults");
    return this.getSettings();
  }

  close(): void {
    this.db.close();
    console.log("[Settings] Closed");
  }
}

// ============== Singleton ==============

let instance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!instance) {
    instance = new SettingsManager();
  }
  return instance;
}
