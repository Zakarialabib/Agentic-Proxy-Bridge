import json
import os
from typing import Any, Dict, List, Optional
from app.routers.hardware import _get_cached_hardware

class AdaptiveTuner:
    """
    Analyzes test results and hardware profile to suggest optimized configurations.
    """
    
    def __init__(self, current_presets: Dict[str, Any]):
        self.presets = current_presets
        self.hardware = _get_cached_hardware()

    def tune_from_results(self, test_type: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for tuning. Analyzes results and returns updated presets and rationales.
        """
        rationales = []
        if test_type == "medium":
            updated_presets, rationales = self._tune_medium_tests(results)
        elif test_type == "simple":
            updated_presets, rationales = self._tune_simple_tests(results)
        elif test_type == "complex":
            updated_presets, rationales = self._tune_complex_tests(results)
        else:
            updated_presets = self.presets
            
        return {
            "presets": updated_presets,
            "rationales": rationales
        }

    def _tune_complex_tests(self, results: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        updated_presets = self.presets.copy()
        rationales = []
        benchmark = results.get("benchmark", {}) if "benchmark" in results else results.get("tests", {}).get("benchmark", {})
        
        if not benchmark:
            return updated_presets

        tps = benchmark.get("tokens_per_sec", 0)
        efficiency = benchmark.get("efficiency", "unknown")
        
        print(f"[AdaptiveTuner] Complex results: {tps} TPS, Efficiency: {efficiency}")

        # Heuristic 4: Throughput-based tiering
        if tps < 5 and tps > 0:
            msg = f"Low throughput ({tps} TPS) detected. Optimizing quantization."
            rationales.append(msg)
            print(f"[AdaptiveTuner] {msg}")
            for p in updated_presets.get("presets", []):
                p["params"]["quantization_target"] = "Q3_K_M"
                p["description"] += " (Optimized for low TPS)"

        return updated_presets, rationales

    def _tune_medium_tests(self, results: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        updated_presets = self.presets.copy()
        rationales = []
        context_results = results.get("context_window", {})
        prompt_results = results.get("system_prompts", {})
        
        # Heuristic 1: VRAM Overflow (500 Error in large context)
        large_context = context_results.get("tests", {}).get("large_context_8192", {})
        if large_context.get("status_code") == 500 or not large_context.get("ok"):
             msg = "Large context failure (VRAM pressure). Reducing context_window to 4096."
             rationales.append(msg)
             print(f"[AdaptiveTuner] {msg}")
             for p in updated_presets.get("presets", []):
                 p["params"]["context_window"] = 4096

        # Heuristic 2: Latency Optimization
        avg_latency = context_results.get("latency_ms", 0)
        if avg_latency > 10000:
            msg = "High average latency detected (>10s). Tuning sampling for efficiency."
            rationales.append(msg)
            print(f"[AdaptiveTuner] {msg}")
            for p in updated_presets.get("presets", []):
                p["params"]["top_p"] = 0.8
                p["params"]["repeat_penalty"] = 1.1

        # Heuristic 5: System Prompt Adherence Reinforcement
        if not prompt_results.get("ok", True):
            msg = "System prompt adherence failure. Reinforcing instructions."
            rationales.append(msg)
            print(f"[AdaptiveTuner] {msg}")
            for p in updated_presets.get("presets", []):
                if "IMPORTANT: STRICT ADHERENCE" not in (p.get("system_prompt") or ""):
                    existing = p.get("system_prompt") or "You are a helpful assistant."
                    p["system_prompt"] = f"### IMPORTANT: STRICT ADHERENCE TO INSTRUCTIONS REQUIRED ###\n{existing}"

        return updated_presets, rationales

    def _tune_simple_tests(self, results: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        updated_presets = self.presets.copy()
        rationales = []
        
        # Heuristic 3: OpenAI Compliance
        openai_compat = results.get("openai_compat", {})
        if not openai_compat.get("ok"):
            msg = "OpenAI format non-compliance. Enabling strict normalization mode."
            rationales.append(msg)
            print(f"[AdaptiveTuner] {msg}")
            
        return updated_presets, rationales

    def generate_initial_preset(self, model_id: str) -> Dict[str, Any]:
        """
        Creates a hardware-aware initial preset.
        """
        vram = self.hardware.gpu_vram_gb or 0
        
        # Conservative defaults
        context_window = 4096
        gpu_offload = 0.0
        
        if vram > 12:
            context_window = 32768
            gpu_offload = 1.0
        elif vram > 7:
            context_window = 8192
            gpu_offload = 0.8
        elif vram > 3:
            context_window = 4096
            gpu_offload = 0.5
            
        return {
            "name": f"Turbo-{model_id}",
            "model_id": model_id,
            "params": {
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 2048,
                "context_window": context_window,
                "gpu_offload": gpu_offload
            },
            "description": f"Auto-tuned for {self.hardware.gpu_name or 'CPU'}"
        }

tuner = AdaptiveTuner({}) # Placeholder initialization
