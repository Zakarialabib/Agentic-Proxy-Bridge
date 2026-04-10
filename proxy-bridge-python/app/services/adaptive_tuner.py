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
        
        # Extract the spend_report from the results
        spend_report = results.get("tests", {}).get("spend_report", {})
        if not spend_report:
            spend_report = results.get("spend_report", {})
            
        benchmark = results.get("benchmark", {}) if "benchmark" in results else results.get("tests", {}).get("benchmark", {})
        
        if not benchmark and not spend_report:
            return updated_presets

        tps = benchmark.get("tokens_per_sec", 0)
        if tps == 0 and spend_report:
            tps = spend_report.get("avg_tokens_per_sec", 0)
            
        efficiency = benchmark.get("efficiency", "unknown")
        
        print(f"[AdaptiveTuner] Complex results: {tps} TPS, Efficiency: {efficiency}")

        if spend_report and "by_test" in spend_report:
            by_test = spend_report["by_test"]
            reasoning_tps = by_test.get("reasoning", {}).get("tokens_per_sec", 0)
            code_tps = by_test.get("code", {}).get("tokens_per_sec", 0)
            short_tps = by_test.get("short", {}).get("tokens_per_sec", 0)
            
            # Detect Compute-Bound vs Memory-Bound
            # If long context (reasoning) TPS is similar to short context (code) TPS, it's compute bound.
            # If long context TPS drops significantly compared to short context, it's memory/bandwidth bound.
            
            if reasoning_tps > 0 and code_tps > 0:
                tps_variance = abs(reasoning_tps - code_tps)
                
                if tps < 10:
                    if tps_variance < 1.0:
                        # Compute bound: consistent slow speed regardless of context size
                        msg = f"Inference-bound workload detected (Consistent ~{reasoning_tps:.1f} TPS). Reducing quantization to speed up compute."
                        rationales.append(msg)
                        print(f"[AdaptiveTuner] {msg}")
                        for p in updated_presets.get("presets", []):
                            p["params"]["quantization_target"] = "Q4_K_S" if tps > 5 else "Q3_K_M"
                            p["description"] += " (Compute-Bound Optimized)"
                    else:
                        # Memory/Bandwidth bound: speed degrades with context size
                        msg = f"Memory-bound workload detected (High TPS variance: {code_tps:.1f} vs {reasoning_tps:.1f}). Capping context window and enabling sliding window attention."
                        rationales.append(msg)
                        print(f"[AdaptiveTuner] {msg}")
                        for p in updated_presets.get("presets", []):
                            p["params"]["context_window"] = min(p["params"].get("context_window", 4096), 4096)
                            p["description"] += " (Memory-Bound Optimized)"
        else:
            # Fallback to standard heuristic if spend_report details are missing
            if tps < 10 and tps > 0:
                msg = f"Low throughput ({tps} TPS) detected. Optimizing quantization and context constraints."
                rationales.append(msg)
                print(f"[AdaptiveTuner] {msg}")
                for p in updated_presets.get("presets", []):
                    p["params"]["quantization_target"] = "Q4_K_S" if tps > 5 else "Q3_K_M"
                    p["params"]["context_window"] = min(p["params"].get("context_window", 4096), 4096)
                    p["description"] += f" (Optimized for low TPS: {tps})"

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

    def generate_initial_preset(self, model_id: str, is_embedding: bool = False) -> Dict[str, Any]:
        """
        Creates a hardware-aware initial preset.
        """
        vram = self.hardware.gpu_vram_gb or 0
        gpu_name = (self.hardware.gpu_name or "").lower()
        
        # Detect older bandwidth-constrained architectures
        is_pre_volta = any(arch in gpu_name for arch in ["m4000", "k80", "gtx 9", "gtx 10", "titan x", "p40", "m6000"])
        
        # If VRAM detection failed but GPU exists, fallback to system RAM estimate
        if vram == 0 and gpu_name:
            vram = (self.hardware.system_ram_gb or 0) * 0.75
            
        # Conservative defaults
        context_window = 4096
        gpu_offload = 0.0
        quantization_target = "Q4_K_M"
        
        if is_embedding:
            # Embedding models are small but shouldn't compete with the main LLM for VRAM
            gpu_offload = 0.0
            context_window = 8192
            quantization_target = "F16" # Usually unquantized or minimal
            description = f"Auto-tuned Embedding for {self.hardware.gpu_name or 'CPU'}"
        elif is_pre_volta:
            # Pre-Volta architecture constraints (Bandwidth bottlenecked)
            context_window = min(4096, context_window)
            gpu_offload = min(0.8, vram / 16.0)
            if vram <= 8:
                quantization_target = "Q3_K_M"
            else:
                quantization_target = "Q4_K_S"
            description = f"Auto-tuned for {self.hardware.gpu_name} (Legacy Arch Constraint)"
        else:
            if vram > 12:
                context_window = 32768
                gpu_offload = 1.0
                quantization_target = "Q6_K"
            elif vram > 7:
                context_window = 8192
                gpu_offload = 0.8
                quantization_target = "Q5_K_M"
            elif vram > 3:
                context_window = 4096
                gpu_offload = 0.5
                quantization_target = "Q4_K_M"
            description = f"Auto-tuned for {self.hardware.gpu_name or 'CPU'}"
            
        return {
            "name": f"Turbo-{model_id}",
            "model_id": model_id,
            "params": {
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 2048,
                "context_window": context_window,
                "gpu_offload": gpu_offload,
                "quantization_target": quantization_target
            },
            "description": description
        }

tuner = AdaptiveTuner({}) # Placeholder initialization
