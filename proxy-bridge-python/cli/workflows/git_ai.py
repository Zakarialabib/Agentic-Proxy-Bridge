"""AI-powered git workflow module."""

import asyncio
import json
import subprocess
from datetime import datetime

import click
import httpx


async def generate_commit_message(base_url: str, model: str, diff_text: str) -> dict:
    """Generate a conventional commit message from git diff using AI."""
    if not diff_text.strip():
        return {
            "ok": False,
            "commit_message": "",
            "commit_body": "",
            "analysis": "No changes detected in diff.",
            "detail": "Empty diff provided",
        }

    system_prompt = "You are a git expert. Analyze code changes and generate conventional commit messages."
    user_prompt = (
        f"Analyze the following git diff and generate a conventional commit message.\n\n"
        f"Return a JSON object with these fields:\n"
        f"- type: one of feat, fix, docs, style, refactor, perf, test, chore, build, ci\n"
        f"- scope: optional scope in parentheses\n"
        f"- description: short summary (max 72 chars)\n"
        f"- body: detailed explanation of what changed and why\n"
        f"- analysis: brief analysis of the changes\n\n"
        f"Diff:\n```\n{diff_text[:8000]}\n```"
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                    "max_tokens": 500,
                    "temperature": 0.3,
                },
            )

            if resp.status_code != 200:
                return {
                    "ok": False,
                    "commit_message": "",
                    "commit_body": "",
                    "analysis": f"API returned status {resp.status_code}",
                    "detail": f"HTTP {resp.status_code}",
                }

            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            parsed = _extract_json(content)
            commit_type = parsed.get("type", "chore")
            scope = parsed.get("scope", "")
            description = parsed.get("description", "")
            body = parsed.get("body", "")
            analysis = parsed.get("analysis", "")

            scope_str = f"({scope})" if scope else ""
            commit_message = f"{commit_type}{scope_str}: {description}"

            return {
                "ok": True,
                "commit_message": commit_message,
                "commit_body": body,
                "analysis": analysis,
                "detail": f"Generated {commit_type} commit",
            }
    except Exception as e:
        return {
            "ok": False,
            "commit_message": "",
            "commit_body": "",
            "analysis": f"Error: {str(e)}",
            "detail": str(e),
        }


async def review_changes(base_url: str, model: str, diff_text: str) -> dict:
    """Review code changes and provide actionable feedback."""
    if not diff_text.strip():
        return {
            "ok": False,
            "review": "No changes to review.",
            "issues": [],
            "suggestions": [],
            "security_concerns": [],
            "rating": 0,
            "detail": "Empty diff provided",
        }

    system_prompt = "You are a senior code reviewer. Provide constructive, actionable feedback."
    user_prompt = (
        f"Review the following git diff and provide a thorough code review.\n\n"
        f"Return a JSON object with these fields:\n"
        f"- review: overall assessment (2-3 sentences)\n"
        f"- issues: list of specific issues found (each with file, line, severity, description)\n"
        f"- suggestions: list of improvement suggestions\n"
        f"- security_concerns: list of potential security issues (empty if none)\n"
        f"- rating: integer 1-5 (5 is excellent)\n\n"
        f"Diff:\n```\n{diff_text[:12000]}\n```"
    )

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                    "max_tokens": 1000,
                    "temperature": 0.2,
                },
            )

            if resp.status_code != 200:
                return {
                    "ok": False,
                    "review": f"API error: status {resp.status_code}",
                    "issues": [],
                    "suggestions": [],
                    "security_concerns": [],
                    "rating": 0,
                    "detail": f"HTTP {resp.status_code}",
                }

            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            parsed = _extract_json(content)
            issues = parsed.get("issues", [])
            suggestions = parsed.get("suggestions", [])
            security_concerns = parsed.get("security_concerns", [])
            rating = min(5, max(1, int(parsed.get("rating", 0))))

            return {
                "ok": True,
                "review": parsed.get("review", ""),
                "issues": issues if isinstance(issues, list) else [],
                "suggestions": suggestions if isinstance(suggestions, list) else [],
                "security_concerns": security_concerns if isinstance(security_concerns, list) else [],
                "rating": rating,
                "detail": f"Rating: {rating}/5, {len(issues)} issues, {len(suggestions)} suggestions",
            }
    except Exception as e:
        return {
            "ok": False,
            "review": f"Error: {str(e)}",
            "issues": [],
            "suggestions": [],
            "security_concerns": [],
            "rating": 0,
            "detail": str(e),
        }


