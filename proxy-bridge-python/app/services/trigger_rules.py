from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

DEFAULT_MAX_STEPS_SIMPLE = 3
DEFAULT_MAX_STEPS_COMPLEX = 8
DEFAULT_TOOL_BUDGET_SIMPLE = 1
DEFAULT_TOOL_BUDGET_COMPLEX = 4


def _matches_any(text: str, patterns: List[str]) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def match_triggers(message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Lightweight rule-based trigger matcher for agentic orchestration.
    Returns a trigger profile with intent tags and recommended actions.
    """
    text = (message or "").strip()
    lower = text.lower()
    metadata = metadata or {}

    if not text:
        return {
            "triggered": False,
            "intent": [],
            "recommended_actions": {},
        }

    code_edit = _matches_any(
        lower,
        [
            r"\bedit\b",
            r"\brefactor\b",
            r"\bfix\b",
            r"\bapply\s+patch\b",
            r"\bupdate\b",
            r"\brewrite\b",
        ],
    )
    file_ops = _matches_any(
        lower,
        [
            r"\bread\s+file\b",
            r"\bopen\s+file\b",
            r"\bfile_list\b",
            r"\bgrep\b",
            r"\bsearch\s+in\s+repo\b",
            r"\bfind\s+in\s+repo\b",
        ],
    )
    retrieval_needed = _matches_any(
        lower,
        [
            r"\bsummarize\s+docs?\b",
            r"\bknowledge\b",
            r"\bcompare\b",
            r"\bfind\s+in\s+knowledge\b",
            r"\bretrieve\b",
        ],
    )
    multi_step = _matches_any(
        lower,
        [
            r"\bplan\b",
            r"\bbreak\s+down\b",
            r"\bstep\s+by\s+step\b",
            r"\broadmap\b",
        ],
    )

    long_question = len(text) > 200 or text.count("?") >= 2

    intent: List[str] = []
    if code_edit:
        intent.append("code_edit")
    if file_ops:
        intent.append("file_ops")
    if retrieval_needed or long_question:
        intent.append("retrieval_needed")
    if multi_step or (code_edit and long_question):
        intent.append("multi_step")

    triggered = len(intent) > 0

    recommended_actions: Dict[str, Any] = {}

    if triggered:
        # Default to adaptive unless file ops are explicit.
        if "file_ops" in intent:
            recommended_actions["orchestration_mode"] = "local_only"
        else:
            recommended_actions["orchestration_mode"] = "adaptive"

        # Context strategy selection.
        if "multi_step" in intent or long_question:
            recommended_actions["context_strategy"] = "prune"
        elif "retrieval_needed" in intent:
            recommended_actions["context_strategy"] = "summarize"
        else:
            recommended_actions["context_strategy"] = "full"

        # Budget tuning.
        recommended_actions["max_steps"] = DEFAULT_MAX_STEPS_COMPLEX
        recommended_actions["tool_budget"] = DEFAULT_TOOL_BUDGET_COMPLEX
    else:
        recommended_actions["max_steps"] = DEFAULT_MAX_STEPS_SIMPLE
        recommended_actions["tool_budget"] = DEFAULT_TOOL_BUDGET_SIMPLE

    # Allow metadata to nudge decisions without overriding explicit request fields.
    if metadata.get("force_context_strategy"):
        recommended_actions["context_strategy"] = metadata["force_context_strategy"]
    if metadata.get("force_orchestration_mode"):
        recommended_actions["orchestration_mode"] = metadata["force_orchestration_mode"]

    return {
        "triggered": triggered,
        "intent": intent,
        "recommended_actions": recommended_actions,
    }
