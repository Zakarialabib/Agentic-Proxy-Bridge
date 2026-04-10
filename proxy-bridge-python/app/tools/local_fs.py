import os
import asyncio
import shlex
from typing import Dict, Any, List

def enforce_workspace(path: str) -> str:
    """Ensure that the given path is within the /workspace directory."""
    workspace_dir = os.path.abspath("/workspace")
    abs_path = os.path.abspath(path)
    if not abs_path.startswith(workspace_dir):
        raise ValueError(f"Access to path '{path}' is denied. Must be within /workspace")
    return abs_path

async def read_file(path: str) -> Dict[str, Any]:
    """Read contents of a file."""
    if not path:
        return {"status": "error", "content": "No path provided"}
    try:
        safe_path = enforce_workspace(path)
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"status": "success", "content": content}
    except Exception as e:
        return {"status": "error", "content": str(e)}

async def search_dir(path: str = ".", pattern: str = "") -> Dict[str, Any]:
    """Search for files in a directory."""
    try:
        safe_path = enforce_workspace(path)
        results = []
        for root, _, files in os.walk(safe_path):
            for file in files:
                if not pattern or pattern in file:
                    results.append(os.path.join(root, file))
        return {"status": "success", "content": results}
    except Exception as e:
        return {"status": "error", "content": str(e)}

async def run_read_only_command(command: str) -> Dict[str, Any]:
    """Run a read-only shell command."""
    forbidden_tokens = {
        "rm", "touch", "mkdir", "rmdir", "mv", "cp", "ln",
        ">", ">>", "chmod", "chown", "chgrp", "wget", "curl",
        "apt", "apt-get", "yum", "dnf", "pip", "npm", "yarn", "pnpm", "git"
    }
    
    try:
        # Use shlex to parse the command into tokens
        tokens = shlex.split(command)
    except ValueError:
        return {"status": "error", "content": "Command rejected: malformed command."}
        
    for token in tokens:
        if token in forbidden_tokens or token.startswith(">") or token.startswith(">>"):
            return {"status": "error", "content": "Command rejected: mutating operation detected."}
            
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd="/workspace"
        )
        stdout, stderr = await process.communicate()
        return {
            "status": "success" if process.returncode == 0 else "error",
            "stdout": stdout.decode('utf-8', errors='replace'),
            "stderr": stderr.decode('utf-8', errors='replace'),
            "returncode": process.returncode
        }
    except Exception as e:
        return {"status": "error", "content": str(e)}
