import os
import json
from typing import Dict, Any

class ToolOrchestrator:
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a registered tool.
        """
        if tool_name == "file_list":
            path = arguments.get("path", ".")
            try:
                files = os.listdir(path)
                return {"status": "success", "content": files}
            except Exception as e:
                return {"status": "error", "content": str(e)}
        
        elif tool_name == "file_read":
            path = arguments.get("path")
            if not path:
                return {"status": "error", "content": "No path provided"}
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                return {"status": "success", "content": content}
            except Exception as e:
                return {"status": "error", "content": str(e)}
        
        else:
            return {"status": "error", "content": f"Unknown tool: {tool_name}"}

tool_orchestrator = ToolOrchestrator()
