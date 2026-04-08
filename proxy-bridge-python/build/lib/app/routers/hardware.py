import psutil
import platform
from functools import lru_cache
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/hardware", tags=["Hardware"])


class HardwareProfile(BaseModel):
    platform: str
    cpu_cores: int
    system_ram_gb: float
    gpu_name: Optional[str] = None
    gpu_vram_gb: Optional[float] = None
    apple_silicon: bool = False


@lru_cache(maxsize=1)
def _get_cached_hardware() -> HardwareProfile:
    cpu_cores = psutil.cpu_count(logical=True) or 1
    system_ram_gb = psutil.virtual_memory().total / (1024**3)

    gpu_name = None
    gpu_vram_gb = None
    apple_silicon = platform.processor() == "arm" and platform.system() == "Darwin"

    if apple_silicon:
        gpu_name = "Apple Silicon Unified Memory"
        gpu_vram_gb = system_ram_gb * 0.75
    else:
        try:
            import subprocess
            result = subprocess.run(
                ["wmic", "path", "win32_videocontroller", "get", "name"],
                capture_output=True, text=True, timeout=5
            )
            lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip() and l.strip().lower() != "name"]
            if lines:
                gpu_name = lines[0]
        except Exception:
            pass

    return HardwareProfile(
        platform=platform.system().lower(),
        cpu_cores=cpu_cores,
        system_ram_gb=round(system_ram_gb, 2),
        gpu_name=gpu_name,
        gpu_vram_gb=round(gpu_vram_gb, 2) if gpu_vram_gb else None,
        apple_silicon=apple_silicon,
    )


@router.get("/profile")
async def get_hardware_profile() -> HardwareProfile:
    return _get_cached_hardware()


@router.get("/memory")
async def get_memory_info():
    vm = psutil.virtual_memory()
    return {
        "total_gb": round(vm.total / (1024**3), 2),
        "available_gb": round(vm.available / (1024**3), 2),
        "used_gb": round(vm.used / (1024**3), 2),
        "percent": vm.percent,
    }


@router.get("/cpu")
async def get_cpu_info():
    freq = psutil.cpu_freq()
    return {
        "cores_logical": psutil.cpu_count(logical=True),
        "cores_physical": psutil.cpu_count(logical=False),
        "frequency_mhz": round(freq.current, 2) if freq else None,
        "percent": psutil.cpu_percent(interval=0.1),
    }
