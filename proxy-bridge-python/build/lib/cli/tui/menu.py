"""Main interactive menu."""

import asyncio

import httpx
from rich.console import Console
from rich.prompt import Prompt, IntPrompt
from rich.panel import Panel
from rich.table import Table

from cli.tests.simple.health import run_health_tests
from cli.tests.simple.chat import run_chat_tests
from cli.tests.simple.openai_compat import run_openai_compat_tests
from cli.tests.simple.anthropic_compat import run_anthropic_compat_tests
from cli.tests.medium.context_window import run_context_window_tests
from cli.tests.medium.system_prompts import run_system_prompt_tests
from cli.tests.medium.few_shot import run_few_shot_tests
from cli.tests.complex.hardware_aware import run_hardware_aware_tests
from cli.workflows.git_ai import run_git_workflow
from cli.workflows.preset_apply import apply_preset, format_apply_instructions
from cli.results.store import ResultStore
from cli.runners.proxy_only import run_proxy_only
from cli.runners.frontend_only import run_frontend_only
from cli.runners.full_stack import run_full_stack

console = Console()
store = ResultStore()


async def main_menu(base_url: str = "http://192.168.1.12:3001"):
    """Main interactive menu loop."""
    console.clear()
    console.print(Panel(
        "[bold cyan]LMStudio Test CLI[/bold cyan]\n"
        "[dim]Interactive testing and benchmarking tool[/dim]",
        border_style="cyan",
    ))

    # Detect available models
    models = await _detect_models(base_url)
    hardware = await _detect_hardware(base_url)

    selected_model = None
    if models:
        console.print("\n[bold]Available Models:[/bold]")
        for i, m in enumerate(models, 1):
            console.print(f"  {i}. {m}")
        choice = IntPrompt.ask("\nSelect model (0 for none)", default=1)
        if 0 < choice <= len(models):
            selected_model = models[choice - 1]

    while True:
        console.print("\n" + "=" * 60)
        console.print("[bold]Main Menu[/bold]")
        console.print("=" * 60)
        console.print("  1. Simple API Tests (health, models, chat)")
        console.print("  2. OpenAI Compatibility Tests")
        console.print("  3. Anthropic Compatibility Tests")
        console.print("  4. Chat Completion Tests")
        console.print("  5. Medium: Context Window Tests")
        console.print("  6. Medium: System Prompt Tests")
        console.print("  7. Medium: Few-Shot Tests")
        console.print("  8. Complex: Hardware-Aware + Presets")
        console.print("  9. Git Workflow (AI commit, review, PR)")
        console.print("  10. Run: Proxy Bridge Only")
        console.print("  11. Run: Frontend Only")
        console.print("  12. Run: Full Stack (both)")
        console.print("  13. View Test History")
        console.print("  14. Change Model")
        console.print("  0. Exit")
        console.print(f"\n[dim]Current: base_url={base_url}, model={selected_model or 'none'}[/dim]")

        choice = Prompt.ask("\nSelect option", default="1")

        if choice == "0":
            console.print("[green]Goodbye![/green]")
            break
        elif choice == "1":
            await _run_simple_tests(base_url, selected_model)
        elif choice == "2":
            await _run_openai_compat(base_url)
        elif choice == "3":
            await _run_anthropic_compat(base_url)
        elif choice == "4":
            if selected_model:
                await _run_chat_tests(base_url, selected_model)
            else:
                console.print("[red]No model selected. Choose option 14 first.[/red]")
        elif choice == "5":
            if selected_model:
                await _run_context_window(base_url, selected_model)
            else:
                console.print("[red]No model selected. Choose option 14 first.[/red]")
        elif choice == "6":
            if selected_model:
                await _run_system_prompts(base_url, selected_model)
            else:
                console.print("[red]No model selected. Choose option 14 first.[/red]")
        elif choice == "7":
            if selected_model:
                await _run_few_shot(base_url, selected_model)
            else:
                console.print("[red]No model selected. Choose option 14 first.[/red]")
        elif choice == "8":
            await _run_hardware_aware(base_url, selected_model)
        elif choice == "9":
            if selected_model:
                await _run_git_workflow(base_url, selected_model)
            else:
                console.print("[red]No model selected. Choose option 14 first.[/red]")
        elif choice == "10":
            await _run_proxy_only(base_url)
        elif choice == "11":
            await _run_frontend_only()
        elif choice == "12":
            await _run_full_stack(base_url)
        elif choice == "13":
            _show_history()
        elif choice == "14":
            models = await _detect_models(base_url)
            if models:
                console.print("\n[bold]Available Models:[/bold]")
                for i, m in enumerate(models, 1):
                    console.print(f"  {i}. {m}")
                choice = IntPrompt.ask("\nSelect model", default=1)
                if 0 < choice <= len(models):
                    selected_model = models[choice - 1]
                    console.print(f"[green]Selected: {selected_model}[/green]")
        else:
            console.print("[red]Invalid option.[/red]")

        _wait_for_enter()