async def generate_pr_description(base_url: str, model: str, branch: str, diff_stat: str) -> dict:
    """Generate a markdown PR description from branch and diff stat."""
    if not diff_stat.strip():
        return {
            "ok": False,
            "title": "",
            "body": "",
            "key_changes": [],
            "files_changed": {},
            "detail": "No diff stat provided",
        }

    system_prompt = "You are a technical writer. Generate clear, comprehensive PR descriptions."
    user_prompt = (
        f"Generate a PR description for branch '{branch}' based on the following diff stat.\n\n"
        f"Return a JSON object with these fields:\n"
        f"- title: concise PR title\n"
        f"- body: full markdown PR description with sections for Summary, Changes, Testing\n"
        f"- key_changes: list of key changes (bullet points)\n"
        f"- files_changed: object with keys 'added', 'modified', 'deleted', 'renamed' each containing file lists\n\n"
        f"Diff stat:\n```\n{diff_stat[:8000]}\n```"
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                    "max_tokens": 800,
                    "temperature": 0.3,
                },
            )

            if resp.status_code != 200:
                return {
                    "ok": False,
                    "title": "",
                    "body": "",
                    "key_changes": [],
                    "files_changed": {},
                    "detail": f"HTTP {resp.status_code}",
                }

            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            parsed = _extract_json(content)
            files_changed = parsed.get("files_changed", {})
            if not isinstance(files_changed, dict):
                files_changed = {}

            return {
                "ok": True,
                "title": parsed.get("title", f"Changes from {branch}"),
                "body": parsed.get("body", ""),
                "key_changes": parsed.get("key_changes", []) if isinstance(parsed.get("key_changes"), list) else [],
                "files_changed": files_changed,
                "detail": f"PR description generated for {branch}",
            }
    except Exception as e:
        return {
            "ok": False,
            "title": "",
            "body": "",
            "key_changes": [],
            "files_changed": {},
            "detail": str(e),
        }


