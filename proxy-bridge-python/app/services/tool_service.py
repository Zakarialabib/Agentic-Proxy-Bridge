"""Enhanced tool calling service with function dispatch and execution."""

from __future__ import annotations

import json
import time
import asyncio
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Optional[Callable] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolCallResult:
    tool_name: str
    arguments: Dict[str, Any]
    result: Any
    success: bool
    error: Optional[str] = None
    execution_time_ms: float = 0.0


class ToolRegistry:
    """Registry for tool definitions and handlers."""

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._call_history: List[Dict[str, Any]] = []

    def register(self, tool: ToolDefinition):
        """Register a tool definition."""
        self._tools[tool.name] = tool

    def unregister(self, name: str):
        """Unregister a tool by name."""
        self._tools.pop(name, None)

    def get(self, name: str) -> Optional[ToolDefinition]:
        """Get tool definition by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        """List all registered tools in OpenAI format."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in self._tools.values()
        ]

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> ToolCallResult:
        """Execute a tool with given arguments."""
        tool = self._tools.get(tool_name)
        if not tool:
            return ToolCallResult(
                tool_name=tool_name,
                arguments=arguments,
                result=None,
                success=False,
                error=f"Tool '{tool_name}' not found",
            )

        start_time = time.time()
        try:
            if tool.handler:
                if asyncio.iscoroutinefunction(tool.handler):
                    result = await tool.handler(**arguments)
                else:
                    result = tool.handler(**arguments)
            else:
                result = {"status": "no_handler", "tool": tool_name, "arguments": arguments}

            execution_time_ms = (time.time() - start_time) * 1000
            call_result = ToolCallResult(
                tool_name=tool_name,
                arguments=arguments,
                result=result,
                success=True,
                execution_time_ms=execution_time_ms,
            )
            self._call_history.append({
                "tool": tool_name,
                "arguments": arguments,
                "success": True,
                "timestamp": time.time(),
                "execution_time_ms": execution_time_ms,
            })
            return call_result
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            call_result = ToolCallResult(
                tool_name=tool_name,
                arguments=arguments,
                result=None,
                success=False,
                error=str(e),
                execution_time_ms=execution_time_ms,
            )
            self._call_history.append({
                "tool": tool_name,
                "arguments": arguments,
                "success": False,
                "error": str(e),
                "timestamp": time.time(),
                "execution_time_ms": execution_time_ms,
            })
            return call_result

    def get_call_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent tool call history."""
        return self._call_history[-limit:]

    def get_stats(self) -> Dict[str, Any]:
        """Get tool execution statistics."""
        total = len(self._call_history)
        successful = sum(1 for c in self._call_history if c.get("success"))
        failed = total - successful
        avg_time = (
            sum(c.get("execution_time_ms", 0) for c in self._call_history) / total
            if total > 0
            else 0
        )

        tool_counts: Dict[str, int] = {}
        for c in self._call_history:
            tool = c.get("tool", "unknown")
            tool_counts[tool] = tool_counts.get(tool, 0) + 1

        return {
            "total_calls": total,
            "successful": successful,
            "failed": failed,
            "success_rate": round(successful / total, 2) if total > 0 else 0,
            "avg_execution_time_ms": round(avg_time, 2),
            "tool_counts": tool_counts,
            "registered_tools": len(self._tools),
        }


tool_registry = ToolRegistry()


def register_builtin_tools():
    """Register built-in tools."""

    async def search_knowledge_base(query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search the knowledge base for information."""
        return {
            "status": "simulated",
            "query": query,
            "top_k": top_k,
            "results": [],
            "message": "Knowledge base search not configured",
        }

    async def calculate(expression: str) -> Dict[str, Any]:
        """Evaluate a mathematical expression."""
        try:
            allowed_chars = set("0123456789+-*/.() ")
            if not all(c in allowed_chars for c in expression):
                return {"error": "Invalid characters in expression"}
            result = eval(expression, {"__builtins__": {}}, {})
            return {"expression": expression, "result": result}
        except Exception as e:
            return {"error": str(e), "expression": expression}

    async def get_current_time() -> Dict[str, Any]:
        """Get the current date and time."""
        from datetime import datetime
        return {
            "datetime": datetime.now().isoformat(),
            "timestamp": time.time(),
        }

    async def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search the web for information."""
        return {
            "status": "simulated",
            "query": query,
            "num_results": num_results,
            "results": [],
            "message": "Web search not configured",
        }

    async def read_file(path: str) -> Dict[str, Any]:
        """Read contents of a file."""
        return {
            "status": "simulated",
            "path": path,
            "content": "",
            "message": "File access not configured",
        }

    async def write_file(path: str, content: str) -> Dict[str, Any]:
        """Write content to a file."""
        return {
            "status": "simulated",
            "path": path,
            "bytes_written": len(content),
            "message": "File access not configured",
        }

    tools = [
        ToolDefinition(
            name="search_knowledge_base",
            description="Search the knowledge base for information",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "top_k": {"type": "integer", "description": "Number of results", "default": 5},
                },
                "required": ["query"],
            },
            handler=search_knowledge_base,
        ),
        ToolDefinition(
            name="calculate",
            description="Evaluate a mathematical expression",
            parameters={
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "The mathematical expression to evaluate"},
                },
                "required": ["expression"],
            },
            handler=calculate,
        ),
        ToolDefinition(
            name="get_current_time",
            description="Get the current date and time",
            parameters={
                "type": "object",
                "properties": {},
            },
            handler=get_current_time,
        ),
        ToolDefinition(
            name="web_search",
            description="Search the web for information",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "num_results": {"type": "integer", "description": "Number of results", "default": 5},
                },
                "required": ["query"],
            },
            handler=web_search,
        ),
        ToolDefinition(
            name="read_file",
            description="Read contents of a file",
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "The file path to read"},
                },
                "required": ["path"],
            },
            handler=read_file,
        ),
        ToolDefinition(
            name="write_file",
            description="Write content to a file",
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "The file path to write"},
                    "content": {"type": "string", "description": "The content to write"},
                },
                "required": ["path", "content"],
            },
            handler=write_file,
        ),
    ]

    for tool in tools:
        tool_registry.register(tool)


register_builtin_tools()
