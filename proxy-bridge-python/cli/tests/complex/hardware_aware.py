"""Hardware detection, preset generation, and spend tracking."""

import platform
import subprocess
import time
from typing import Any

import httpx
from rich.console import Console

console = Console()


class HardwareDetector:
    """Detects local hardware or queries proxy bridge for hardware info."""

    def __init__(self, base_url: str = "http://192.168.1.12:3001"):
        self.base_url = base_url.rstrip("/")

    async def detect(self) -> dict[str, Any]:
        """Try bridge first, fall back to local detection."""
        bridge_hw = await self._detect_from_bridge()
        if bridge_hw and bridge_hw.get("gpu_name"):
            return bridge_hw
        return self._detect_local()

    async def _detect_from_bridge(self) -> dict[str, Any] | None:
        """Query proxy bridge /api/status for hardware info."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/status")
                if resp.status_code == 200:
                    data = resp.json()
                    hw = data.get("hardware", {})
                    if hw:
                        return {
                            "source": "bridge",
                            "platform": hw.get("platform", platform.system()),
                            "gpu_name": hw.get("gpu_name", "Unknown"),
                            "gpu_vram_gb": hw.get("gpu_vram_gb", 0),
                            "system_ram_gb": hw.get("system_ram_gb", 0),
                            "cpu_cores": hw.get("cpu_cores", 0),
                            "apple_silicon": hw.get("apple_silicon", False),
                        }
        except Exception:
            pass
        return None

    def _detect_local(self) -> dict[str, Any]:
        """Detect hardware locally using system commands."""
        info: dict[str, Any] = {
            "source": "local",
            "platform": platform.system(),
            "gpu_name": "Unknown",
            "gpu_vram_gb": 0,
            "system_ram_gb": 0,
            "cpu_cores": 0,
            "apple_silicon": False,
        }

        info["cpu_cores"] = self._get_cpu_cores()
        info["system_ram_gb"] = round(self._get_system_ram_gb(), 1)
        info["apple_silicon"] = platform.machine().lower() in ("arm64", "aarch64") and platform.system() == "Darwin"

        gpu_info = self._get_gpu_info()
        info["gpu_name"] = gpu_info.get("name", "Unknown")
        info["gpu_vram_gb"] = gpu_info.get("vram_gb", 0)

        return info

    def _get_cpu_cores(self) -> int:
        try:
            return len(process_cpu_affinity := __import__("os").sched_getaffinity(0))
        except (AttributeError, OSError):
            return __import__("os").cpu_count() or 1

    def _get_system_ram_gb(self) -> float:
        try:
            import psutil
            return psutil.virtual_memory().total / (1024**3)
        except ImportError:
            pass

        system = platform.system()
        try:
            if system == "Windows":
                output = subprocess.check_output(
                    "wmic ComputerSystem get TotalPhysicalMemory", shell=True, text=True
                )
                for line in output.splitlines():
                    line = line.strip()
                    if line.isdigit():
                        return int(line) / (1024**3)
            elif system == "Darwin":
                output = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True)
                return int(output.strip()) / (1024**3)
            else:
                with open("/proc/meminfo") as f:
                    for line in f:
                        if line.startswith("MemTotal:"):
                            kb = int(line.split()[1])
                            return kb / (1024 * 1024)
        except Exception:
            pass
        return 0

    def _get_gpu_info(self) -> dict[str, Any]:
        system = platform.system()

        if system == "Windows":
            return self._get_gpu_windows()
        elif system == "Darwin":
            return self._get_gpu_macos()
        else:
            return self._get_gpu_linux()

    def _get_gpu_windows(self) -> dict[str, Any]:
        try:
            output = subprocess.check_output(
                'wmic path win32_VideoController get Name,AdapterRAM', shell=True, text=True
            )
            lines = output.strip().splitlines()
            if len(lines) >= 2:
                parts = lines[1].split()
                name = " ".join(parts[:-1]) if len(parts) > 1 else parts[0]
                try:
                    vram_bytes = int(parts[-1])
                    vram_gb = round(vram_bytes / (1024**3), 1)
                except (ValueError, IndexError):
                    vram_gb = 0
                return {"name": name, "vram_gb": vram_gb}
        except Exception:
            pass

        try:
            output = subprocess.check_output("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", shell=True, text=True)
            parts = output.strip().split(",")
            if len(parts) >= 2:
                name = parts[0].strip()
                vram_mb = float(parts[1].strip().replace("MiB", ""))
                return {"name": name, "vram_gb": round(vram_mb / 1024, 1)}
        except Exception:
            pass

        return {"name": "Unknown", "vram_gb": 0}

    def _get_gpu_macos(self) -> dict[str, Any]:
        try:
            output = subprocess.check_output(["system_profiler", "SPDisplaysDataType", "-json"], text=True)
            import json
            data = json.loads(output)
            gpus = data.get("SPDisplaysDataType", [])
            if gpus:
                gpu = gpus[0]
                name = gpu.get("sppci_model", "Unknown")
                vram_mb = gpu.get("spdisplays_vram", "0 MB")
                vram_str = vram_mb.replace(" MB", "").replace(" GB", "")
                try:
                    vram_val = float(vram_str)
                    vram_gb = vram_val if "GB" in str(vram_mb) else vram_val / 1024
                except ValueError:
                    vram_gb = 0
                return {"name": name, "vram_gb": round(vram_gb, 1)}
        except Exception:
            pass

        if platform.machine().lower() in ("arm64", "aarch64"):
            return {"name": "Apple Silicon (Unified Memory)", "vram_gb": 0}
        return {"name": "Unknown", "vram_gb": 0}

    def _get_gpu_linux(self) -> dict[str, Any]:
        try:
            output = subprocess.check_output("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", shell=True, text=True)
            parts = output.strip().split(",")
            if len(parts) >= 2:
                name = parts[0].strip()
                vram_mb = float(parts[1].strip().replace("MiB", ""))
                return {"name": name, "vram_gb": round(vram_mb / 1024, 1)}
        except Exception:
            pass

        try:
            for pci_dev in __import__("os").listdir("/sys/bus/pci/devices"):
                vendor_path = f"/sys/bus/pci/devices/{pci_dev}/vendor"
                device_path = f"/sys/bus/pci/devices/{pci_dev}/device"
                if __import__("os").path.exists(vendor_path):
                    with open(vendor_path) as f:
                        vendor = f.read().strip()
                    if vendor == "0x10de":
                        with open(device_path) as f:
                            device_id = f.read().strip()
                        return {"name": f"NVIDIA GPU ({device_id})", "vram_gb": 0}
        except Exception:
            pass

        return {"name": "Unknown", "vram_gb": 0}


class PresetGenerator:
    """Generates optimal presets based on hardware capabilities."""

    VRAM_TIERS = [
        {"name": "low", "max_vram": 4, "quant": "Q2_K", "context": 2048, "batch_size": 1, "gpu_layers": 20},
        {"name": "medium", "max_vram": 8, "quant": "Q4_K_M", "context": 4096, "batch_size": 8, "gpu_layers": 35},
        {"name": "high", "max_vram": 16, "quant": "Q5_K_M", "context": 8192, "batch_size": 32, "gpu_layers": 50},
        {"name": "ultra", "max_vram": float("inf"), "quant": "Q6_K", "context": 16384, "batch_size": 64, "gpu_layers": -1},
    ]

    MODEL_PRESETS: dict[str, dict[str, Any]] = {
        "qwen": {"max_context": 32768, "recommended_quant": "Q4_K_M", "temperature": 0.7},
        "llama": {"max_context": 8192, "recommended_quant": "Q4_K_M", "temperature": 0.8},
        "mistral": {"max_context": 8192, "recommended_quant": "Q5_K_M", "temperature": 0.7},
        "phi": {"max_context": 4096, "recommended_quant": "Q4_K_M", "temperature": 0.7},
        "gemma": {"max_context": 8192, "recommended_quant": "Q4_K_M", "temperature": 0.7},
    }

    def generate(self, hardware: dict[str, Any], model_name: str = "") -> dict[str, Any]:
        vram = hardware.get("gpu_vram_gb") or 0.0
        ram = hardware.get("system_ram_gb") or 0.0
        effective_memory = vram if vram > 0 else ram * 0.8

        tier = self._select_tier(effective_memory)
        model_preset = self._get_model_preset(model_name)

        context = min(tier["context"], model_preset.get("max_context", 8192))
        gpu_layers = tier["gpu_layers"]
        if hardware.get("apple_silicon"):
            gpu_layers = -1

        return {
            "tier": tier["name"],
            "hardware": {
                "gpu": hardware.get("gpu_name", "Unknown"),
                "vram_gb": vram,
                "ram_gb": ram,
                "effective_memory_gb": round(effective_memory, 1),
            },
            "quantization": tier["quant"],
            "context_length": context,
            "batch_size": tier["batch_size"],
            "gpu_layers": gpu_layers,
            "temperature": model_preset.get("temperature", 0.7),
            "max_tokens": min(context // 2, 4096),
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "model_specific": model_preset,
        }

    def _select_tier(self, vram: float) -> dict[str, Any]:
        for tier in self.VRAM_TIERS:
            if vram <= tier["max_vram"]:
                return tier
        return self.VRAM_TIERS[-1]

    def _get_model_preset(self, model_name: str) -> dict[str, Any]:
        if not model_name:
            return {}
        model_lower = model_name.lower()
        for key, preset in self.MODEL_PRESETS.items():
            if key in model_lower:
                return preset
        return {}

    def format_preset(self, preset: dict[str, Any]) -> str:
        lines = [
            f"Hardware Tier: {preset['tier'].upper()}",
            f"GPU: {preset['hardware']['gpu']}",
            f"VRAM: {preset['hardware']['vram_gb']} GB",
            f"Effective Memory: {preset['hardware']['effective_memory_gb']} GB",
            "",
            "Recommended Settings:",
            f"  Quantization: {preset['quantization']}",
            f"  Context Length: {preset['context_length']}",
            f"  Batch Size: {preset['batch_size']}",
            f"  GPU Layers: {preset['gpu_layers']}",
            f"  Temperature: {preset['temperature']}",
            f"  Max Tokens: {preset['max_tokens']}",
            f"  Top P: {preset['top_p']}",
            f"  Repeat Penalty: {preset['repeat_penalty']}",
        ]
        if preset.get("model_specific"):
            ms = preset["model_specific"]
            lines.append("")
            lines.append("Model-Specific:")
            lines.append(f"  Max Context: {ms.get('max_context', 'N/A')}")
            lines.append(f"  Recommended Quant: {ms.get('recommended_quant', 'N/A')}")
        return "\n".join(lines)


class SpendTracker:
    """Tracks token usage and computes efficiency metrics."""

    def __init__(self):
        self.runs: list[dict[str, Any]] = []

    def record(self, test_name: str, tokens: int, duration_ms: float, hardware_tier: str = "") -> dict[str, Any]:
        run = {
            "test": test_name,
            "tokens": tokens,
            "duration_ms": duration_ms,
            "hardware_tier": hardware_tier,
            "tokens_per_sec": round(tokens / (duration_ms / 1000), 1) if duration_ms > 0 else 0,
            "timestamp": time.time(),
        }
        self.runs.append(run)
        return run

    def report(self) -> dict[str, Any]:
        if not self.runs:
            return {"ok": False, "detail": "No runs recorded"}

        total_tokens = sum(r["tokens"] for r in self.runs)
        total_time_ms = sum(r["duration_ms"] for r in self.runs)
        avg_tps = total_tokens / (total_time_ms / 1000) if total_time_ms > 0 else 0

        efficiency = "low"
        if avg_tps > 50:
            efficiency = "excellent"
        elif avg_tps > 20:
            efficiency = "good"
        elif avg_tps > 10:
            efficiency = "moderate"

        by_test: dict[str, dict[str, Any]] = {}
        for r in self.runs:
            by_test[r["test"]] = {
                "tokens": r["tokens"],
                "duration_ms": r["duration_ms"],
                "tokens_per_sec": r["tokens_per_sec"],
            }

        return {
            "ok": True,
            "total_tokens": total_tokens,
            "total_time_ms": round(total_time_ms, 1),
            "avg_tokens_per_sec": round(avg_tps, 1),
            "efficiency_rating": efficiency,
            "run_count": len(self.runs),
            "by_test": by_test,
        }

    def reset(self):
        self.runs.clear()


async def run_hardware_aware_tests(base_url: str, model: str = "") -> dict[str, Any]:
    """Run hardware detection, preset generation, and quick benchmark."""
    results: dict[str, Any] = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    detector = HardwareDetector(base_url)
    generator = PresetGenerator()
    tracker = SpendTracker()

    console.print("  Detecting hardware...")
    hardware = await detector.detect()
    results["tests"]["hardware_detection"] = {
        "ok": True,
        "source": hardware.get("source", "unknown"),
        "gpu": hardware.get("gpu_name", "Unknown"),
        "vram_gb": hardware.get("gpu_vram_gb", 0),
        "ram_gb": hardware.get("system_ram_gb", 0),
        "cpu_cores": hardware.get("cpu_cores", 0),
        "apple_silicon": hardware.get("apple_silicon", False),
    }

    console.print("  Generating presets...")
    preset = generator.generate(hardware, model)
    results["tests"]["preset"] = {
        "ok": True,
        "tier": preset["tier"],
        "quantization": preset["quantization"],
        "context_length": preset["context_length"],
        "batch_size": preset["batch_size"],
        "gpu_layers": preset["gpu_layers"],
        "formatted": generator.format_preset(preset),
    }

    if model:
        console.print(f"  Running benchmarks with {model}...")
        benchmark_prompts = [
            ("short", "What is 2+2?", 20),
            ("code", "Write a Python function to reverse a string.", 100),
            ("reasoning", "Explain step by step: why is the sky blue?", 150),
        ]

        for name, prompt, max_tokens in benchmark_prompts:
            start = time.time()
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": prompt}],
                            "stream": False,
                            "max_tokens": max_tokens,
                            "temperature": preset["temperature"],
                        },
                    )
                    duration_ms = (time.time() - start) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        usage = data.get("usage", {})
                        tokens = usage.get("completion_tokens", 0)
                        tracker.record(name, tokens, duration_ms, preset["tier"])
                    else:
                        tracker.record(name, 0, duration_ms, preset["tier"])
            except Exception:
                duration_ms = (time.time() - start) * 1000
                tracker.record(name, 0, duration_ms, preset["tier"])

        spend_report = tracker.report()
        results["tests"]["spend_report"] = spend_report

        results["tests"]["benchmark"] = {
            "ok": spend_report.get("ok", False),
            "runs": spend_report.get("run_count", 0),
            "total_tokens": spend_report.get("total_tokens", 0),
            "total_time_ms": spend_report.get("total_time_ms", 0),
            "tokens_per_sec": spend_report.get("avg_tokens_per_sec", 0),
            "efficiency": spend_report.get("efficiency_rating", "unknown"),
            "by_test": spend_report.get("by_test", {}),
        }

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok
    results["detail"] = f"Tier={preset['tier']}, GPU={hardware.get('gpu_name', '?')}, Quant={preset['quantization']}"

    return results
