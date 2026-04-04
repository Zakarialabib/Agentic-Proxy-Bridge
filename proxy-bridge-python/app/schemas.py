from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────────────
# Enums (ported from proxy-api/models.py)
# ─────────────────────────────────────────────


class QuantizationType(str, Enum):
    """Supported GGUF quantization presets."""

    Q4_0 = "Q4_0"  # Fastest, lowest quality
    Q4_K_M = "Q4_K_M"  # Balanced
    Q4_K_S = "Q4_K_S"  # Small, good quality
    Q5_K_M = "Q5_K_M"  # Better quality
    Q6_K = "Q6_K"  # High quality
    Q8_0 = "Q8_0"  # Best quality
    FP16 = "FP16"  # Full precision


class InferenceBackend(str, Enum):
    """Hardware backends available for model inference."""

    CUDA = "CUDA"  # NVIDIA GPUs (default for discrete NVIDIA)
    VULKAN = "Vulkan"  # Cross-platform GPU compute (AMD, Intel, NVIDIA)
    CLBLAST = "CLBlast"  # OpenCL-based compute (alternative to Vulkan)
    METAL = "Metal"  # Apple Silicon / macOS
    CPU = "CPU"  # Pure CPU inference (no GPU)
    OPENCL = "OpenCL"  # Legacy GPU compute


# ─────────────────────────────────────────────
# Hardware & Recommendation models (ported from proxy-api/models.py)
# ─────────────────────────────────────────────


class HardwareProfile(BaseModel):
    """Describes the host machine's hardware capabilities."""

    model_config = ConfigDict(frozen=True)

    platform: Literal["windows", "linux", "macos"]
    cpu_cores: int = Field(gt=0, description="Physical CPU core count")
    logical_cores: int = Field(gt=0, description="Logical (hyperthreaded) core count")
    system_ram_gb: float = Field(gt=0, description="Total system RAM in gigabytes")
    gpu_name: Optional[str] = Field(default=None, description="GPU model name")
    gpu_vram_gb: Optional[float] = Field(default=None, description="GPU VRAM in gigabytes")
    cuda_compute: Optional[float] = Field(default=None, description="NVIDIA CUDA compute capability version")
    cuda_version: Optional[str] = Field(default=None, description="Installed CUDA toolkit version")
    is_apple_silicon: bool = Field(default=False, description="Whether the machine uses Apple Silicon")


class ModelRecommendation(BaseModel):
    """Recommended model configuration for a given hardware profile."""

    model_id: str
    quantization: QuantizationType
    context_length: int = Field(ge=512, le=262144, description="Token context window size")
    gpu_layers: int = Field(ge=0, description="Number of layers to offload to GPU")
    estimated_vram_gb: float = Field(description="Estimated VRAM consumption in GB")
    quality_score: float = Field(ge=0, le=10, description="Quality rating from 0-10")

    # Inference / Context Engineering
    system_prompt: Optional[str] = Field(default=None, description="Suggested system prompt")
    temperature: float = Field(default=0.6, ge=0, le=2)
    top_p: float = Field(default=0.95, ge=0, le=1)
    top_k: int = Field(default=40, gt=0)
    repeat_penalty: float = Field(default=1.1, ge=0)
    max_tokens: int = Field(default=2048, gt=0)
    enable_thinking: bool = Field(default=False, description="Enable extended reasoning / thinking mode")

    # Backend & Performance
    inference_backend: InferenceBackend = Field(default=InferenceBackend.CUDA)
    inference_engine: str = Field(default="llama.cpp")
    flash_attention: bool = Field(default=True)
    threads: int = Field(default=4, gt=0)
    batch_size: int = Field(default=512, gt=0)
    kv_cache_quantization: Literal["f16", "q4_0", "q8_0"] = Field(default="f16")
    mmap: bool = Field(default=True, description="Use memory-mapped model loading")
    numa_support: bool = Field(default=False, description="Enable NUMA-aware memory allocation")

    @property
    def is_offload_full(self) -> bool:
        """Check if the model fits entirely in GPU VRAM."""
        return self.gpu_layers >= 999 or self.gpu_layers >= 32


