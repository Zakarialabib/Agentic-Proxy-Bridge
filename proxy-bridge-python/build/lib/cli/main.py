"""CLI entry point with interactive TUI."""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from cli.tui.menu import main_menu
from cli.tests.simple.health import run_health_tests
from cli.tests.simple.chat import run_chat_tests
from cli.tests.simple.openai_compat import run_openai_compat_tests
from cli.tests.simple.endpoints import run_endpoint_tests, print_endpoint_summary
from cli.tests.simple.streaming import run_streaming_tests, print_streaming_summary
from cli.tests.simple.model_management import run_model_management_tests, print_model_management_summary
from cli.tests.medium.context_window import run_context_window_tests
from cli.tests.medium.system_prompts import run_system_prompt_tests
from cli.tests.medium.few_shot import run_few_shot_tests
from cli.tests.medium.scenario_testing import run_scenario_tests, print_scenario_summary
from cli.tests.medium.parameter_sweep import run_parameter_sweep_tests, print_parameter_sweep_summary
from cli.tests.medium.tool_execution import run_tool_execution_tests, print_tool_execution_summary
from cli.tests.complex.hardware_aware import run_hardware_aware_tests
from cli.tests.complex.performance_benchmark import run_performance_benchmark_tests, print_performance_benchmark_summary
from cli.tests.complex.stress_test import run_stress_tests, print_stress_test_summary
from cli.tests.complex.model_comparison import run_model_comparison_tests, print_model_comparison_summary
from cli.tests.complex.embedding_quality import run_embedding_quality_tests, print_embedding_quality_summary
from cli.tests.full_stack.end_to_end import run_end_to_end_tests, print_end_to_end_summary
from cli.tests.full_stack.rag_pipeline import run_rag_pipeline_tests, print_rag_pipeline_summary
from cli.tests.full_stack.agentic_workflow import run_agentic_workflow_tests, print_agentic_workflow_summary
from cli.tests.full_stack.mcp_integration import run_mcp_integration_tests, print_mcp_integration_summary
from cli.workflows.git_ai import register_git_workflow
from cli.workflows.preset_apply import apply_preset, format_apply_instructions
from cli.results.store import ResultStore
from cli.runners.proxy_only import run_proxy_only
from cli.runners.frontend_only import run_frontend_only
from cli.runners.full_stack import run_full_stack

console = Console()
store = ResultStore()


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """LMStudio Test CLI - Interactive testing and benchmarking tool."""
    pass


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", default=None, help="Model to test with")
@click.option("--interactive", "-i", is_flag=True, help="Run in interactive mode")
def simple(base_url: str, model: str | None, interactive: bool):
    """Run simple API tests (health, models, chat completions)."""
    if interactive:
        asyncio.run(main_menu(base_url))
        return

    console.print(Panel("[bold cyan]Simple API Tests[/bold cyan]", border_style="cyan"))

    async def _run():
        results = {}
        console.print("\n[yellow]Running health tests...[/yellow]")
        results["health"] = await run_health_tests(base_url)

        console.print("\n[yellow]Running OpenAI compatibility tests...[/yellow]")
        results["openai_compat"] = await run_openai_compat_tests(base_url)

        if model:
            console.print(f"\n[yellow]Running chat tests with {model}...[/yellow]")
            results["chat"] = await run_chat_tests(base_url, model)

        run_id = store.save("simple", results)
        _print_summary(results, run_id)

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", default=None, help="Model to test with")
def medium(base_url: str, model: str | None):
    """Run medium complexity tests (prompt & context engineering)."""
    if not model:
        console.print("[red]Model is required for medium tests. Use --model <name>[/red]")
        return

    console.print(Panel("[bold yellow]Medium Complexity Tests[/bold yellow]", border_style="yellow"))

    async def _run():
        results = {}
        console.print("\n[yellow]Context window tests...[/yellow]")
        results["context_window"] = await run_context_window_tests(base_url, model)

        console.print("\n[yellow]System prompt tests...[/yellow]")
        results["system_prompts"] = await run_system_prompt_tests(base_url, model)

        console.print("\n[yellow]Few-shot tests...[/yellow]")
        results["few_shot"] = await run_few_shot_tests(base_url, model)

        run_id = store.save("medium", results)
        _print_summary(results, run_id)

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", default=None, help="Model to test with")
def complex(base_url: str, model: str | None):
    """Run complex tests (hardware-aware adaptation, spend optimization)."""
    console.print(Panel("[bold red]Complex Tests - Hardware Aware[/bold red]", border_style="red"))

    async def _run():
        results = await run_hardware_aware_tests(base_url, model or "")
        run_id = store.save("complex", results)
        _print_summary(results.get("tests", {}), run_id)

        preset = results.get("tests", {}).get("preset", {})
        if preset.get("ok"):
            console.print(f"\n[cyan]{preset.get('formatted', '')}[/cyan]")

        benchmark = results.get("tests", {}).get("benchmark", {})
        if benchmark.get("ok"):
            spend_table = Table(title="Spend Report")
            spend_table.add_column("Test", style="cyan")
            spend_table.add_column("Tokens", style="green")
            spend_table.add_column("Time (ms)", style="yellow")
            spend_table.add_column("Tokens/sec", style="magenta")

            for test_name, test_data in benchmark.get("by_test", {}).items():
                spend_table.add_row(
                    test_name,
                    str(test_data.get("tokens", 0)),
                    f"{test_data.get('duration_ms', 0):.0f}",
                    f"{test_data.get('tokens_per_sec', 0):.1f}",
                )

            spend_table.add_row(
                "TOTAL",
                str(benchmark.get("total_tokens", 0)),
                f"{benchmark.get('total_time_ms', 0):.0f}",
                f"{benchmark.get('tokens_per_sec', 0):.1f}",
            )

            console.print(spend_table)
            console.print(f"\n[bold]Efficiency: {benchmark.get('efficiency', 'unknown').upper()}[/bold]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--frontend-url", default="http://192.168.1.12:3000", help="Frontend URL")
