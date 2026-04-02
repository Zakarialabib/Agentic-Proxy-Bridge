# Proxy Bridge User Guide & Workflows

Welcome to the Proxy Bridge Control Space! This guide outlines the core workflows for controlling prompts, embeddings, and context across your local LLM deployments.

## Workflow 1: Running Agentic Scenarios (Control Space)

The primary purpose of the Proxy Bridge is to act as an intelligent middleman between your chat client (or the built-in React UI) and LM Studio.

1. **Open the Control Space**: Navigate to `http://localhost:3000` and click on the **Control Space** tab.
2. **Select a Scenario**: Above the chat box, you will see Scenario Cards. Click one to instantly adapt your environment:
   - **Code Assistant**: Modifies your system prompt to act as an expert coder, reduces temperature to `0.2` for precise syntax generation, expands context to `32K`, and injects the `file_read` and `file_list` tools.
   - **Deep Researcher**: Expands context to `128K`, sets temperature to `0.5`, and injects the `web_search` tool for automated data gathering.
3. **Chat**: When you send a message, the Python proxy intercepts the request, maps the configuration, and begins streaming the response from LM Studio. If the model decides to use a tool, the proxy pauses the stream, executes the Python tool script, and re-prompts the LLM with the results seamlessly.

## Workflow 2: Prompt & Embedding Analysis

Before committing to a massive Retrieval-Augmented Generation (RAG) task, you need to ensure your prompts are being vectorized efficiently.

1. Navigate to the **Embedding & Rerank** tab.
2. **Input your Prompt**: Type a query like "authentication middleware".
3. **Select MRL (Matryoshka Representation Learning)**: Choose your embedding dimension. Lower dimensions are faster to compute and search but lose semantic nuance.
4. **Analyze**: The pipeline will output an intent classification score and the exact latency in milliseconds it took LM Studio to generate the embedding vector.

## Workflow 3: Connecting External Clients (Openclaw)

The Proxy Bridge natively supports external agentic frameworks like **Openclaw**. It acts as a transparent OpenAI-compatible server.

1. Ensure your Python Proxy is running on `http://localhost:3001`.
2. Configure Openclaw's `providers` block to point to the proxy:

```json
"providers": {
  "custom-192-168-1-12-1234": {
    "baseUrl": "http://127.0.0.1:3001/v1",
    "api": "openai-completions",
    "models": [
      {
        "id": "qwen3.5-4b"
      }
    ]
  }
}
```
3. **Model Name Sanitization**: Openclaw sends the provider prefix in the model ID (e.g., `custom-192-168-1-12-1234/qwen3.5-4b`). The Python proxy automatically sanitizes this and forwards only `qwen3.5-4b` to LM Studio, preventing model-not-found errors.

## Workflow 4: Context Engineering (Eviction Strategy)

When dealing with large automated tasks, context windows fill up rapidly. The Proxy Bridge automatically handles context window limits to prevent crashes.

- **How it works**: When a request exceeds the defined context limit (e.g., `32768` tokens), the `enforce_context_window` pipeline activates.
- It guarantees the **System Prompt** is never deleted.
- It preserves a `500` token buffer for the LLM's response.
- It silently evicts the oldest conversation messages first until the token count is within hardware constraints.