async def _detect_models(base_url: str) -> list[str]:
    """Detect available models from the proxy bridge."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            if resp.status_code == 200:
                data = resp.json()
                models_data = data.get("data", data) if isinstance(data, dict) else data
                return [m.get("id", m) if isinstance(m, dict) else str(m) for m in models_data]
    except Exception:
        pass
    return []


async def _detect_hardware(base_url: str) -> dict | None:
    """Detect hardware info from the proxy bridge."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/status")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("hardware")
    except Exception:
        pass
    return None


async def _run_simple_tests(base_url: str, model: str | None):
    """Run all simple tests."""
    console.print("\n[bold cyan]Running Simple API Tests...[/bold cyan]")
    results = {}

    console.print("\n[yellow]1/3 Health tests...[/yellow]")
    results["health"] = await run_health_tests(base_url)

    console.print("\n[yellow]2/3 OpenAI compatibility...[/yellow]")
    results["openai_compat"] = await run_openai_compat_tests(base_url)

    if model:
        console.print(f"\n[yellow]3/3 Chat tests ({model})...[/yellow]")
        results["chat"] = await run_chat_tests(base_url, model)

    run_id = store.save("simple", results)
    _print_results_table(results, run_id)


async def _run_openai_compat(base_url: str):
    """Run OpenAI compatibility tests."""
    console.print("\n[bold cyan]Running OpenAI Compatibility Tests...[/bold cyan]")
    results = await run_openai_compat_tests(base_url)
    run_id = store.save("openai-compat", results)
    _print_results_table({"openai_compat": results}, run_id)


async def _run_anthropic_compat(base_url: str):
    """Run Anthropic compatibility tests."""
    console.print("\n[bold cyan]Running Anthropic Compatibility Tests...[/bold cyan]")
    results = await run_anthropic_compat_tests(base_url)
    run_id = store.save("anthropic-compat", results)
    _print_results_table({"anthropic_compat": results}, run_id)


async def _run_chat_tests(base_url: str, model: str):
    """Run chat completion tests."""
    console.print(f"\n[bold cyan]Running Chat Tests with {model}...[/bold cyan]")
    results = await run_chat_tests(base_url, model)
    run_id = store.save("chat", results)
    _print_results_table({"chat": results}, run_id)


async def _run_proxy_only(base_url: str):
    """Run proxy-only tests."""
    console.print("\n[bold cyan]Running Proxy Bridge Tests...[/bold cyan]")
    results = await run_proxy_only(base_url)
    run_id = store.save("proxy-only", results)
    _print_results_table(results, run_id)


async def _run_frontend_only():
    """Run frontend-only tests."""
    console.print("\n[bold cyan]Running Frontend Tests...[/bold cyan]")
    results = await run_frontend_only()
    run_id = store.save("frontend-only", results)
    _print_results_table(results, run_id)


async def _run_full_stack(base_url: str):
    """Run full stack tests."""
    console.print("\n[bold cyan]Running Full Stack Tests...[/bold cyan]")
    results = await run_full_stack(base_url)
    run_id = store.save("full-stack", results)
    _print_results_table(results, run_id)


