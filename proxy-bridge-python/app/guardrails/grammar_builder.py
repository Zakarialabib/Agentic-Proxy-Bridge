import json

def _schema_to_gbnf_rule(schema: dict, indent: int = 4) -> str:
    """
    Recursively converts a JSON schema into GBNF grammar rules.
    """
    ws = "ws "
    
    if schema.get("type") == "string":
        return "string"
    elif schema.get("type") == "number" or schema.get("type") == "integer":
        return "number"
    elif schema.get("type") == "boolean":
        return '("true" | "false")'
    elif schema.get("type") == "array":
        items_rule = _schema_to_gbnf_rule(schema.get("items", {}), indent)
        return f'"[" {ws} ({items_rule} ({ws} "," {ws} {items_rule})*)? {ws} "]"'
    elif schema.get("type") == "object":
        properties = schema.get("properties", {})
        if not properties:
            return '"{}"'
            
        rules = []
        for prop_name, prop_schema in properties.items():
            prop_rule = _schema_to_gbnf_rule(prop_schema, indent)
            rules.append(f'"{{\\"{prop_name}\\": " {ws} {prop_rule}')
            
        # Simplified object rule generation (assuming required fields for now)
        if len(rules) == 1:
            return f'"{{" {ws} {rules[0]} {ws} "}}"'
        else:
            # For complex objects, we would need to generate permutations or enforce strict ordering
            # For simplicity in this bridge, we enforce strict ordering of properties as defined in schema
            rule_str = f'"{{" {ws} '
            for i, rule in enumerate(rules):
                if i > 0:
                    rule_str += f' {ws} "," {ws} '
                rule_str += rule
            rule_str += f' {ws} "}}"'
            return rule_str
            
    return "string" # Fallback

def generate_tool_call_grammar(tool_schema: dict) -> str:
    """
    Converts an OpenAI-compatible function schema into a strict GBNF grammar
    for LM Studio to use during inference retries.
    """
    name = tool_schema.get("name", "")
    parameters = tool_schema.get("parameters", {})
    
    # Core GBNF definitions
    base_gbnf = """
root ::= tool-call
tool-call ::= "{" ws "\\"name\\":" ws "\\"" tool-name "\\"" ws "," ws "\\"arguments\\":" ws object "}"
tool-name ::= "%s"
value ::= object | array | string | number | ("true" | "false") | "null"
object ::= "{" ws (string ws ":" ws value (ws "," ws string ws ":" ws value)*)? ws "}"
array  ::= "[" ws (value (ws "," ws value)*)? ws "]"
string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?
ws ::= ([ \\t\\n]* )
""" % name

    # For a robust production implementation, we would replace the generic `object` 
    # rule in `tool-call` with a dynamically generated strict schema rule.
    # However, forcing the `tool-name` and standard JSON structure alone 
    # significantly reduces the token search space and prevents hallucinated tool names.
    
    return base_gbnf.strip()
