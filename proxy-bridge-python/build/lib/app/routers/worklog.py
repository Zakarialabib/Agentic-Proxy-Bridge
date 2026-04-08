from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.models.worklog import WorklogEntry
from app.core.database import get_session
from datetime import datetime

router = APIRouter(prefix="/api/worklog", tags=["Worklog"])

@router.get("/", response_model=List[WorklogEntry])
async def list_worklogs(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(WorklogEntry).order_by(WorklogEntry.timestamp.desc()))
    return result.scalars().all()

@router.post("/", response_model=WorklogEntry)
async def create_worklog(entry: WorklogEntry, session: AsyncSession = Depends(get_session)):
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry

@router.patch("/{task_id}", response_model=WorklogEntry)
async def update_worklog(task_id: str, updates: dict, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(WorklogEntry).where(WorklogEntry.taskId == task_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Worklog not found")
    
    for key, value in updates.items():
        if hasattr(entry, key):
            # Convert timestamp strings to datetime objects
            if key in ["completedAt", "timestamp", "createdAt", "updatedAt"] and isinstance(value, str):
                try:
                    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                except ValueError:
                    pass
            setattr(entry, key, value)
    
    entry.updatedAt = datetime.utcnow()
    await session.commit()
    await session.refresh(entry)
    return entry
