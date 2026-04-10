from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.mcp_service import mcp_registry, MCPServerConfig
from pydantic import BaseModel

router = APIRouter(tags=["MCP"])

class AddServerRequest(BaseModel):
    id: str
    name: str
    command: str
    args: List[str] = []
    env: Dict[str, str] = {}

@router.get("/status")
async def get_mcp_status():
    return mcp_registry.get_status()

@router.get("/servers")
async def get_mcp_servers():
    status = mcp_registry.get_status()
    return {
        "servers": status["servers"],
        "total": len(status["servers"]),
        "healthy": status["active_servers"],
    }

@router.post("/servers")
async def add_mcp_server(req: AddServerRequest):
    config = MCPServerConfig(
        id=req.id,
        name=req.name,
        command=req.command,
        args=req.args,
        env=req.env
    )
    await mcp_registry.add_server(config)
    return {"status": "success", "server_id": req.id}

@router.delete("/servers/{server_id}")
async def remove_mcp_server(server_id: str):
    await mcp_registry.remove_server(server_id)
    return {"status": "success"}

@router.post("/servers/{server_id}/connect")
async def connect_mcp_server(server_id: str):
    await mcp_registry.connect_server(server_id)
    return {"status": "success"}

@router.post("/servers/{server_id}/disconnect")
async def disconnect_mcp_server(server_id: str):
    await mcp_registry.disconnect_server(server_id)
    return {"status": "success"}

@router.get("/tools")
async def get_mcp_tools():
    all_tools = []
    for instance in mcp_registry.instances.values():
        for tool in instance.tools:
            tool_copy = dict(tool)
            tool_copy["server_id"] = instance.config.id
            all_tools.append(tool_copy)
    return {
        "tools": all_tools,
        "total": len(all_tools),
    }
