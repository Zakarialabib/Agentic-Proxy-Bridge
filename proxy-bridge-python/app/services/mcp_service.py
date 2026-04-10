import asyncio
import json
import os
import subprocess
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import structlog

logger = structlog.get_logger(__name__)

@dataclass
class MCPServerConfig:
    id: str
    name: str
    command: str
    args: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)
    transport: str = "stdio" # logic only supports stdio for now

@dataclass
class MCPServerInstance:
    config: MCPServerConfig
    process: Optional[asyncio.subprocess.Process] = None
    status: str = "disconnected" # disconnected, connecting, connected, error
    tools: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

class MCPRegistry:
    def __init__(self, config_path: str = "config/mcp_servers.json"):
        self.config_path = config_path
        self.instances: Dict[str, MCPServerInstance] = {}
        self._load_configs()

    def _load_configs(self):
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r") as f:
                    configs = json.load(f)
                    for c_raw in configs:
                        config = MCPServerConfig(**c_raw)
                        self.instances[config.id] = MCPServerInstance(config=config)
            except Exception as e:
                logger.error("mcp_config_load_failed", error=str(e))

    def _save_configs(self):
        configs = [i.config.__dict__ for i in self.instances.values()]
        try:
            with open(self.config_path, "w") as f:
                json.dump(configs, f, indent=2)
        except Exception as e:
            logger.error("mcp_config_save_failed", error=str(e))

    async def add_server(self, config: MCPServerConfig):
        self.instances[config.id] = MCPServerInstance(config=config)
        self._save_configs()
        await self.connect_server(config.id)

    async def remove_server(self, server_id: str):
        await self.disconnect_server(server_id)
        if server_id in self.instances:
            del self.instances[server_id]
            self._save_configs()

    async def connect_server(self, server_id: str):
        if server_id not in self.instances:
            return
        
        instance = self.instances[server_id]
        instance.status = "connecting"
        
        try:
            # For stdio, we need to communicate via JSON-RPC
            # This is a simplified version - real MCP needs a full JSON-RPC client
            process = await asyncio.create_subprocess_exec(
                instance.config.command,
                *instance.config.args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, **instance.config.env}
            )
            instance.process = process
            instance.status = "connected"
            
            # 6. Fetch Tools and Register them globally
            try:
                mcp_tools = await self.list_tools(server_id)
                from app.services.tool_service import tool_registry, ToolDefinition
                
                for tool in mcp_tools:
                    # Create a closure for the handler
                    async def mcp_handler(sid=server_id, tname=tool['name'], **kwargs):
                        res = await self.execute_tool(sid, tname, kwargs)
                        return res.get('content', res)

                    tool_def = ToolDefinition(
                        name=tool['name'],
                        description=tool.get('description', ''),
                        parameters=tool.get('inputSchema', {}),
                        handler=mcp_handler,
                        source=f"mcp:{server_id}"
                    )
                    tool_registry.register(tool_def)
                
                instance.tools = mcp_tools
            except Exception as e:
                print(f"[MCP] Failed to register tools for {server_id}: {e}")
            
            logger.info("mcp_server_connected", server_id=server_id)
            # for tool in instance.tools:
            #     tool_registry.register(ToolDefinition(
            #         name=f"mcp_{server_id}_{tool['name']}",
            #         description=tool['description'],
            #         parameters=tool['parameters'],
            #         handler=lambda **args: self.execute_tool(server_id, tool['name'], args)
            #     ))

        except Exception as e:
            instance.status = "error"
            instance.error = str(e)
            logger.error("mcp_connect_failed", server_id=server_id, error=str(e))

    async def disconnect_server(self, server_id: str):
        if server_id not in self.instances:
            return
        instance = self.instances[server_id]
        if instance.process:
            try:
                instance.process.terminate()
                await instance.process.wait()
            except:
                pass
        instance.process = None
        instance.status = "disconnected"
        instance.tools = []
        
        # Unregister tools
        from app.services.tool_service import tool_registry
        # Logic to unregister tools starting with mcp_{server_id}_

    async def list_tools(self, server_id: str) -> List[Dict[str, Any]]:
        # In a real implementation, we send {"jsonrpc": "2.0", "method": "tools/list", "id": 1}
        # For now return mock tools if it's a known preset, or empty
        instance = self.instances.get(server_id)
        if not instance: return []
        
        if "local-files" in server_id:
            return [{
                "name": "read_resource",
                "description": "Read a resource from the filesystem",
                "inputSchema": {
                    "type": "object",
                    "properties": {"uri": {"type": "string"}},
                    "required": ["uri"]
                }
            }]
        return []

    async def execute_tool(self, server_id: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        instance = self.instances.get(server_id)
        if not instance or instance.status != "connected" or not instance.process:
            return {"status": "error", "message": f"Server {server_id} not connected"}
            
        # Mocking the JSON-RPC call for now as proper stdio multiplexing is complex
        logger.info("mcp_tool_executing", server_id=server_id, tool=tool_name)
        return {"content": "MCP Tool output placeholder"}

    def get_status(self) -> Dict[str, Any]:
        return {
            "active_servers": sum(1 for i in self.instances.values() if i.status == "connected"),
            "total_tools": sum(len(i.tools) for i in self.instances.values()),
            "servers": [
                {
                    "id": i.config.id,
                    "name": i.config.name,
                    "status": i.status,
                    "tools_count": len(i.tools),
                    "error": i.error
                }
                for i in self.instances.values()
            ]
        }

mcp_registry = MCPRegistry()
