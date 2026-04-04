from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/api/mcp", tags=["MCP"])


@router.get("/servers")
async def get_mcp_servers():
    return {
        "servers": [],
        "total": 0,
        "healthy": 0,
    }


@router.get("/servers/{server_id}")
async def get_mcp_server(server_id: str):
    return {
        "id": server_id,
        "name": server_id,
        "transport": "stdio",
        "status": "disconnected",
        "tools": [],
    }


@router.get("/tools")
async def get_mcp_tools():
    return {
        "tools": [],
        "total": 0,
    }
