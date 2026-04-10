from typing import List, Dict, Any

def estimate_tokens(text: str) -> int:
    """Rough token estimation (approx 3.5 chars per token for safer budget + padding)"""
    if not text:
        return 0
    # Use 3.5 instead of 4 to be slightly more conservative with budget
    return int(len(str(text)) / 3.5) + 1

def enforce_context_window(messages: List[Dict[str, Any]], max_tokens: int = 16000) -> List[Dict[str, Any]]:
    """
    Enforces a context window limit.
    Preserves system prompt and compresses older messages when exceeding budget
    to leave headroom for tool results.
    """
    if not messages:
        return []
    
    system_msg = None
    if messages[0].get("role") == "system":
        system_msg = messages[0]
        working_msgs = messages[1:]
    else:
        working_msgs = messages[:]
        
    system_tokens = estimate_tokens(system_msg.get("content", "")) if system_msg else 0
    
    # Process from newest to oldest
    # Increase safety buffer for local models and tool headroom. 
    # Use 3000 token headroom to ensure long multi-hop agent reasoning doesn't get cut off.
    budget = max_tokens - system_tokens - 3000  
    if budget < 2000:
        # Guarantee at least some room for the user query, even if we have to squeeze
        budget = 2000
        
    retained_msgs = []
    current_tokens = 0
    dropped_count = 0
    
    for msg in reversed(working_msgs):
        msg_content = msg.get("content", "")
        if isinstance(msg_content, list):
            # Handle multimodal/content array
            msg_text = " ".join([c.get("text", "") for c in msg_content if c.get("type") == "text"])
        else:
            msg_text = str(msg_content)
            
        msg_tokens = estimate_tokens(msg_text)
        
        if current_tokens + msg_tokens <= budget:
            retained_msgs.append(msg)
            current_tokens += msg_tokens
        else:
            dropped_count += 1
            
    retained_msgs.reverse()
    
    final_messages = []
    if system_msg:
        final_messages.append(system_msg)
        
    if dropped_count > 0:
        final_messages.append({
            "role": "system",
            "content": f"[System Note: {dropped_count} older conversation turns were evicted to maintain tool context headroom.]"
        })
        
    final_messages.extend(retained_msgs)
        
    return final_messages

def map_model_name(model: str) -> str:
    """
    Maps Openclaw custom provider model names back to the underlying LM Studio model name.
    e.g. 'custom-192-168-1-12-1234/qwen3.5-4b' -> 'qwen3.5-4b'
    """
    if "/" in model:
        # Returns the part after the last slash
        return model.split("/")[-1]
    return model