async def run_git_workflow(base_url: str, model: str) -> dict:
    """Run complete git workflow: diff, commit message, code review, PR description."""
    start_time = datetime.utcnow()
    results = {
        "ok": True,
        "diff": {"ok": False, "content": "", "stat": ""},
        "commit": {"ok": False, "commit_message": "", "commit_body": "", "analysis": ""},
        "review": {"ok": False, "review": "", "issues": [], "suggestions": [], "security_concerns": [], "rating": 0},
        "pr_description": {"ok": False, "title": "", "body": "", "key_changes": [], "files_changed": {}},
        "detail": "",
    }

    try:
        diff_result = subprocess.run(
            ["git", "diff", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if diff_result.returncode != 0:
            diff_text = ""
            diff_error = diff_result.stderr.strip()
        else:
            diff_text = diff_result.stdout
            diff_error = ""

        diff_stat_result = subprocess.run(
            ["git", "diff", "--stat", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        diff_stat = diff_stat_result.stdout if diff_stat_result.returncode == 0 else ""

        branch_result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"

        results["diff"] = {
            "ok": diff_result.returncode == 0,
            "content": diff_text[:10000],
            "stat": diff_stat,
            "error": diff_error,
            "branch": branch,
        }

        if not diff_text.strip():
            results["detail"] = "No uncommitted changes found"
            results["ok"] = False
            return results

        commit_result = await generate_commit_message(base_url, model, diff_text)
        results["commit"] = commit_result

        review_result = await review_changes(base_url, model, diff_text)
        results["review"] = review_result

        pr_result = await generate_pr_description(base_url, model, branch, diff_stat)
        results["pr_description"] = pr_result

        all_ok = commit_result.get("ok", False) and review_result.get("ok", False)
        results["ok"] = all_ok

        elapsed = (datetime.utcnow() - start_time).total_seconds()
        results["detail"] = f"Workflow completed in {elapsed:.1f}s, commit={'OK' if commit_result.get('ok') else 'FAIL'}, review={'OK' if review_result.get('ok') else 'FAIL'}"

    except subprocess.TimeoutExpired:
        results["ok"] = False
        results["detail"] = "Git command timed out"
    except FileNotFoundError:
        results["ok"] = False
        results["detail"] = "Git not installed or not in PATH"
    except Exception as e:
        results["ok"] = False
        results["detail"] = str(e)

    return results


def register_git_workflow(cli_group) -> None:
    """Register git-workflow subcommand on the given CLI group."""

    @cli_group.command("git-workflow")
    @click.option("--base-url", default="http://192.168.1.12:3001", help="Proxy bridge URL")
    @click.option("--model", default=None, required=True, help="Model to use for AI generation")
    @click.option("--commit", is_flag=True, help="Auto-commit with generated message")
    @click.option("--output", type=click.Choice(["summary", "full", "json"]), default="summary", help="Output format")
    def git_workflow(base_url: str, model: str, commit: bool, output: str):
        """Run AI-powered git workflow (commit message, review, PR description)."""
        from rich.console import Console
        from rich.panel import Panel
        from rich.table import Table

        console = Console()
        console.print(Panel("[bold cyan]AI Git Workflow[/bold cyan]", border_style="cyan"))

        async def _run():
            results = await run_git_workflow(base_url, model)

            if output == "json":
                console.print(json.dumps(results, indent=2, default=str))
                return

            diff = results.get("diff", {})
            commit_result = results.get("commit", {})
            review_result = results.get("review", {})
            pr_result = results.get("pr_description", {})

            table = Table(title="Workflow Results")
            table.add_column("Step", style="cyan")
            table.add_column("Status", style="green")
            table.add_column("Detail", style="yellow")

            table.add_row("Diff", "OK" if diff.get("ok") else "FAIL", diff.get("stat", "")[:60] or diff.get("error", ""))
            table.add_row("Commit", "OK" if commit_result.get("ok") else "FAIL", commit_result.get("commit_message", "")[:60])
            table.add_row("Review", "OK" if review_result.get("ok") else "FAIL", f"Rating: {review_result.get('rating', 0)}/5")
            table.add_row("PR Desc", "OK" if pr_result.get("ok") else "FAIL", pr_result.get("title", "")[:60])

            console.print(table)

            if output == "full":
                if commit_result.get("ok"):
                    console.print(Panel(f"[bold]Commit Message:[/bold]\n{commit_result['commit_message']}\n\n{commit_result.get('commit_body', '')}", border_style="green"))
                if review_result.get("ok"):
                    console.print(Panel(f"[bold]Review:[/bold]\n{review_result['review']}\n\nIssues: {len(review_result.get('issues', []))}\nSuggestions: {len(review_result.get('suggestions', []))}", border_style="yellow"))
                if pr_result.get("ok"):
                    console.print(Panel(f"[bold]PR Title:[/bold] {pr_result['title']}\n\n{pr_result.get('body', '')}", border_style="blue"))

            if commit and commit_result.get("ok"):
                message = commit_result["commit_message"]
                body = commit_result.get("commit_body", "")
                full_message = f"{message}\n\n{body}" if body else message
                try:
                    subprocess.run(["git", "commit", "-m", full_message], capture_output=True, text=True, timeout=30)
                    console.print("[green]Changes committed successfully.[/green]")
                except Exception as e:
                    console.print(f"[red]Commit failed: {e}[/red]")

            console.print(f"\n[dim]{results.get('detail', '')}[/dim]")

        import asyncio
        asyncio.run(_run())


def _extract_json(content: str) -> dict:
    """Extract JSON from AI response content."""
    content = content.strip()

    if content.startswith("```"):
        lines = content.split("\n")
        json_lines = []
        in_code_block = False
        for line in lines:
            if line.strip().startswith("```"):
                if in_code_block:
                    break
                in_code_block = True
                continue
            if in_code_block:
                json_lines.append(line)
        content = "\n".join(json_lines)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {}
