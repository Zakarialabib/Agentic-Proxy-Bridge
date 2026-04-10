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
            # Check for JSON tool call format first - starts with { and contains "name"
            # But NOT if it's XML with JSON inside (like <arguments>{"x":1}</arguments>)
            content_stripped = content.strip()
            is_likely_json_format = (
                content_stripped.startswith('{') and 
                content_stripped.endswith('}') and
                '"name"' in content_stripped
            )
            
            if is_likely_json_format:
                # Pure JSON format
                data = json.loads(content_stripped)
                if isinstance(data, list):
                    if not data:
                        return False, None, "Empty tool call list."
                    data = data[0]
                if not isinstance(data, dict):
                    return False, None, f"Tool call must be an object, got {type(data).__name__}."
                if "name" not in data:
                    return False, None, "Missing mandatory field 'name' in tool call."
                return True, data, None

            # Parse XML format
            name_match = re.search(r"<name>\s*(.*?)\s*</name>", content, re.DOTALL)
            if not name_match:
                # Try alternate: name tag with different closing patterns
                name_match = re.search(r"<name>\s*([^\n<]+?)(?:\s*</name>|\s*>|<name|$)", content, re.DOTALL)
            
            if not name_match:
                # Try more aggressive pattern: <name>WORD<arguments> - model might have missing closing tag
                name_match = re.search(r"<name>\s*(\w+)\s*<arguments>", content, re.DOTALL | re.IGNORECASE)
            
            if not name_match:
                # Try JSON-style: "name": "toolname"
                json_name_match = re.search(r'"name"\s*:\s*"([^"]+)"', content)
                if json_name_match:
                    tool_name = json_name_match.group(1).strip()
                    if tool_name:
                        args = {}
                        json_args_match = re.search(r'"arguments"\s*:\s*(\{[^}]*\})', content)
                        if json_args_match:
                            try:
                                args = json.loads(json_args_match.group(1))
                            except:
                                pass
                        return True, {"name": tool_name, "arguments": args}, None
                
                # Try <tool_call><name>toolname</name>...
                inline_match = re.search(r'<tool_call[^>]*>\s*<name>\s*(\w+)', content, re.IGNORECASE)
                if inline_match:
                    tool_name = inline_match.group(1).strip()
                    return True, {"name": tool_name, "arguments": {}}, None
                
                # Try direct tag Anthropic/Cursor style: <tool_call><tool_name><param>value</param></tool_name></tool_call>
                direct_tag_match = re.search(r'<tool_call>\s*<([a-zA-Z0-9_-]+)>', content, re.IGNORECASE)
                if direct_tag_match:
                    tool_name = direct_tag_match.group(1).strip()
                    if tool_name not in ('name', 'arguments'):
                        args = {}
                        inner_content_match = re.search(f"<{tool_name}>(.*?)</{tool_name}>", content, re.DOTALL | re.IGNORECASE)
                        if inner_content_match:
                            inner_content = inner_content_match.group(1).strip()
                            for arg_match in re.finditer(r"<([^>]+)>\s*(.*?)\s*</\1>", inner_content, re.DOTALL):
                                args[arg_match.group(1).strip()] = arg_match.group(2).strip()
                        return True, {"name": tool_name, "arguments": args}, None
                
                # Last resort: look for ANY word followed by <arguments> at top level
                # This handles <name>tool_name</arguments> which is malformed but contains both
                desperate_match = re.search(r"<name>\s*(\w+)\s*</arguments>", content, re.DOTALL | re.IGNORECASE)
                if desperate_match:
                    tool_name = desperate_match.group(1).strip()
                    return True, {"name": tool_name, "arguments": {}}, None
                
                return False, None, "Missing mandatory field <name> in XML tool call."
            
            tool_name = name_match.group(1).strip()
            
            if not tool_name:
                json_name_match = re.search(r'"name"\s*:\s*"([^"]+)"', content)
                if json_name_match:
                    tool_name = json_name_match.group(1).strip()
                else:
                    return False, None, "Empty tool name in XML tool call."
            
            args = {}
            args_match = re.search(r"<arguments>\s*(.*?)\s*</arguments>", content, re.DOTALL)
            if not args_match:
                # Try JSON arguments inside XML
                json_args_match = re.search(r'"arguments"\s*:\s*(\{[^}]*\})', content)
                if json_args_match:
                    try:
                        args = json.loads(json_args_match.group(1))
                    except:
                        pass
            else:
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
