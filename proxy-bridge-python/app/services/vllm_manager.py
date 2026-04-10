import asyncio
import logging
from typing import Optional
from app.core.settings import settings

logger = logging.getLogger(__name__)

class VLLMManager:
    """
    Asynchronous manager to start, monitor, and stop a vLLM subprocess.
    """
    
    def __init__(self):
        self.process: Optional[asyncio.subprocess.Process] = None
        self._is_running = False
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        """Starts the vLLM subprocess using the configured model."""
        if self._is_running or self.process is not None:
            logger.warning("vLLM is already running or starting.")
            return

        if not settings.VLLM_MODEL:
            logger.error("VLLM_MODEL is not set in settings.")
            raise ValueError("VLLM_MODEL is required to start vLLM.")

        logger.info(f"Starting vLLM subprocess with model: {settings.VLLM_MODEL}")
        
        import sys
        
        try:
            cmd = [
                sys.executable, "-m", "vllm.entrypoints.openai.api_server",
                "--model", settings.VLLM_MODEL,
                "--host", "0.0.0.0",
                "--port", "8000"
            ]
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            self._is_running = True
            
            if self.process.stdout and self.process.stderr:
                self._tasks = [
                    asyncio.create_task(self._stream_logs(self.process.stdout, "STDOUT")),
                    asyncio.create_task(self._stream_logs(self.process.stderr, "STDERR")),
                    asyncio.create_task(self.monitor())
                ]
            
            logger.info(f"vLLM subprocess started with PID: {self.process.pid}")
            
        except Exception as e:
            logger.error(f"Failed to start vLLM subprocess: {e}")
            self._is_running = False
            raise

    async def _stream_logs(self, stream: asyncio.StreamReader, prefix: str) -> None:
        """Stream logs from the subprocess."""
        try:
            async for line in stream:
                if line:
                    logger.info(f"[vLLM {prefix}] {line.decode().strip()}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error reading vLLM {prefix}: {e}")

    async def monitor(self) -> None:
        """Monitor the vLLM subprocess status."""
        if not self.process:
            return
            
        try:
            # Wait for the process to exit
            returncode = await self.process.wait()
            self._is_running = False
            logger.warning(f"vLLM subprocess exited with code {returncode}")
        except asyncio.CancelledError:
            logger.info("vLLM monitor task cancelled.")

    async def stop(self) -> None:
        """Stop the vLLM subprocess."""
        if not self.process:
            logger.info("vLLM is not running.")
            return

        logger.info("Stopping vLLM subprocess...")
        self._is_running = False
        
        # Cancel log and monitor tasks
        for task in self._tasks:
            if not task.done():
                task.cancel()
        self._tasks.clear()
            
        try:
            self.process.terminate()
            await asyncio.wait_for(self.process.wait(), timeout=10.0)
            logger.info("vLLM subprocess stopped gracefully.")
        except asyncio.TimeoutError:
            logger.warning("vLLM subprocess did not stop gracefully, killing it.")
            self.process.kill()
            await self.process.wait()
            logger.info("vLLM subprocess killed.")
        except ProcessLookupError:
            pass  # Process already dead
        finally:
            self.process = None

vllm_manager = VLLMManager()
