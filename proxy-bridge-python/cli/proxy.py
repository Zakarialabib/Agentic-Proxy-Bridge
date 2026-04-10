import os
import sys
from pathlib import Path
import click
import uvicorn
from rich.console import Console
from rich.prompt import Prompt
from dotenv import set_key, load_dotenv

console = Console()

@click.command(name="proxy")
def proxy():
    """Interactive proxy bridge runner."""
    console.print("[bold cyan]Welcome to the Proxy Bridge Runner![/bold cyan]")
    
    backend = Prompt.ask(
        "Which backend would you like to use?",
        choices=["lmstudio", "vllm"],
        default="lmstudio"
    )
    
    env_file = Path(".env")
    if not env_file.exists():
        env_file.touch()
        
    set_key(str(env_file), "ACTIVE_BACKEND", backend)
    console.print(f"[green]✓ ACTIVE_BACKEND set to [bold]{backend}[/bold][/green]")
    
    if backend == "vllm":
        cache_dir = Path.home() / ".cache" / "lm-studio" / "models"
        
        if cache_dir.exists() and cache_dir.is_dir():
            gguf_files = list(cache_dir.rglob("*.gguf"))
            if not gguf_files:
                console.print("[yellow]No .gguf files found in ~/.cache/lm-studio/models[/yellow]")
                vllm_model = Prompt.ask("Enter the path to your .gguf model")
            else:
                console.print("\n[bold]Found the following models:[/bold]")
                for i, file in enumerate(gguf_files, 1):
                    console.print(f"[{i}] {file.relative_to(cache_dir)}")
                    
                while True:
                    try:
                        choice = Prompt.ask("Select a model (number)", default="1")
                        choice_idx = int(choice) - 1
                        if 0 <= choice_idx < len(gguf_files):
                            selected_file = gguf_files[choice_idx]
                            vllm_model = str(selected_file)
                            break
                        else:
                            console.print("[red]Invalid selection. Try again.[/red]")
                    except ValueError:
                        console.print("[red]Please enter a valid number.[/red]")
        else:
            console.print(f"[yellow]Cache directory {cache_dir} not found.[/yellow]")
            vllm_model = Prompt.ask("Enter the path to your .gguf model")
            
        set_key(str(env_file), "VLLM_MODEL", vllm_model)
        console.print(f"[green]✓ VLLM_MODEL set to [bold]{vllm_model}[/bold][/green]")
        
    console.print("\n[bold green]Starting proxy bridge...[/bold green]")
    
    # Reload env to ensure settings pick up the new variables if needed
    load_dotenv(env_file, override=True)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3001,
        reload=False
    )

def register_proxy_command(cli_group):
    cli_group.add_command(proxy)
