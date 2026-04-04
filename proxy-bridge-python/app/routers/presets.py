import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/presets", tags=["Presets"])

PRESETS_STORE_PATH = Path(__file__).parent.parent.parent / "presets" / "presets.json"
_presets_store: Dict[str, Any] = {}


def _load_presets_store() -> None:
    global _presets_store
    try:
        PRESETS_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if PRESETS_STORE_PATH.exists():
            with open(PRESETS_STORE_PATH, "r") as f:
                _presets_store = json.load(f)
        else:
            _presets_store = {"presets": [], "default_preset": None}
            _save_presets_store()
    except Exception:
        _presets_store = {"presets": [], "default_preset": None}


def _save_presets_store() -> None:
    PRESETS_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PRESETS_STORE_PATH, "w") as f:
        json.dump(_presets_store, f, indent=2)


class PresetCreate(BaseModel):
    name: str
    model_id: str
    params: Dict[str, Any] = {}
    system_prompt: Optional[str] = None
    description: Optional[str] = None


class PresetUpdate(BaseModel):
    name: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    system_prompt: Optional[str] = None
    description: Optional[str] = None


class PresetResponse(BaseModel):
    id: str
    name: str
    model_id: str
    params: Dict[str, Any]
    system_prompt: Optional[str]
    description: Optional[str]
    created_at: float
    updated_at: float


@router.get("/list", response_model=List[PresetResponse])
async def list_presets():
    _load_presets_store()
    presets = _presets_store.get("presets", [])
    return [PresetResponse(**p) for p in presets]


@router.post("/create", response_model=PresetResponse)
async def create_preset(req: PresetCreate):
    _load_presets_store()
    preset_id = f"preset_{int(time.time() * 1000)}"
    now = time.time()
    preset = {
        "id": preset_id,
        "name": req.name,
        "model_id": req.model_id,
        "params": req.params,
        "system_prompt": req.system_prompt,
        "description": req.description,
        "created_at": now,
        "updated_at": now,
    }
    _presets_store.setdefault("presets", []).append(preset)
    _save_presets_store()
    return PresetResponse(**preset)


@router.put("/update/{preset_id}", response_model=PresetResponse)
async def update_preset(preset_id: str, req: PresetUpdate):
    _load_presets_store()
    presets = _presets_store.get("presets", [])
    for i, p in enumerate(presets):
        if p["id"] == preset_id:
            if req.name is not None:
                presets[i]["name"] = req.name
            if req.params is not None:
                presets[i]["params"] = req.params
            if req.system_prompt is not None:
                presets[i]["system_prompt"] = req.system_prompt
            if req.description is not None:
                presets[i]["description"] = req.description
            presets[i]["updated_at"] = time.time()
            _save_presets_store()
            return PresetResponse(**presets[i])
    raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")


@router.delete("/delete/{preset_id}")
async def delete_preset(preset_id: str):
    _load_presets_store()
    presets = _presets_store.get("presets", [])
    _presets_store["presets"] = [p for p in presets if p["id"] != preset_id]
    _save_presets_store()
    return {"status": "deleted", "id": preset_id}


@router.post("/generate")
async def generate_preset(req: PresetCreate):
    return {
        "name": req.name,
        "model_id": req.model_id,
        "params": {
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 2048,
        },
        "system_prompt": req.system_prompt or "You are a helpful assistant.",
        "description": f"Auto-generated preset for {req.model_id}",
    }
