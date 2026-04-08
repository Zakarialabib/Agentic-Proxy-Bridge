import asyncio
from app.services.tool_service import tool_registry

async def main():
    print("Testing calculate:")
    res = await tool_registry.execute("calculate", {"expression": "2 + 3 * 4"})
    print(res)
    
    print("\nTesting file_list:")
    res = await tool_registry.execute("file_list", {"path": "/workspace"})
    print(res)
    
    print("\nTesting file_list out of bounds:")
    res = await tool_registry.execute("file_list", {"path": "/etc"})
    print(res)
    
    print("\nTesting web_search:")
    res = await tool_registry.execute("web_search", {"query": "python uv package manager"})
    print(res)

    print("\nTesting search_knowledge_base:")
    res = await tool_registry.execute("search_knowledge_base", {"query": "proxy"})
    print(res)
    
    print("\nTesting query_knowledge_graph:")
    res = await tool_registry.execute("query_knowledge_graph", {"query": "api"})
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
