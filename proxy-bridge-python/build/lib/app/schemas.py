from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class Model(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str

class ModelListResponse(BaseModel):
    object: str = "list"
    data: List[Model]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: Optional[bool] = False
    temperature: Optional[float] = 1.0
    max_tokens: Optional[int] = None
    context_window: Optional[int] = Field(default=16000, alias="contextWindow")
    tools: Optional[List[Dict[str, Any]]] = None

    class Config:
        populate_by_name = True
        extra = "allow"

class EmbeddingRequest(BaseModel):
    model: str
    input: Union[str, List[str]]

class AgentOrchestrateRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    tools: Optional[List[Dict[str, Any]]] = None
    stream: Optional[bool] = False
