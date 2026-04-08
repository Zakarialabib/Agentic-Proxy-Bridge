import json
import os
from typing import Dict, Any

def generate_lmstudio_preset(hardware_profile, model_id: str, preset_data: Dict[str, Any]) -> dict:
    """
    Converts a bridge preset into a native LM Studio preset format.
    """
    is_pre_volta = False
    gpu_name = (hardware_profile.gpu_name or "").lower()
    if any(arch in gpu_name for arch in ["m4000", "k80", "gtx 9", "gtx 10", "titan x", "p40", "m6000"]):
        is_pre_volta = True
        
    quant_target = preset_data.get("params", {}).get("quantization_target", "")
    quant_suffix = f"-{quant_target.lower()}" if quant_target else ""
    
    return {
        "name": f"AgentOS-{model_id}{quant_suffix}",
        "description": preset_data.get("description", ""),
        "model": model_id,
        "llama_model_path": f"models/{model_id}{quant_suffix}.gguf",
        "hardware": {
            "context_length": preset_data.get("params", {}).get("context_window", 4096),
            "gpu_offload": preset_data.get("params", {}).get("gpu_offload", 0.5),
            "batch_size": 512 if is_pre_volta else 2048,
        },
        "sampling": {
            "temperature": preset_data.get("params", {}).get("temperature", 0.7),
            "top_p": preset_data.get("params", {}).get("top_p", 0.9),
            "repeat_penalty": 1.0 if "4b" in model_id.lower() else 1.1,
            "max_tokens": preset_data.get("params", {}).get("max_tokens", 2048)
        },
        "system_prompt": preset_data.get("system_prompt", "")
    }

def sync_to_lmstudio(preset: dict):
    """
    Writes the preset directly to LM Studio's preset directory.
    Note: In a containerized or remote environment, this path might not match the host's actual LM Studio path.
    For this implementation, we use a local cache folder or standard path.
    """
    # Use standard LM Studio preset path or fallback to a local cache
    home_dir = os.path.expanduser("~")
    base_paths = [
        os.path.join(home_dir, ".cache", "lm-studio", "config-presets"),
        os.path.join(home_dir, ".lmstudio", "presets"),
        os.path.join(os.getcwd(), ".lmstudio-presets") # Fallback for testing
    ]
    
    target_path = None
    for p in base_paths:
        if os.path.exists(p):
            target_path = p
            break
            
    if not target_path:
        target_path = base_paths[-1]
        os.makedirs(target_path, exist_ok=True)
        
    file_path = os.path.join(target_path, f"{preset['name']}.json")
    
    try:
        with open(file_path, 'w') as f:
            json.dump(preset, f, indent=2)
        print(f"[Preset Sync] Successfully synced preset to {file_path}")
    except Exception as e:
        print(f"[Preset Sync] Failed to sync preset: {e}")
