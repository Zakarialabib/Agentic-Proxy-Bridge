"""Tool management and execution endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.services.tool_service import tool_registry

router = APIRouter(prefix="/api/tools", tags=["Tools"])


@router.get("/list")
async def list_tools():
    """List all registered tools."""
    return {
        "tools": tool_registry.list_tools(),
        "total": len(tool_registry.list_tools()),
    }


@router.get("/stats")
async def get_tool_stats():
    """Get tool execution statistics."""
    return tool_registry.get_stats()


@router.get("/history")
async def get_tool_history(limit: int = 50):
    """Get recent tool call history."""
    return {
        "history": tool_registry.get_call_history(limit),
        "total": len(tool_registry.get_call_history(limit)),
    }


class ExecuteToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}


@router.post("/execute")
async def execute_tool(request: ExecuteToolRequest):
    """Execute a tool with given arguments."""
    result = await tool_registry.execute(request.tool_name, request.arguments)
    return {
        "tool_name": result.tool_name,
        "success": result.success,
        "result": result.result,
        "error": result.error,
        "execution_time_ms": result.execution_time_ms,
    }


class ExecuteToolsRequest(BaseModel):
    tool_calls: List[Dict[str, Any]]


@router.post("/execute/batch")
async def execute_tools_batch(request: ExecuteToolsRequest):
    """Execute multiple tool calls."""
    results = []
    for tc in request.tool_calls:
        tool_name = tc.get("function", {}).get("name", tc.get("name", ""))
        arguments_str = tc.get("function", {}).get("arguments", "{}")
        import json
        try:
            arguments = json.loads(arguments_str) if isinstance(arguments_str, str) else arguments_str
        except json.JSONDecodeError:
            arguments = {}

        result = await tool_registry.execute(tool_name, arguments)
        results.append({
            "tool_call_id": tc.get("id", ""),
            "tool_name": result.tool_name,
            "success": result.success,
            "result": result.result,
            "error": result.error,
            "execution_time_ms": result.execution_time_ms,
        })

    return {
        "results": results,
        "total": len(results),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
    }
