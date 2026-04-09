from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, AliasChoices

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
    content: Union[str, Dict[str, Any], List[Any]]

class ChatCompletionRequest(BaseModel):
    model: str
    messages: Optional[List[ChatMessage]] = None
    prompt: Optional[str] = None
    input: Optional[str] = None
    stream: Optional[bool] = False
    temperature: Optional[float] = 1.0
    max_tokens: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("max_tokens", "maxTokens", "max_completion_tokens"),
    )
    context_window: Optional[int] = Field(
        default=16000,
        validation_alias=AliasChoices("contextWindow", "context_window"),
    )
    tools: Optional[List[Dict[str, Any]]] = None

    class Config:
        populate_by_name = True
        extra = "allow"

class EmbeddingRequest(BaseModel):
    model: str
    input: Union[str, List[str]]

class AgentOrchestrateRequest(BaseModel):
    model: str
    messages: Optional[List[ChatMessage]] = None
    prompt: Optional[str] = None
    input: Optional[str] = None
    context_strategy: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tools_available: Optional[List[str]] = None
    agents_available: Optional[List[str]] = None
    orchestration_mode: Optional[str] = None
    max_steps: Optional[int] = None
    tool_budget: Optional[int] = None
    trace_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = False
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    min_p: Optional[float] = None
    repeat_penalty: Optional[float] = None
    max_tokens: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("max_tokens", "maxTokens", "max_completion_tokens"),
    )
    context_window: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("contextWindow", "context_window"),
    )
    thinking: Optional[bool] = None
    include_embedding: Optional[bool] = False

    class Config:
        populate_by_name = True
        extra = "allow"

class TriggerPreviewRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    input: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    metadata: Optional[Dict[str, Any]] = None
    orchestration_mode: Optional[str] = None
    context_strategy: Optional[str] = None
    max_steps: Optional[int] = None
    tool_budget: Optional[int] = None

    class Config:
        populate_by_name = True
        extra = "allow"
