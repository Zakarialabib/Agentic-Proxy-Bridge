import httpx
from typing import List, Dict, Any
from app.core.settings import settings

async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Fetch embeddings from LM Studio for semantic similarity."""
    try:
        # Increased timeout to allow for JIT loading of the embedding model
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.lm_studio_base_url}/v1/embeddings",
                json={
                    "input": texts,
                    "model": settings.EMBED_MODEL or "text-embedding-qwen3",
                }
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return [item["embedding"] for item in data]
    except Exception as e:
        print(f"[Semantic Pruning] Embedding failed: {e}")
    return []

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not v1 or not v2:
        return 0.0
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = sum(x * x for x in v1) ** 0.5
    norm_v2 = sum(y * y for y in v2) ** 0.5
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

async def semantic_prune_context(messages: List[Dict[str, Any]], current_goal: str, threshold: float = 0.7) -> List[Dict[str, Any]]:
    """
    Semantically prunes older context (specifically tool results) that are irrelevant to the current goal.
    """
    if not current_goal or len(messages) < 4:
        return messages

    # We want to prune older tool responses, but keep recent messages and system prompts
    prunable_indices = []
    texts_to_embed = [current_goal]
    
    for i, msg in enumerate(messages):
        role = msg.get("role", "")
        content = msg.get("content", "")
        
        # Prune old tool responses or assistant messages that are not the last few turns
        if role in ["user", "assistant"] and i > 0 and i < len(messages) - 2:
            if "<tool_response>" in str(content) or "<tool_call>" in str(content):
                prunable_indices.append(i)
                texts_to_embed.append(str(content)[:500]) # embed prefix for speed

    if not prunable_indices:
        return messages

    embeddings = await get_embeddings(texts_to_embed)
    if not embeddings or len(embeddings) != len(texts_to_embed):
        return messages # Fallback to no pruning if embedding fails

    goal_embedding = embeddings[0]
    prunable_embeddings = embeddings[1:]

    # Keep messages that meet the threshold
    keep_indices = set([i for i in range(len(messages)) if i not in prunable_indices])
    
    for idx, msg_idx in enumerate(prunable_indices):
        sim = cosine_similarity(goal_embedding, prunable_embeddings[idx])
        if sim >= threshold:
            keep_indices.add(msg_idx)
        else:
            print(f"[Semantic Pruning] Dropped context at index {msg_idx} (sim: {sim:.2f})")

    return [msg for i, msg in enumerate(messages) if i in keep_indices]
