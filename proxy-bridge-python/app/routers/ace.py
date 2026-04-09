from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(tags=["ACE"])


@router.get("/agents")
async def get_ace_agents():
    return {
        "agents": [],
        "total": 0,
        "available": 0,
    }


@router.get("/sessions")
async def get_ace_sessions():
    return {
        "sessions": [],
        "total": 0,
        "active": 0,
    }


@router.get("/channels")
async def get_ace_channels():
    return {
        "channels": [],
        "total": 0,
    }
