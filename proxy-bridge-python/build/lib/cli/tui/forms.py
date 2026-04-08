"""Interactive input forms for model selection and parameter configuration."""

from rich.console import Console
from rich.prompt import Prompt, IntPrompt, FloatPrompt
from rich.table import Table

console = Console()


def select_model(models: list[str]) -> str | None:
    """Interactive model selector."""
    if not models:
        console.print("[yellow]No models available.[/yellow]")
        return None

    table = Table(title="Available Models")
    table.add_column("#", style="cyan")
    table.add_column("Model ID", style="green")

    for i, m in enumerate(models, 1):
        table.add_row(str(i), m)

    console.print(table)
    choice = IntPrompt.ask("Select model (0 for none)", default=1)

    if 0 < choice <= len(models):
        return models[choice - 1]
    return None


def configure_chat_params(defaults: dict | None = None) -> dict:
    """Interactive chat parameter configuration."""
    defaults = defaults or {
        "temperature": 0.7,
        "max_tokens": 512,
        "top_p": 1.0,
        "context_window": 8192,
    }

    console.print("\n[bold]Chat Parameters[/bold]")

    temperature = FloatPrompt.ask(
        "Temperature",
        default=defaults.get("temperature", 0.7),
    )
    max_tokens = IntPrompt.ask(
        "Max Tokens",
        default=defaults.get("max_tokens", 512),
    )
    top_p = FloatPrompt.ask(
        "Top P",
        default=defaults.get("top_p", 1.0),
    )
    context_window = IntPrompt.ask(
        "Context Window",
        default=defaults.get("context_window", 8192),
    )

    return {
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "context_window": context_window,
    }


def enter_prompt(default: str = "") -> str:
    """Enter a custom prompt for testing."""
    console.print("\n[bold]Enter Test Prompt[/bold]")
    return Prompt.ask("Prompt", default=default)


def select_test_target() -> str:
    """Select what to test: proxy, frontend, or both."""
    console.print("\n[bold]Test Target[/bold]")
    console.print("  1. Proxy Bridge only (port 3001)")
    console.print("  2. Frontend only (port 3000)")
    console.print("  3. Full stack (both)")

    choice = Prompt.ask("Select target", choices=["1", "2", "3"], default="1")
    return {"1": "proxy", "2": "frontend", "3": "full"}[choice]


def configure_hardware_preset(hardware: dict | None = None) -> dict:
    """Configure or accept hardware-based preset recommendations."""
    hardware = hardware or {}

    console.print("\n[bold]Hardware Configuration[/bold]")

    if hardware:
        console.print(f"  GPU: {hardware.get('gpu_name', 'Unknown')}")
        console.print(f"  VRAM: {hardware.get('gpu_vram_gb', 'Unknown')} GB")
        console.print(f"  RAM: {hardware.get('system_ram_gb', 'Unknown')} GB")
        console.print(f"  CPU Cores: {hardware.get('cpu_cores', 'Unknown')}")

    vram_budget = FloatPrompt.ask(
        "VRAM Budget (GB)",
        default=hardware.get("gpu_vram_gb", 8.0) * 0.8,
    )
    max_context = IntPrompt.ask(
        "Max Context Length",
        default=8192,
    )

    return {
        "vram_budget_gb": vram_budget,
        "max_context_length": max_context,
        "detected_hardware": hardware,
    }