@click.option("--target", default="proxy", type=click.Choice(["proxy", "frontend", "full"]), help="What to test")
def run_tests(base_url: str, frontend_url: str, target: str):
    """Run tests against specific target (proxy, frontend, or full stack)."""
    console.print(Panel(f"[bold green]Running tests: {target}[/bold green]", border_style="green"))

    async def _run():
        if target == "proxy":
            results = await run_proxy_only(base_url)
        elif target == "frontend":
            results = await run_frontend_only(frontend_url)
        else:
            results = await run_full_stack(base_url, frontend_url)

        run_id = store.save(f"run-{target}", results)
        _print_summary(results, run_id)

    asyncio.run(_run())


@cli.command()
@click.option("--limit", default=10, help="Number of recent results to show")
def history(limit: int):
    """Show test history."""
    results = store.list_recent(limit)
    if not results:
        console.print("[dim]No test results found.[/dim]")
        return

    table = Table(title="Test History")
    table.add_column("ID", style="cyan")
    table.add_column("Type", style="green")
    table.add_column("Date", style="yellow")
    table.add_column("Status", style="magenta")
    table.add_column("Duration", style="blue")

    for r in results:
        table.add_row(
            r["id"][:8],
            r["type"],
            r["timestamp"][:19],
            "PASS" if r.get("passed", 0) > 0 else "FAIL",
            f"{r.get('duration_ms', 0):.0f}ms",
        )

    console.print(table)


@cli.command()
@click.argument("run_id")
def show(run_id: str):
    """Show details of a specific test run."""
    result = store.get(run_id)
    if not result:
        console.print(f"[red]Run {run_id} not found.[/red]")
        return

    console.print(Panel(f"[bold]Test Run: {result['id'][:8]}[/bold]\nType: {result['type']}\nDate: {result['timestamp'][:19]}", border_style="cyan"))
    console.print(json.dumps(result.get("results", {}), indent=2))


@cli.command()
@click.argument("run_id_1")
@click.argument("run_id_2")
def compare(run_id_1: str, run_id_2: str):
    """Compare two test runs."""
    comparison = store.compare(run_id_1, run_id_2)
    if not comparison:
        console.print("[red]One or both runs not found.[/red]")
        return

    table = Table(title=f"Comparison: {comparison['run_1']['id']} vs {comparison['run_2']['id']}")
    table.add_column("Metric", style="cyan")
    table.add_column("Run 1", style="green")
    table.add_column("Run 2", style="yellow")
    table.add_column("Delta", style="magenta")

    table.add_row("Type", comparison["run_1"]["type"], comparison["run_2"]["type"], "")
    table.add_row("Date", comparison["run_1"]["timestamp"], comparison["run_2"]["timestamp"], "")

    for key, diff in comparison["differences"].items():
        table.add_row(key, str(diff.get("run_1", "")), str(diff.get("run_2", "")), str(diff.get("delta", "")))

    console.print(table)

    if not comparison["differences"]:
        console.print("[green]No significant differences found.[/green]")


