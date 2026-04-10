"""
Hardware Profiler Service
Provides hardware detection and profiling for adaptive tuning.
"""

import platform
import os
from typing import Dict, Any, Optional


class HardwareProfiler:
    """
    Detects system hardware capabilities for adaptive model tuning.
    """
    
    def __init__(self):
        self._profile: Optional[Dict[str, Any]] = None
    
    def profile(self) -> Dict[str, Any]:
        """Return hardware profile with detected specs."""
        if self._profile is not None:
            return self._profile
        
        self._profile = self._detect_hardware()
        return self._profile
    
    def _detect_hardware(self) -> Dict[str, Any]:
        """Detect hardware specifications."""
        profile = {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "architecture": platform.machine(),
            "python_version": platform.python_version(),
        }
        
        # Try to detect CPU
        try:
            import psutil
            profile["cpu"] = {
                "count": psutil.cpu_count(logical=True),
                "physical_count": psutil.cpu_count(logical=False),
                "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
            }
        except ImportError:
            profile["cpu"] = {"count": os.cpu_count() or 1}
        
        # Try to detect memory
        try:
            import psutil
            mem = psutil.virtual_memory()
            profile["memory"] = {
                "total_gb": round(mem.total / (1024**3), 2),
                "available_gb": round(mem.available / (1024**3), 2),
                "percent": mem.percent,
            }
        except ImportError:
            profile["memory"] = {"total_gb": 8, "estimated": True}
        
        # Try to detect GPU (basic)
        profile["gpu"] = self._detect_gpu()
        
        return profile
    
    def _detect_gpu(self) -> Dict[str, Any]:
        """Attempt to detect GPU information."""
        gpu_info = {"available": False}
        
        try:
            # Try nvidia-smi
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split("\n")
                if lines:
                    parts = lines[0].split(",")
                    gpu_info = {
                        "available": True,
                        "name": parts[0].strip() if len(parts) > 0 else "Unknown",
                        "memory_gb": round(float(parts[1].strip().split()[0]) / 1024, 2) if len(parts) > 1 else None,
                    }
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
            pass
        
        return gpu_info
    
    def get_vram_budget_gb(self) -> float:
        """Get available VRAM budget in GB."""
        profile = self.profile()
        gpu = profile.get("gpu", {})
        
        if gpu.get("available") and gpu.get("memory_gb"):
            # Reserve 1GB for system
            return max(gpu["memory_gb"] - 1, 1)
        
        # Fallback: estimate based on system RAM
        memory = profile.get("memory", {})
        total_gb = memory.get("total_gb", 8)
        
        # Conservative estimate: 1/4 of system RAM for integrated GPU
        return max(total_gb / 4, 2)
    
    def get_recommended_quantization(self, model_size_gb: float) -> str:
        """Recommend quantization level based on available VRAM."""
        vram = self.get_vram_budget_gb()
        
        if vram >= 16:
            return "Q6_K"
        elif vram >= 10:
            return "Q5_K_M"
        elif vram >= 6:
            return "Q4_K_M"
        elif vram >= 4:
            return "Q4_K_S"
        else:
            return "Q3_K_M"
    
    def get_recommended_context_window(self, model_size_gb: float) -> int:
        """Recommend context window size based on VRAM budget."""
        vram = self.get_vram_budget_gb()
        
        # Rough estimate: ~1GB per 4K context for Q4 quantization
        base_context = int(vram * 4096)
        
        # Clamp to common values
        if base_context >= 32768:
            return 32768
        elif base_context >= 16384:
            return 16384
        elif base_context >= 8192:
            return 8192
        else:
            return 4096


# Singleton instance
profiler = HardwareProfiler()