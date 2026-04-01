/**
 * Settings API Handlers for LMStudio Proxy Bridge
 */

import { getSettingsManager, type ModelPreset, type AppSettings } from "./settings";

// ============== Handlers ==============

export async function handleGetSettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const settings = mgr.getSettings();
  return Response.json(settings);
}

export async function handleUpdateSettings(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const updates = await req.json();
  const updated = mgr.updateSettings(updates);
  return Response.json({ success: true, settings: updated });
}

export async function handleGetLMStudioSettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const conn = mgr.getLMStudioConnection();
  return Response.json(conn);
}

export async function handleUpdateLMStudioSettings(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const updates = await req.json();
  const updated = mgr.updateLMStudioConnection(updates);
  return Response.json({ success: true, settings: updated });
}

export async function handleGetProxySettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const settings = mgr.getProxySettings();
  return Response.json(settings);
}

export async function handleUpdateProxySettings(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const updates = await req.json();
  const updated = mgr.updateProxySettings(updates);
  return Response.json({ success: true, settings: updated });
}

// Model Presets
export async function handleGetModelPresets(): Promise<Response> {
  const mgr = getSettingsManager();
  const presets = mgr.getModelPresets();
  return Response.json({ presets });
}

export async function handleGetModelPreset(id: string): Promise<Response> {
  const mgr = getSettingsManager();
  const preset = mgr.getModelPreset(id);
  
  if (!preset) {
    return Response.json({ error: "Preset not found" }, { status: 404 });
  }
  
  return Response.json(preset);
}

export async function handleCreateModelPreset(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const data = await req.json();
  
  try {
    const preset = mgr.createModelPreset(data as any);
    return Response.json({ success: true, preset });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}

export async function handleUpdateModelPreset(req: Request, id: string): Promise<Response> {
  const mgr = getSettingsManager();
  const updates = await req.json();
  
  const preset = mgr.updateModelPreset(id, updates);
  
  if (!preset) {
    return Response.json({ error: "Preset not found" }, { status: 404 });
  }
  
  return Response.json({ success: true, preset });
}

export async function handleDeleteModelPreset(id: string): Promise<Response> {
  const mgr = getSettingsManager();
  const success = mgr.deleteModelPreset(id);
  
  if (!success) {
    return Response.json({ error: "Preset not found" }, { status: 404 });
  }
  
  return Response.json({ success: true });
}

export async function handleSetDefaultModelPreset(id: string): Promise<Response> {
  const mgr = getSettingsManager();
  const preset = mgr.updateModelPreset(id, { is_default: true });
  
  return Response.json({ success: true, preset });
}

// Import/Export
export async function handleExportSettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const json = mgr.exportSettings();
  
  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=proxy-settings.json"
    }
  });
}

export async function handleImportSettings(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const json = await req.text();
  
  const success = mgr.importSettings(json);
  
  if (!success) {
    return Response.json({ error: "Failed to import settings" }, { status: 400 });
  }
  
  return Response.json({ success: true, settings: mgr.getSettings() });
}

export async function handleResetSettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const settings = mgr.resetToDefaults();
  return Response.json({ success: true, settings });
}

// VRAM Settings
export async function handleGetVRAMSettings(): Promise<Response> {
  const mgr = getSettingsManager();
  const settings = mgr.getVRAMSettings();
  return Response.json(settings);
}

export async function handleUpdateVRAMSettings(req: Request): Promise<Response> {
  const mgr = getSettingsManager();
  const updates = await req.json();
  
  const updated = Object.assign({}, mgr.getVRAMSettings(), updates);
  
  mgr.updateSettings({ vram: updated });
  return Response.json({ success: true, settings: updated });
}

// Download paths
export async function handleGetDownloads(): Promise<Response> {
  const mgr = getSettingsManager();
  const downloads = mgr.getDownloads();
  return Response.json({ downloads });
}
