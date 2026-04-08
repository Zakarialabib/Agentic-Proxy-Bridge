"""Context management endpoints for session and conversation management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.services.context_manager import context_manager, Message

router = APIRouter(prefix="/api/context", tags=["Context"])


class CreateSessionRequest(BaseModel):
    session_id: Optional[str] = None
    max_tokens: Optional[int] = 4096


class AddMessageRequest(BaseModel):
    role: str = "user"
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


class AddMessagesRequest(BaseModel):
    messages: List[Dict[str, Any]]


@router.post("/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new context session."""
    import uuid
    session_id = request.session_id or str(uuid.uuid4())
    session = context_manager.create_session(session_id, request.max_tokens)
    return {
        "session_id": session.session_id,
        "max_tokens": session.max_tokens,
        "created_at": session.created_at,
    }


@router.get("/sessions")
async def list_sessions():
    """List all active context sessions."""
    stats = context_manager.get_stats()
    return {
        "total_sessions": stats["total_sessions"],
        "total_messages": stats["total_messages"],
        "total_tokens": stats["total_tokens"],
        "sessions": stats["sessions"],
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details and messages."""
    session = context_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = context_manager.get_messages(session_id)
    return {
        "session_id": session.session_id,
        "max_tokens": session.max_tokens,
        "current_tokens": session.current_tokens,
        "message_count": len(session.messages),
        "utilization": round(session.current_tokens / session.max_tokens, 2) if session.max_tokens > 0 else 0,
        "messages": messages,
    }


@router.post("/sessions/{session_id}/messages")
async def add_message(session_id: str, request: AddMessageRequest):
    """Add a message to a session."""
    session = context_manager.get_session(session_id)
    if not session:
        session = context_manager.create_session(session_id)

    message = Message(
        role=request.role,
        content=request.content,
        tool_calls=request.tool_calls,
        tool_call_id=request.tool_call_id,
    )
    session = context_manager.add_message(session_id, message)
    return {
        "session_id": session_id,
        "message_count": len(session.messages),
        "current_tokens": session.current_tokens,
        "max_tokens": session.max_tokens,
    }


@router.post("/sessions/{session_id}/messages/batch")
async def add_messages(session_id: str, request: AddMessagesRequest):
    """Add multiple messages to a session."""
    session = context_manager.get_session(session_id)
    if not session:
        session = context_manager.create_session(session_id)

    added = context_manager.add_messages(session_id, request.messages)
    return {
        "session_id": session_id,
        "messages_added": len(added),
        "total_messages": len(session.messages),
        "current_tokens": session.current_tokens,
    }


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, limit: Optional[int] = None):
    """Get messages from a session."""
    session = context_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = context_manager.get_messages(session_id, limit)
    return {
        "session_id": session_id,
        "message_count": len(messages),
        "messages": messages,
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a context session."""
    deleted = context_manager.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "deleted": True}


@router.post("/sessions/{session_id}/clear")
async def clear_session(session_id: str):
    """Clear all messages from a session."""
    cleared = context_manager.clear_session(session_id)
    if not cleared:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "cleared": True}


@router.get("/stats")
async def get_stats():
    """Get context management statistics."""
    return context_manager.get_stats()


@router.post("/cleanup")
async def cleanup_idle_sessions(max_idle_seconds: int = 3600):
    """Clean up idle sessions."""
    removed = context_manager.cleanup_idle_sessions(max_idle_seconds)
    return {"removed_sessions": removed}
