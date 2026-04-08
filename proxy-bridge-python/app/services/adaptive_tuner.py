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
        Main entry point for tuning. Analyzes results and returns updated presets.
        """
        if test_type == "medium":
            return self._tune_medium_tests(results)
        elif test_type == "simple":
            return self._tune_simple_tests(results)
        elif test_type == "complex":
            return self._tune_complex_tests(results)
        return self.presets

    def _tune_complex_tests(self, results: Dict[str, Any]) -> Dict[str, Any]:
        updated_presets = self.presets.copy()
        benchmark = results.get("benchmark", {}) if "benchmark" in results else results.get("tests", {}).get("benchmark", {})
        
        if not benchmark:
            return updated_presets

        tps = benchmark.get("tokens_per_sec", 0)
        efficiency = benchmark.get("efficiency", "unknown")
        
        print(f"[AdaptiveTuner] Complex results: {tps} TPS, Efficiency: {efficiency}")

        # Heuristic 4: Throughput-based tiering
        if tps < 5 and tps > 0:
            # Extremely slow, suggest higher quantization tier
            print("[AdaptiveTuner] Low throughput detected. Suggesting higher quantization (more compression).")
            for p in updated_presets.get("presets", []):
                p["params"]["quantization_target"] = "Q3_K_M"
                p["description"] += " (Optimized for low TPS)"

        return updated_presets

    def _tune_medium_tests(self, results: Dict[str, Any]) -> Dict[str, Any]:
        updated_presets = self.presets.copy()
        context_results = results.get("context_window", {})
        
        # Heuristic 1: VRAM Overflow (500 Error in large context)
        large_context = context_results.get("tests", {}).get("large_context_8192", {})
        if large_context.get("status_code") == 500 or not large_context.get("ok"):
             # Reduce default context window to 4k if 8k fails
             print("[AdaptiveTuner] Large context failed. Reducing context_window limit.")
             for p in updated_presets.get("presets", []):
                 p["params"]["context_window"] = 4096

        # Heuristic 2: Latency Optimization
        # If avg latency is > 10s for medium context, suggest lower top_p or simplified params
        avg_latency = context_results.get("latency_ms", 0)
        if avg_latency > 10000:
            print("[AdaptiveTuner] High latency detected. Applying performance optimizations.")
            for p in updated_presets.get("presets", []):
                p["params"]["top_p"] = 0.8  # Slightly more deterministic/efficient
                p["params"]["repeat_penalty"] = 1.1

        return updated_presets

    def _tune_simple_tests(self, results: Dict[str, Any]) -> Dict[str, Any]:
        updated_presets = self.presets.copy()
        
        # Heuristic 3: OpenAI Compliance
        openai_compat = results.get("openai_compat", {})
        if not openai_compat.get("ok"):
            print("[AdaptiveTuner] OpenAI compatibility issues found. Enabling strict normalization.")
            # Note: This might be a global setting in app/core/settings instead
            
        return updated_presets

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
