from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(tags=["MCP"])

@router.get("/status")
async def get_mcp_status():
    return {
        "status": "ready",
        "active_servers": 0,
        "total_tools": 0,
        "last_sync": 0.0
    }



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
