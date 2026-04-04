"""Live progress bars for long-running tests."""

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

console = Console()


def test_progress():
    """Create a progress context for test runs."""
    return Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        BarColumn(bar_width=40),
        TextColumn("[yellow]{task.fields[detail]}"),
        TimeElapsedColumn(),
        console=console,
    )


def single_progress(description: str):
    """Create a single-task progress context."""
    return Progress(
        SpinnerColumn(),
        TextColumn(f"[bold cyan]{description}[/bold cyan]"),
        BarColumn(bar_width=40),
        TimeElapsedColumn(),
        console=console,
    )
