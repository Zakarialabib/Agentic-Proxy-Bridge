import re

content = r"""
<name=file_list</name>
<arguments>
<path>C:\Users\user\Desktop\projects\lmstudio\proxy-bridge-python</path>
</arguments>
"""

name_match = re.search(r"<name>\s*(.*?)\s*</name>", content, re.DOTALL)
if not name_match:
    name_match = re.search(r"<name>\s*([^\n<]+?)(?:\s*</name>|\s*>|<name|$)", content, re.DOTALL)
if not name_match:
    name_match = re.search(r"<name>\s*(\w+)\s*<arguments>", content, re.DOTALL | re.IGNORECASE)
if not name_match:
    name_match = re.search(r"<name\s*=\s*([a-zA-Z0-9_-]+)", content, re.IGNORECASE)

print("Name Match:", name_match.group(1) if name_match else None)

args_match = re.search(r"<arguments>\s*(.*?)\s*</arguments>", content, re.DOTALL)
print("Args Match:", args_match.group(1) if args_match else None)
