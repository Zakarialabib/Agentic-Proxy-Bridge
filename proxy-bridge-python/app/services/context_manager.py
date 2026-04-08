import httpx
import asyncio
from app.core.settings import settings

class LMStudioContextController:
    """
    Dynamically adjusts LM Studio's context window based on agent state.
    """
    def __init__(self, base_url: str = None):
        self.base_url = base_url or settings.lm_studio_base_url
        self.current_context = 4096  # Start conservative
        
    async def adjust_for_trajectory(self, hop_count: int, tool_results_size: int):
        """
        Dynamically adjust LM Studio's context window based on agent state.
        """
        if hop_count > 2 and tool_results_size > 1000:
            # About to enter heavy reasoning, reduce context to prevent OOM
            new_context = 2048
        elif hop_count == 0:
            # Fresh conversation, standard context
            new_context = 4096
        else:
            new_context = self.current_context
            
        if new_context != self.current_context:
            await self._set_context_length(new_context)
            self.current_context = new_context
            
    async def _set_context_length(self, length: int):
        """
        LM Studio API endpoint for dynamic configuration.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{self.base_url}/v0/models/loaded/config",
                    json={"context_length": length}
                )
                if resp.status_code == 200:
                    print(f"[Agentic Bridge] Dynamically adjusted LM Studio context length to {length}")
                else:
                    print(f"[Agentic Bridge] Failed to adjust context length: {resp.status_code}")
        except Exception as e:
            print(f"[Agentic Bridge] Error adjusting context length: {str(e)}")

context_controller = LMStudioContextController()
