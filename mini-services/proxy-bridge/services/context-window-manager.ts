import { OpenAIMessage, ContextDocument } from "../context-builder";
import { ModelPreset } from "../settings";

export class ContextWindowManager {
  /**
   * Fast local estimation for Qwen/Llama models: ~4 chars per token.
   */
  static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  static estimateMessageTokens(message: OpenAIMessage): number {
    return this.estimateTokens(message.content) + 4; // Add overhead for role/formatting
  }

  static estimateDocumentTokens(doc: ContextDocument): number {
    return this.estimateTokens(`[${doc.source}] ${doc.content}`) + 4;
  }

  /**
   * Applies the eviction strategy to ensure the messages and docs fit within the context length limit.
   * Evict oldest messages first, but ALWAYS preserve the system prompt and critical RAG context.
   */
  static optimizeContext(
    messages: OpenAIMessage[],
    docs: ContextDocument[],
    preset?: ModelPreset,
    maxContextChars?: number
  ): {
    optimizedMessages: OpenAIMessage[];
    optimizedDocs: ContextDocument[];
    totalTokens: number;
    budgetedContextStr: string;
  } {
    // Defaults if preset is not provided
    const contextLength = preset?.context_length ?? 8192;
    const maxOutputTokens = preset?.max_tokens ?? 2048;
    
    // Calculate available tokens for input (reserve space for output generation)
    const availableTokens = Math.max(0, contextLength - maxOutputTokens - 50); // 50 tokens buffer

    // 1. ALWAYS preserve system prompt
    const systemMessages = messages.filter(m => m.role === "system");
    let systemTokens = systemMessages.reduce((sum, m) => sum + this.estimateMessageTokens(m), 0);

    // 2. ALWAYS preserve critical RAG context (documents)
    let docsTokens = 0;
    const optimizedDocs: ContextDocument[] = [];
    for (const doc of docs) {
      const docTokens = this.estimateDocumentTokens(doc);
      if (systemTokens + docsTokens + docTokens <= availableTokens) {
        optimizedDocs.push(doc);
        docsTokens += docTokens;
      }
    }

    // 3. Add Non-System Messages (evict oldest first)
    const nonSystemMessages = messages.filter(m => m.role !== "system");
    
    // Iterate from newest to oldest
    const reversedNonSystem = [...nonSystemMessages].reverse();
    const optimizedNonSystem: OpenAIMessage[] = [];
    let messagesTokens = 0;

    for (const msg of reversedNonSystem) {
      const msgTokens = this.estimateMessageTokens(msg);
      if (systemTokens + docsTokens + messagesTokens + msgTokens <= availableTokens) {
        optimizedNonSystem.unshift(msg); // Add to front to maintain chronological order
        messagesTokens += msgTokens;
      } else {
        // Stop here: this message and all older messages are evicted.
        break;
      }
    }

    let budgetedContextStr = optimizedDocs
      .map((doc) => `[${doc.source}] ${doc.content}`)
      .join("\n\n");
      
    if (maxContextChars && budgetedContextStr.length > maxContextChars) {
      budgetedContextStr = budgetedContextStr.slice(0, maxContextChars);
    }

    return {
      optimizedMessages: [...systemMessages, ...optimizedNonSystem],
      optimizedDocs,
      totalTokens: systemTokens + docsTokens + messagesTokens,
      budgetedContextStr
    };
  }
}