@cli.command()
@click.option("--run-id", default=None, help="Export specific run (defaults to all)")
@click.option("--format", "fmt", default="json", type=click.Choice(["json", "csv"]), help="Export format")
@click.option("--output", "-o", default=None, help="Output file path")
def export(run_id: str | None, fmt: str, output: str | None):
    """Export test results to JSON or CSV."""
    if run_id:
        result = store.get(run_id)
        if not result:
            console.print(f"[red]Run {run_id} not found.[/red]")
            return
        data = [result]
    else:
        data = store.list_recent(100)
        if not data:
            console.print("[dim]No results to export.[/dim]")
            return

    if fmt == "json":
        content = json.dumps(data, indent=2, default=str)
    else:
        import csv
        import io
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "type", "timestamp", "passed", "failed", "duration_ms"])
        for r in data:
            writer.writerow([r["id"], r["type"], r["timestamp"], r.get("passed", 0), r.get("failed", 0), r.get("duration_ms", 0)])
        content = buf.getvalue()

    if output:
        with open(output, "w") as f:
            f.write(content)
        console.print(f"[green]Exported to {output}[/green]")
    else:
        console.print(content)


def _print_summary(results: dict, run_id: str):
    """Print test summary."""
    table = Table(title=f"Test Summary (Run: {run_id[:8]})")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Details", style="yellow")

    for name, result in results.items():
        status = "PASS" if result.get("ok") else "FAIL"
        details = result.get("detail", "")
        table.add_row(name, status, str(details)[:50])

    console.print(table)
    console.print(f"\n[dim]Results saved. View with: lmstudio-test history[/dim]")


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", default=None, help="Model to test with")
@click.option("--apply", is_flag=True, help="Attempt to apply preset via proxy bridge")
def preset(base_url: str, model: str | None, apply: bool):
    """Auto-detect hardware and generate optimal presets."""
    console.print(Panel("[bold magenta]Preset Generator[/bold magenta]", border_style="magenta"))

    async def _run():
        result = await apply_preset(base_url, model or "", None)

        if result.get("ok"):
            console.print(f"\n[cyan]{format_apply_instructions(result['preset'])}[/cyan]")
            if result.get("applied"):
                console.print("\n[green]Preset applied successfully via proxy bridge.[/green]")
            else:
                console.print(f"\n[yellow]{result.get('detail', '')}[/yellow]")
        else:
            console.print(f"[red]Failed: {result.get('detail', 'Unknown error')}[/red]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
def endpoints(base_url: str):
    """Test all API endpoints individually."""
    console.print(Panel("[bold cyan]Endpoint Tests[/bold cyan]", border_style="cyan"))

    async def _run():
        results = await run_endpoint_tests(base_url)
        run_id = store.save("endpoints", results)
        print_endpoint_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test streaming with")
def streaming(base_url: str, model: str):
    """Test SSE streaming behavior."""
    console.print(Panel("[bold cyan]Streaming Tests[/bold cyan]", border_style="cyan"))

    async def _run():
        results = await run_streaming_tests(base_url, model)
        run_id = store.save("streaming", results)
        print_streaming_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
def models(base_url: str):
    """Test model management endpoints."""
    console.print(Panel("[bold cyan]Model Management Tests[/bold cyan]", border_style="cyan"))

    async def _run():
        results = await run_model_management_tests(base_url)
        run_id = store.save("model_management", results)
        print_model_management_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test scenarios with")
@click.option("--scenarios", default=None, help="Comma-separated scenario names to test")
def scenarios(base_url: str, model: str, scenarios: str | None):
    """Run scenario-based tests (code, creative, math, etc.)."""
    console.print(Panel("[bold yellow]Scenario Tests[/bold yellow]", border_style="yellow"))

    async def _run():
        scenario_list = [s.strip() for s in scenarios.split(",")] if scenarios else None
        results = await run_scenario_tests(base_url, model, scenario_list)
        run_id = store.save("scenarios", results)
        print_scenario_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test parameters with")
def paramsweep(base_url: str, model: str):
    """Run parameter sweep tests (temperature, top_p, max_tokens)."""
    console.print(Panel("[bold yellow]Parameter Sweep Tests[/bold yellow]", border_style="yellow"))

    async def _run():
        results = await run_parameter_sweep_tests(base_url, model)
        run_id = store.save("paramsweep", results)
        print_parameter_sweep_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test tools with")
def tools(base_url: str, model: str):
    """Run tool execution tests (function calling, multi-tool)."""
    console.print(Panel("[bold yellow]Tool Execution Tests[/bold yellow]", border_style="yellow"))

    async def _run():
        results = await run_tool_execution_tests(base_url, model)
        run_id = store.save("tools", results)
        print_tool_execution_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to benchmark")
@click.option("--iterations", default=5, help="Number of iterations for benchmarks")
def benchmark(base_url: str, model: str, iterations: int):
    """Run performance benchmarks (throughput, latency, concurrency)."""
    console.print(Panel("[bold red]Performance Benchmarks[/bold red]", border_style="red"))

    async def _run():
        results = await run_performance_benchmark_tests(base_url, model, iterations)
        run_id = store.save("benchmark", results)
        print_performance_benchmark_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to stress test")
def stress(base_url: str, model: str):
    """Run stress tests (rapid requests, large payloads, long-running)."""
    console.print(Panel("[bold red]Stress Tests[/bold red]", border_style="red"))

    async def _run():
        results = await run_stress_tests(base_url, model)
        run_id = store.save("stress", results)
        print_stress_test_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--models", required=True, help="Comma-separated model names to compare")
def compare_models(base_url: str, models: str):
    """Compare performance across multiple models."""
    console.print(Panel("[bold red]Model Comparison[/bold red]", border_style="red"))
    model_list = [m.strip() for m in models.split(",")]

    async def _run():
        results = await run_model_comparison_tests(base_url, model_list)
        run_id = store.save("model_comparison", results)
        print_model_comparison_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Embedding model to test")
def embeddings(base_url: str, model: str):
    """Run embedding quality tests (similarity, dimensions, performance)."""
    console.print(Panel("[bold magenta]Embedding Quality Tests[/bold magenta]", border_style="magenta"))

    async def _run():
        results = await run_embedding_quality_tests(base_url, model)
        run_id = store.save("embeddings", results)
        print_embedding_quality_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test end-to-end with")
def e2e(base_url: str, model: str):
    """Run end-to-end integration tests."""
    console.print(Panel("[bold green]End-to-End Tests[/bold green]", border_style="green"))

    async def _run():
        results = await run_end_to_end_tests(base_url, model)
        run_id = store.save("e2e", results)
        print_end_to_end_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test RAG with")
def rag(base_url: str, model: str):
    """Run RAG pipeline tests."""
    console.print(Panel("[bold green]RAG Pipeline Tests[/bold green]", border_style="green"))

    async def _run():
        results = await run_rag_pipeline_tests(base_url, model)
        run_id = store.save("rag", results)
        print_rag_pipeline_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test agents with")
def agents(base_url: str, model: str):
    """Run agentic workflow tests."""
    console.print(Panel("[bold green]Agentic Workflow Tests[/bold green]", border_style="green"))

    async def _run():
        results = await run_agentic_workflow_tests(base_url, model)
        run_id = store.save("agents", results)
        print_agentic_workflow_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
@click.option("--model", required=True, help="Model to test MCP with")
def mcp(base_url: str, model: str):
    """Run MCP integration tests."""
    console.print(Panel("[bold green]MCP Integration Tests[/bold green]", border_style="green"))

    async def _run():
        results = await run_mcp_integration_tests(base_url, model)
        run_id = store.save("mcp", results)
        print_mcp_integration_summary(results)
        console.print(f"\n[dim]Results saved. Run ID: {run_id[:8]}[/dim]")

    asyncio.run(_run())


register_git_workflow(cli)


if __name__ == "__main__":
    cli()
