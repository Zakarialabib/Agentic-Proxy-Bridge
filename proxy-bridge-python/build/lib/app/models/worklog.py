from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid

class WorklogEntry(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    taskId: str = Field(unique=True, index=True)
    agent: str
    taskName: str
    stage: str
    status: str = Field(default="pending")
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    duration: Optional[int] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
