from __future__ import annotations

from typing import Any, Dict, List, Optional
import textwrap

from app.services.context_builder import enforce_context_window

try:
    from app.services.context_pruner import semantic_prune_context
except Exception:  # pragma: no cover - graceful fallback when the optional pruner is unavailable
    semantic_prune_context = None


def _normalize_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for message in messages or []:
        if isinstance(message, dict):
            normalized.append(dict(message))
        elif hasattr(message, "model_dump"):
            normalized.append(message.model_dump())
    return normalized


def _stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(_stringify_content(item) for item in content)
    if isinstance(content, dict):
        if "text" in content:
            return _stringify_content(content.get("text"))
        return str(content)
    return str(content)


def _find_system_message(messages: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return next((msg for msg in messages if msg.get("role") == "system"), None)


def _build_summary_message(messages: List[Dict[str, Any]], current_goal: str, recent_count: int = 4) -> Dict[str, Any]:
    system_message = _find_system_message(messages)
    non_system_messages = [msg for msg in messages if msg.get("role") != "system"]

    if len(non_system_messages) <= recent_count:
        return {
            "role": "system",
            "content": "[Context Summary] No older context needed summarization.",
        }

    older_messages = non_system_messages[:-recent_count]
    summary_lines = []
    for index, message in enumerate(older_messages, start=1):
        role = message.get("role", "unknown").upper()
        content = textwrap.shorten(_stringify_content(message.get("content", "")), width=220, placeholder=" ...")
        summary_lines.append(f"{index}. {role}: {content}")

    summary_header = "[Context Summary] Older conversation turns condensed to save context."
    if current_goal:
        summary_header += f" Current goal: {textwrap.shorten(current_goal, width=180, placeholder=' ...')}."
    if system_message:
        summary_header += " Preserve the original system instructions and use the summary as background only."

    summary_body = "\n".join(summary_lines)
    return {
        "role": "system",
        "content": f"{summary_header}\n\n{summary_body}",
    }


async def apply_context_strategy(
    messages: List[Dict[str, Any]],
    current_goal: str,
    strategy: Optional[str],
    max_tokens: int,
) -> List[Dict[str, Any]]:
    normalized_messages = _normalize_messages(messages)
    normalized_strategy = (strategy or "full").strip().lower()

    if normalized_strategy == "full":
        return enforce_context_window(normalized_messages, max_tokens=max_tokens)

    if normalized_strategy == "prune":
        pruned_messages = normalized_messages
        if semantic_prune_context is not None:
            try:
                pruned_messages = await semantic_prune_context(normalized_messages, current_goal, threshold=0.6)
            except Exception as exc:
                print(f"[Context Strategy] semantic prune failed: {exc}")
        return enforce_context_window(_normalize_messages(pruned_messages), max_tokens=max_tokens)

    if normalized_strategy == "summarize":
        working_messages = normalized_messages
        if semantic_prune_context is not None:
            try:
                working_messages = await semantic_prune_context(normalized_messages, current_goal, threshold=0.7)
            except Exception as exc:
                print(f"[Context Strategy] semantic prune before summary failed: {exc}")

        summary_message = _build_summary_message(_normalize_messages(working_messages), current_goal)
        compact_messages: List[Dict[str, Any]] = []
        system_message = _find_system_message(working_messages)
        if system_message:
            compact_messages.append(system_message)
        compact_messages.append(summary_message)
        compact_messages.extend([msg for msg in working_messages if msg.get("role") != "system"][-4:])
        return enforce_context_window(compact_messages, max_tokens=max_tokens)

    print(f"[Context Strategy] Unknown strategy '{normalized_strategy}', falling back to full")
    return enforce_context_window(normalized_messages, max_tokens=max_tokens)
