"""Preset auto-apply: generates and applies optimal settings to LMStudio."""

import httpx
from rich.console import Console

from cli.tests.complex.hardware_aware import HardwareDetector, PresetGenerator

console = Console()


async def apply_preset(base_url: str, model: str = "", preset_override: dict | None = None) -> dict:
    """Detect hardware, generate preset, and attempt to apply via proxy bridge."""
    detector = HardwareDetector(base_url)
    generator = PresetGenerator()

    hardware = await detector.detect()
    preset = generator.generate(hardware, model)

    if preset_override:
        preset.update(preset_override)

    results = {
        "ok": True,
        "hardware": hardware,
        "preset": preset,
        "applied": False,
        "detail": "",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base_url}/api/v1/presets/apply",
                json={
                    "quantization": preset["quantization"],
                    "context_length": preset["context_length"],
                    "batch_size": preset["batch_size"],
                    "gpu_layers": preset["gpu_layers"],
                    "temperature": preset["temperature"],
                    "max_tokens": preset["max_tokens"],
                    "top_p": preset["top_p"],
                    "repeat_penalty": preset["repeat_penalty"],
                },
            )
            if resp.status_code in (200, 201):
                results["applied"] = True
                results["detail"] = "Preset applied successfully via proxy bridge"
            else:
                results["applied"] = False
                results["detail"] = f"Preset endpoint returned {resp.status_code}. Apply settings manually."
    except Exception as e:
        results["applied"] = False
        results["detail"] = f"Could not apply preset: {str(e)}"

    return results


def format_apply_instructions(preset: dict) -> str:
    """Format preset as manual LMStudio configuration instructions."""
    lines = [
        "Manual LMStudio Configuration:",
        "",
        "In LMStudio, set the following:",
        f"  Context Length: {preset['context_length']}",
        f"  GPU Offload Layers: {preset['gpu_layers']}",
        f"  Batch Size: {preset['batch_size']}",
        f"  Temperature: {preset['temperature']}",
        f"  Max Tokens: {preset['max_tokens']}",
        f"  Top P: {preset['top_p']}",
        f"  Repeat Penalty: {preset['repeat_penalty']}",
        "",
        f"Recommended model quantization: {preset['quantization']}",
        "",
        "For API calls, use these parameters in your request body.",
    ]
    return "\n".join(lines)