def _show_history():
    """Show test history."""
    results = store.list_recent(10)
    if not results:
        console.print("[dim]No test results found.[/dim]")
        return

    table = Table(title="Test History")
    table.add_column("ID", style="cyan")
    table.add_column("Type", style="green")
    table.add_column("Date", style="yellow")
    table.add_column("Status", style="magenta")

    for r in results:
        table.add_row(
            r["id"][:8],
            r["type"],
            r["timestamp"][:19],
            "PASS" if r.get("passed", 0) > 0 else "FAIL",
        )

    console.print(table)


def _print_results_table(results: dict, run_id: str):
    """Print results as a table."""
    table = Table(title=f"Test Results (Run: {run_id[:8]})")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Detail", style="yellow")

    for name, result in results.items():
        status = "PASS" if result.get("ok") else "FAIL"
        detail = str(result.get("detail", result.get("error", "")))[:60]
        table.add_row(name, status, detail)

    console.print(table)


async def _run_context_window(base_url: str, model: str):
    """Run context window tests."""
    console.print(f"\n[bold yellow]Context Window Tests ({model})[/bold yellow]")
    results = await run_context_window_tests(base_url, model)
    run_id = store.save("medium-context", results)
    _print_results_table(results.get("tests", {}), run_id)


async def _run_system_prompts(base_url: str, model: str):
    """Run system prompt tests."""
    console.print(f"\n[bold yellow]System Prompt Tests ({model})[/bold yellow]")
    results = await run_system_prompt_tests(base_url, model)
    run_id = store.save("medium-prompts", results)
    _print_results_table(results.get("tests", {}), run_id)


async def _run_few_shot(base_url: str, model: str):
    """Run few-shot tests."""
    console.print(f"\n[bold yellow]Few-Shot Tests ({model})[/bold yellow]")
    results = await run_few_shot_tests(base_url, model)
    run_id = store.save("medium-fewshot", results)
    _print_results_table(results.get("tests", {}), run_id)


async def _run_hardware_aware(base_url: str, model: str | None):
    """Run hardware-aware tests with preset generation."""
    console.print("\n[bold red]Hardware-Aware Tests[/bold red]")
    results = await run_hardware_aware_tests(base_url, model or "")
    run_id = store.save("complex-hardware", results)
    _print_results_table(results.get("tests", {}), run_id)

    preset = results.get("tests", {}).get("preset", {})
    if preset.get("ok"):
        console.print(f"\n[cyan]{preset.get('formatted', '')}[/cyan]")


async def _run_git_workflow(base_url: str, model: str):
    """Run AI git workflow."""
    console.print(f"\n[bold magenta]AI Git Workflow ({model})[/bold magenta]")
    results = await run_git_workflow(base_url, model)
    run_id = store.save("git-workflow", results)

    table = Table(title="Git Workflow Results")
    table.add_column("Step", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Detail", style="yellow")

    diff = results.get("diff", {})
    commit = results.get("commit", {})
    review = results.get("review", {})
    pr = results.get("pr_description", {})

    table.add_row("Diff", "OK" if diff.get("ok") else "FAIL", diff.get("stat", "")[:50] or diff.get("error", ""))
    table.add_row("Commit", "OK" if commit.get("ok") else "FAIL", commit.get("commit_message", "")[:50])
    table.add_row("Review", "OK" if review.get("ok") else "FAIL", f"Rating: {review.get('rating', 0)}/5")
    table.add_row("PR Desc", "OK" if pr.get("ok") else "FAIL", pr.get("title", "")[:50])

    console.print(table)

    if commit.get("ok"):
        console.print(Panel(f"[bold]Commit:[/bold] {commit['commit_message']}\n{commit.get('commit_body', '')}", border_style="green"))
    if review.get("ok"):
        console.print(Panel(f"[bold]Review:[/bold] {review['review']}\nIssues: {len(review.get('issues', []))}, Suggestions: {len(review.get('suggestions', []))}", border_style="yellow"))
    if pr.get("ok"):
        console.print(Panel(f"[bold]PR Title:[/bold] {pr['title']}\n\n{pr.get('body', '')}", border_style="blue"))

    console.print(f"\n[dim]{results.get('detail', '')}[/dim]")


def _wait_for_enter():
    """Wait for user to press Enter."""
    Prompt.ask("\nPress Enter to continue")