class HardwareRecommendation(BaseModel):
    """Full hardware analysis with model recommendations."""

    profile: Dict[str, Any] = Field(description="Hardware profile summary")
    recommendations: List[ModelRecommendation] = Field(description="Ranked model recommendations")
    vram_budget_gb: float = Field(gt=0, description="Recommended VRAM budget in GB")


# ─────────────────────────────────────────────
# Existing LM Studio schemas (preserved & enhanced)
# ─────────────────────────────────────────────


class Model(BaseModel):
    """OpenAI-compatible model descriptor."""

    id: str
    object: str = Field(default="model")
    created: int
    owned_by: str


class ModelListResponse(BaseModel):
    """Response containing a list of available models."""

    object: str = Field(default="list")
    data: List[Model]


class ChatMessage(BaseModel):
    """A single message in a chat conversation."""

    role: str = Field(description="Message role: system, user, assistant, or tool")
    content: str = Field(description="Message text content")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(default=None, description="Tool calls made by the assistant")
    tool_call_id: Optional[str] = Field(default=None, description="ID of the tool call this message responds to")


class ChatCompletionRequest(BaseModel):
    """Request body for a chat completion."""

    model: str
    messages: List[ChatMessage]
    stream: Optional[bool] = Field(default=False)
    temperature: Optional[float] = Field(default=1.0, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    context_window: Optional[int] = Field(default=16000, gt=0, alias="contextWindow")
    tools: Optional[List[Dict[str, Any]]] = Field(default=None)
    enable_thinking: Optional[bool] = Field(default=False)

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class EmbeddingRequest(BaseModel):
    """Request body for generating embeddings."""

    model: str
    input: Union[str, List[str]]
    dimensions: Optional[int] = Field(default=None, gt=0)


class AgentOrchestrateRequest(BaseModel):
    """Request to orchestrate a multi-step agent workflow."""

    model: str
    messages: List[ChatMessage]
    tools: Optional[List[Dict[str, Any]]] = Field(default=None)
    stream: Optional[bool] = Field(default=False)
    max_turns: Optional[int] = Field(default=10, gt=0)
    workflow: Optional[str] = Field(default=None, description="Workflow identifier")


# ─────────────────────────────────────────────
# Tool schemas (new)
# ─────────────────────────────────────────────


class ToolCall(BaseModel):
    """A call to an external tool by the agent."""

    name: str = Field(description="Tool name")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool call arguments")
    id: str = Field(description="Unique tool call identifier")


class ToolResult(BaseModel):
    """Result returned after executing a tool call."""

    output: Optional[str] = Field(default=None, description="Tool output text")
    error: Optional[str] = Field(default=None, description="Error message if execution failed")
    execution_time_ms: int = Field(default=0, ge=0, description="Execution duration in milliseconds")
    success: bool = Field(description="Whether the tool call succeeded")


class Tool(BaseModel):
    """Definition of a tool available to the agent."""

    name: str = Field(description="Unique tool name")
    description: str = Field(description="Human-readable tool description")
    parameters: Dict[str, Any] = Field(description="JSON Schema describing tool parameters")
    safety_level: Literal["autonomous", "supervised", "manual"] = Field(
        default="autonomous", description="Safety classification for the tool"
    )
    timeout_seconds: int = Field(default=30, gt=0, description="Maximum execution time")
    max_output_bytes: int = Field(default=1048576, gt=0, description="Maximum allowed output size in bytes")


# ─────────────────────────────────────────────
# Agent schemas (new)
# ─────────────────────────────────────────────


class AgentStep(BaseModel):
    """A single step in an agent's reasoning loop."""

    type: Literal["thought", "tool_call", "observation", "final_answer"] = Field(
        description="Step type"
    )
    content: Optional[str] = Field(default=None, description="Text content of the step")
    tool_call: Optional[ToolCall] = Field(default=None, description="Tool call details (if type is tool_call)")
    observation: Optional[ToolResult] = Field(default=None, description="Tool result (if type is observation)")


class AgentResult(BaseModel):
    """Final result of an agent orchestration run."""

    status: Literal["success", "failed", "cancelled", "timeout"] = Field(description="Run status")
    output: Optional[str] = Field(default=None, description="Final agent output")
    tool_calls: List[ToolCall] = Field(default_factory=list, description="All tool calls made during the run")
    turns: int = Field(ge=0, description="Number of reasoning turns")
    tokens_used: int = Field(ge=0, description="Total tokens consumed")
    error: Optional[str] = Field(default=None, description="Error message if the run failed")


class AgentSession(BaseModel):
    """Persistent session tracking for an agent workflow."""

    id: str = Field(description="Unique session identifier")
    workflow: str = Field(description="Workflow identifier")
    status: Literal["running", "completed", "failed", "cancelled"] = Field(description="Current session status")
    turns: List[AgentStep] = Field(default_factory=list, description="Ordered list of agent steps")
    created_at: datetime = Field(description="Session creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")


# ─────────────────────────────────────────────
# Retrieval & Reranking schemas (new)
# ─────────────────────────────────────────────


class RetrievalConfig(BaseModel):
    """Configuration for a retrieval operation."""

    top_k: int = Field(default=5, gt=0, description="Number of chunks to retrieve")
    chunk_size: int = Field(default=512, gt=0, description="Size of each chunk in tokens")
    chunk_overlap: int = Field(default=50, ge=0, description="Overlap between adjacent chunks")
    max_chunks: int = Field(default=20, gt=0, description="Maximum number of chunks to return")


class RetrieveRequest(BaseModel):
    """Request to retrieve relevant document chunks."""

    query: str = Field(description="Search query text")
    docs: List[str] = Field(default_factory=list, description="Document texts to search over")
    retrieval_config: RetrievalConfig = Field(default_factory=RetrievalConfig)


class RetrieveChunk(BaseModel):
    """A single retrieved chunk with metadata."""

    text: str = Field(description="Chunk text content")
    score: float = Field(description="Relevance score")
    source: Optional[str] = Field(default=None, description="Source document identifier")


class RetrieveResponse(BaseModel):
    """Response from a retrieval operation."""

    chunks: List[RetrieveChunk] = Field(description="Retrieved chunks ranked by relevance")
    total_chunks: int = Field(ge=0, description="Total number of chunks returned")
    retrieval_time_ms: int = Field(ge=0, description="Time taken for retrieval in milliseconds")
    context_text: str = Field(default="", description="Assembled context text for LLM injection")


class RerankRequest(BaseModel):
    """Request to rerank a set of retrieved chunks."""

    query: str = Field(description="Original search query")
    chunks: List[str] = Field(description="Chunk texts to rerank")
    top_k: int = Field(default=5, gt=0, description="Number of top results to keep")


class RerankResult(BaseModel):
    """A single reranked result."""

    index: int = Field(ge=0, description="Original index of the chunk")
    score: float = Field(description="Reranked relevance score")


class RerankResponse(BaseModel):
    """Response from a reranking operation."""

    results: List[RerankResult] = Field(description="Reranked results sorted by score descending")
    rerank_time_ms: int = Field(ge=0, description="Time taken for reranking in milliseconds")


# ─────────────────────────────────────────────
# Preset configuration (new)
# ─────────────────────────────────────────────


class PresetConfig(BaseModel):
    """Saved preset configuration for model loading and inference."""

    name: str = Field(description="Preset name")
    load_params: Dict[str, Any] = Field(
        default_factory=dict, description="Model loading parameters (e.g., gpu_layers, mmap)"
    )
    model_params: Dict[str, Any] = Field(
        default_factory=dict, description="Inference parameters (e.g., temperature, top_p)"
    )
    created_at: datetime = Field(description="Preset creation timestamp")


# ─────────────────────────────────────────────
# Error response (new)
# ─────────────────────────────────────────────


class AgentAction(BaseModel):
    """Suggested remediation action for an error."""

    action: str = Field(description="Recommended action")
    details: Optional[str] = Field(default=None, description="Additional context")


class ProxyState(BaseModel):
    """Snapshot of the proxy bridge state at the time of the error."""

    connected: bool = Field(description="Whether the proxy is connected to LM Studio")
    active_model: Optional[str] = Field(default=None, description="Currently loaded model")
    queue_size: int = Field(default=0, ge=0, description="Pending request queue size")


class ErrorResponse(BaseModel):
    """Structured error response for API failures."""

    message: str = Field(description="Human-readable error message")
    type: str = Field(description="Error type / classification")
    agent_action: Optional[AgentAction] = Field(default=None, description="Suggested remediation action")
    proxy_state: Optional[ProxyState] = Field(default=None, description="Proxy state snapshot at error time")
