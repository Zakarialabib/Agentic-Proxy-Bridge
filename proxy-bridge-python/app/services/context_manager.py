"""Context management service with sliding window eviction, token counting, and dynamic LM Studio control."""

from __future__ import annotations

import time
import httpx
import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from app.core.settings import settings


@dataclass
class Message:
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    token_count: int = 0


@dataclass
class ContextWindow:
    session_id: str
    messages: List[Message] = field(default_factory=list)
    max_tokens: int = 4096
    current_tokens: int = 0
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


def estimate_tokens(text: str) -> int:
    """Estimate token count for text (rough approximation: ~4 chars per token for English)."""
    if not text:
        return 0
    return len(text) // 4 + 1


def count_message_tokens(message: Message) -> int:
    """Count tokens for a message."""
    tokens = estimate_tokens(message.content)
    tokens += 4
    if message.tool_calls:
        for tc in message.tool_calls:
            tokens += estimate_tokens(str(tc))
    return tokens


class ContextManager:
    """Manages conversation context with sliding window eviction."""

    def __init__(self, default_max_tokens: int = 4096):
        self._sessions: Dict[str, ContextWindow] = {}
        self._default_max_tokens = default_max_tokens

    def create_session(self, session_id: str, max_tokens: Optional[int] = None) -> ContextWindow:
        """Create a new context session."""
        window = ContextWindow(
            session_id=session_id,
            max_tokens=max_tokens or self._default_max_tokens,
        )
        self._sessions[session_id] = window
        return window

    def get_session(self, session_id: str) -> Optional[ContextWindow]:
        """Get a context session."""
        session = self._sessions.get(session_id)
        if session:
            session.last_accessed = time.time()
        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a context session."""
        return self._sessions.pop(session_id, None) is not None

    def add_message(self, session_id: str, message: Message) -> ContextWindow:
        """Add a message to the context, evicting old messages if needed."""
        session = self.get_session(session_id)
        if not session:
            session = self.create_session(session_id)

        message.token_count = count_message_tokens(message)
        session.messages.append(message)
        session.current_tokens += message.token_count

        self._evict_if_needed(session)
        session.last_accessed = time.time()
        return session

    def add_messages(self, session_id: str, messages: List[Dict[str, Any]]) -> List[Message]:
        """Add multiple messages to the context."""
        session = self.get_session(session_id)
        if not session:
            session = self.create_session(session_id)

        added_messages = []
        for msg_dict in messages:
            message = Message(
                role=msg_dict.get("role", "user"),
                content=msg_dict.get("content", ""),
                tool_calls=msg_dict.get("tool_calls"),
                tool_call_id=msg_dict.get("tool_call_id"),
                name=msg_dict.get("name"),
            )
            message.token_count = count_message_tokens(message)
            session.messages.append(message)
            session.current_tokens += message.token_count
            added_messages.append(message)

        self._evict_if_needed(session)
        session.last_accessed = time.time()
        return added_messages

    def get_messages(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get messages from the context as OpenAI-compatible format."""
        session = self.get_session(session_id)
        if not session:
            return []

        messages = session.messages
        if limit:
            messages = messages[-limit:]

        result = []
        for msg in messages:
            msg_dict: Dict[str, Any] = {"role": msg.role, "content": msg.content}
            if msg.tool_calls:
                msg_dict["tool_calls"] = msg.tool_calls
            if msg.tool_call_id:
                msg_dict["tool_call_id"] = msg.tool_call_id
            if msg.name:
                msg_dict["name"] = msg.name
            result.append(msg_dict)

        return result

    def clear_session(self, session_id: str) -> bool:
        """Clear all messages from a session."""
        session = self._sessions.get(session_id)
        if session:
            session.messages.clear()
            session.current_tokens = 0
            session.last_accessed = time.time()
            return True
        return False

    def get_stats(self) -> Dict[str, Any]:
        """Get context management statistics."""
        total_sessions = len(self._sessions)
        total_messages = sum(len(s.messages) for s in self._sessions.values())
        total_tokens = sum(s.current_tokens for s in self._sessions.values())
        avg_tokens_per_session = total_tokens / total_sessions if total_sessions > 0 else 0

        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_tokens": total_tokens,
            "avg_tokens_per_session": round(avg_tokens_per_session, 2),
            "sessions": {
                sid: {
                    "message_count": len(s.messages),
                    "current_tokens": s.current_tokens,
                    "max_tokens": s.max_tokens,
                    "utilization": round(s.current_tokens / s.max_tokens, 2) if s.max_tokens > 0 else 0,
                    "last_accessed": s.last_accessed,
                }
                for sid, s in self._sessions.items()
            },
        }

    def cleanup_idle_sessions(self, max_idle_seconds: int = 3600) -> int:
        """Remove sessions that have been idle for too long."""
        now = time.time()
        to_remove = [
            sid for sid, s in self._sessions.items()
            if now - s.last_accessed > max_idle_seconds
        ]
        for sid in to_remove:
            del self._sessions[sid]
        return len(to_remove)

    def _evict_if_needed(self, session: ContextWindow):
        """Evict oldest messages if context window is exceeded."""
        while session.current_tokens > session.max_tokens and len(session.messages) > 1:
            oldest = session.messages.pop(0)
            session.current_tokens -= oldest.token_count


class LMStudioContextController:
    """
    Dynamically adjusts LM Studio's context window based on agent state.
    """
    def __init__(self, base_url: str = None):
        self.base_url = base_url or settings.lm_studio_base_url
        self.current_context = 4096  # Start conservative
        
    async def adjust_for_trajectory(self, hop_count: int, tool_results_size: int):
        """
        Dynamically adjust LM Studio's context window based on agent state.
        """
        if hop_count > 2 and tool_results_size > 1000:
            # About to enter heavy reasoning, reduce context to prevent OOM
            new_context = 2048
        elif hop_count == 0:
            # Fresh conversation, standard context
            new_context = 4096
        else:
            new_context = self.current_context
            
        if new_context != self.current_context:
            await self._set_context_length(new_context)
            self.current_context = new_context
            
    async def _set_context_length(self, length: int):
        """
        LM Studio API endpoint for dynamic configuration.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{self.base_url}/v0/models/loaded/config",
                    json={"context_length": length}
                )
                if resp.status_code == 200:
                    print(f"[Agentic Bridge] Dynamically adjusted LM Studio context length to {length}")
                else:
                    print(f"[Agentic Bridge] Failed to adjust context length: {resp.status_code}")
        except Exception as e:
            print(f"[Agentic Bridge] Error adjusting context length: {str(e)}")


context_manager = ContextManager()
context_controller = LMStudioContextController()
