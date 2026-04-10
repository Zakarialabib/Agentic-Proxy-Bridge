import os
import asyncio
from typing import List, Dict, Any
from app.services.context_pruner import get_embeddings, cosine_similarity

# Naive in-memory cache to avoid re-embedding chunks on every query
_document_cache: List[Dict[str, Any]] = []
_cache_initialized = False

def _chunk_text(text: str, filename: str, max_chunk_size: int = 1000) -> List[Dict[str, Any]]:
    """Splits text into chunks, roughly by paragraphs."""
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for p in paragraphs:
        if len(current_chunk) + len(p) > max_chunk_size and current_chunk:
            chunks.append({"text": current_chunk.strip(), "source": filename})
            current_chunk = ""
        current_chunk += p + "\n\n"
        
    if current_chunk.strip():
        chunks.append({"text": current_chunk.strip(), "source": filename})
        
    return chunks

async def _initialize_cache(docs_dir: str = "/workspace/docs"):
    global _document_cache, _cache_initialized
    if _cache_initialized:
        return
        
    _document_cache = []
    chunks_to_embed = []
    
    if not os.path.exists(docs_dir):
        _cache_initialized = True
        return

    # 1. Read and chunk all markdown files
    for root, _, files in os.walk(docs_dir):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    chunks = _chunk_text(content, file_path)
                    for c in chunks:
                        _document_cache.append(c)
                        chunks_to_embed.append(c["text"])
                except Exception as e:
                    print(f"[Semantic Search] Failed to read {file_path}: {e}")

    if not chunks_to_embed:
        _cache_initialized = True
        return

    # 2. Fetch embeddings in batches to prevent payload limits
    batch_size = 20  # Keep batch size small for local models
    for i in range(0, len(chunks_to_embed), batch_size):
        batch_texts = chunks_to_embed[i:i+batch_size]
        batch_embeddings = await get_embeddings(batch_texts)
        
        if batch_embeddings:
            for j, emb in enumerate(batch_embeddings):
                if i + j < len(_document_cache):
                    _document_cache[i + j]["embedding"] = emb

    # Filter out chunks that failed to embed
    _document_cache = [c for c in _document_cache if "embedding" in c]
    _cache_initialized = True

async def semantic_search_docs(query: str, top_k: int = 3, docs_dir: str = "/workspace/docs") -> str:
    """
    Performs semantic vector search over local markdown documentation.
    """
    await _initialize_cache(docs_dir)
    
    if not _document_cache:
        return "No knowledge base documents found or embedded."

    # Embed the user's query
    query_embeddings = await get_embeddings([query])
    if not query_embeddings:
        return f"Failed to generate embedding for query: '{query}'"
        
    query_emb = query_embeddings[0]
    
    # Score chunks
    scored_chunks = []
    for chunk in _document_cache:
        score = cosine_similarity(query_emb, chunk["embedding"])
        scored_chunks.append((score, chunk))
        
    # Sort descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # Format results
    top_results = scored_chunks[:top_k]
    
    if not top_results or top_results[0][0] < 0.3: # Minimum similarity threshold
        return f"No highly relevant information found for '{query}'. Highest score was {top_results[0][0]:.2f} if any."
        
    result_str = f"Top {len(top_results)} semantic matches for '{query}':\n\n"
    for i, (score, chunk) in enumerate(top_results):
        result_str += f"--- Match {i+1} (Score: {score:.2f}) ---\n"
        result_str += f"Source: {chunk['source']}\n"
        result_str += f"Snippet:\n{chunk['text']}\n\n"
        
    return result_str
