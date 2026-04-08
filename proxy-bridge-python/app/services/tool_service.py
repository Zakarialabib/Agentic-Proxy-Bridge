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

    import os

    def enforce_workspace(path: str) -> str:
        workspace_dir = os.path.abspath("/workspace")
        abs_path = os.path.abspath(path)
        if not abs_path.startswith(workspace_dir):
            raise ValueError(f"Access to path '{path}' is denied. Must be within /workspace")
        return abs_path

    async def _search_markdown_docs(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        docs_dir = "/workspace/docs"
        results = []
        if not os.path.exists(docs_dir):
            return results
            
        for root, _, files in os.walk(docs_dir):
            for file in files:
                if file.endswith(".md"):
                    path = os.path.join(root, file)
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            content = f.read()
                            if query.lower() in content.lower():
                                index = content.lower().find(query.lower())
                                start = max(0, index - 100)
                                end = min(len(content), index + len(query) + 100)
                                snippet = content[start:end].strip()
                                results.append({
                                    "file": path,
                                    "snippet": f"...{snippet}..."
                                })
                    except Exception:
                        pass
        return results[:top_k]

    async def search_knowledge_base(query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search the knowledge base for information."""
        results = await _search_markdown_docs(query, top_k)
        return {
            "status": "success",
            "query": query,
            "top_k": top_k,
            "results": results,
            "message": f"Found {len(results)} results" if results else "No results found",
        }

    async def calculate(expression: str) -> Dict[str, Any]:
        """Evaluate a mathematical expression safely."""
        import ast
        import operator
        
        def eval_node(node):
            if isinstance(node, ast.Constant):
                return node.value
            elif isinstance(node, ast.BinOp):
                return operators[type(node.op)](eval_node(node.left), eval_node(node.right))
            elif isinstance(node, ast.UnaryOp):
                return operators[type(node.op)](eval_node(node.operand))
            else:
                raise TypeError(f"Unsupported operation: {type(node)}")

        operators = {
            ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
            ast.Div: operator.truediv, ast.Pow: operator.pow, ast.BitXor: operator.xor,
            ast.USub: operator.neg, ast.UAdd: operator.pos,
        }
        
        try:
            parsed = ast.parse(expression, mode='eval')
            result = eval_node(parsed.body)
            return {"expression": expression, "result": result}
        except Exception as e:
            return {"error": f"Invalid expression: {str(e)}", "expression": expression}

    async def get_current_time() -> Dict[str, Any]:
        """Get the current date and time."""
        from datetime import datetime
        return {
            "datetime": datetime.now().isoformat(),
            "timestamp": time.time(),
        }

    async def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search the web for information."""
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            return {
                "status": "success",
                "content": results
            }
        except Exception as e:
            return {
                "status": "error",
                "content": str(e)
            }

    async def read_file(path: str) -> Dict[str, Any]:
        """Read contents of a file."""
        if not path:
            return {"status": "error", "content": "No path provided"}
        try:
            safe_path = enforce_workspace(path)
            with open(safe_path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"status": "success", "content": content}
        except Exception as e:
            return {"status": "error", "content": str(e)}

    async def write_file(path: str, content: str) -> Dict[str, Any]:
        """Write content to a file."""
        try:
            safe_path = enforce_workspace(path)
            os.makedirs(os.path.dirname(safe_path), exist_ok=True)
            with open(safe_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {
                "status": "success",
                "path": safe_path,
                "bytes_written": len(content),
                "content": f"Successfully wrote {len(content)} bytes to {safe_path}"
            }
        except Exception as e:
            return {"status": "error", "content": str(e)}

    async def file_list(path: str = ".") -> Dict[str, Any]:
        """List files in a directory."""
        import os
        try:
            safe_path = enforce_workspace(path)
            files = os.listdir(safe_path)
            return {"status": "success", "content": files}
        except Exception as e:
            return {"status": "error", "content": str(e)}

    async def query_knowledge_graph(query: str) -> Dict[str, Any]:
        """Query the knowledge graph for information."""
        results = await _search_markdown_docs(query, 5)
        return {
            "status": "success",
            "content": results if results else "No matching nodes found."
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
        ToolDefinition(
            name="file_list",
            description="List files in a directory",
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "The directory path to list", "default": "."},
                },
                "required": [],
            },
            handler=file_list,
        ),
        ToolDefinition(
            name="query_knowledge_graph",
            description="Query the knowledge graph for information",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                },
                "required": ["query"],
            },
            handler=query_knowledge_graph,
        ),
        # Backward compatibility mappings
        ToolDefinition(
            name="file_read",
            description="Read contents of a file (alias for read_file)",
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "The file path to read"},
                },
                "required": ["path"],
            },
            handler=read_file,
        ),
    ]

    for tool in tools:
        tool_registry.register(tool)


register_builtin_tools()
