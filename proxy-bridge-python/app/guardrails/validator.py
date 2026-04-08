import json
import re
from typing import Dict, Any, Tuple, Optional

class JsonGuardrail:
    """
    Aggressively validates tool schemas to support agentic resilience.
    """
    
    @staticmethod
    def validate_tool_call(content: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates if the content contains a valid JSON tool call with 'name' and 'arguments'.
        Returns (is_valid, parsed_data, error_message).
        """
        try:
            # Try to find JSON block in case there's surrounding text
            json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", content)
            if not json_match:
                return False, None, "No JSON object found in the content."
            
            raw_json = json_match.group(1)
            data = json.loads(raw_json)
            
            if isinstance(data, list):
                # Handle potential list of calls
                if not data:
                    return False, None, "Empty tool call list."
                data = data[0]
            
            if not isinstance(data, dict):
                return False, None, f"Tool call must be a JSON object, got {type(data).__name__}."
            
            # NeMo requirement: Presence of 'name'
            if "name" not in data:
                return False, None, "Missing mandatory field 'name' in tool call."
            
            # Arguments can be optional or empty, but should be a dict if present
            args = data.get("arguments") or data.get("parameters")
            if args is not None and not isinstance(args, dict):
                return False, None, f"'arguments' must be a dictionary, got {type(args).__name__}."
                
            return True, data, None
            
        except json.JSONDecodeError as e:
            return False, None, f"JSON syntax error: {str(e)}"
        except Exception as e:
            return False, None, f"Unexpected validation error: {str(e)}"

validator = JsonGuardrail()
