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
        Validates if the content contains a valid XML tool call with 'name' and 'arguments'.
        Returns (is_valid, parsed_data, error_message).
        """
        try:
            # Fallback to JSON if it looks like JSON
            if "{" in content and "}" in content and "<tool_call>" not in content:
                json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", content)
                if json_match:
                    raw_json = json_match.group(1)
                    data = json.loads(raw_json)
                    if isinstance(data, list):
                        if not data:
                            return False, None, "Empty tool call list."
                        data = data[0]
                    if not isinstance(data, dict):
                        return False, None, f"Tool call must be an object, got {type(data).__name__}."
                    if "name" not in data:
                        return False, None, "Missing mandatory field 'name' in tool call."
                    return True, data, None

            # Parse XML
            name_match = re.search(r"<name>\s*(.*?)\s*</name>", content, re.DOTALL)
            if not name_match:
                return False, None, "Missing mandatory field <name> in XML tool call."
            
            tool_name = name_match.group(1).strip()
            
            args = {}
            args_match = re.search(r"<arguments>\s*(.*?)\s*</arguments>", content, re.DOTALL)
            if args_match:
                args_content = args_match.group(1).strip()
                if args_content.startswith("{") and args_content.endswith("}"):
                    try:
                        args = json.loads(args_content)
                    except:
                        pass
                if not args:
                    # Parse simple tags: <arg_name>value</arg_name>
                    for arg_match in re.finditer(r"<([^>]+)>\s*(.*?)\s*</\1>", args_content, re.DOTALL):
                        arg_name = arg_match.group(1).strip()
                        arg_value = arg_match.group(2).strip()
                        args[arg_name] = arg_value

            data = {
                "name": tool_name,
                "arguments": args
            }
            return True, data, None
            
        except json.JSONDecodeError as e:
            return False, None, f"Syntax error: {str(e)}"
        except Exception as e:
            return False, None, f"Unexpected validation error: {str(e)}"

validator = JsonGuardrail()
