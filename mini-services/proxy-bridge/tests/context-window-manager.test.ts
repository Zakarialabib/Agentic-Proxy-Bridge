import { describe, test, expect } from 'bun:test';
import { ContextWindowManager } from '../services/context-window-manager';
import { OpenAIMessage, ContextDocument } from '../context-builder';

describe('ContextWindowManager', () => {
  const dummyPreset = {
    model_key: "test",
    name: "test",
    context_length: 1000,
    max_tokens: 100,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    system_prompt: "You are a helpful assistant."
  } as any;

  test('should estimate tokens correctly', () => {
    // 12 chars -> 12/4 = 3 tokens
    expect(ContextWindowManager.estimateTokens('123456789012')).toBe(3);
    
    // Message adds 4 tokens overhead
    const msg: OpenAIMessage = { role: 'user', content: '123456789012' };
    expect(ContextWindowManager.estimateMessageTokens(msg)).toBe(7);
  });

  test('should preserve system prompt and RAG context, and evict older messages when limits are reached', () => {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'system prompt' }, // 13 chars -> 4 tokens + 4 = 8 tokens
      { role: 'user', content: 'a'.repeat(2000) }, // 500 tokens + 4 = 504 tokens (older message)
      { role: 'assistant', content: 'b'.repeat(2000) }, // 500 tokens + 4 = 504 tokens (older message)
      { role: 'user', content: 'c'.repeat(400) } // 100 tokens + 4 = 104 tokens (newest message)
    ];

    const docs: ContextDocument[] = [
      { id: '1', content: 'd'.repeat(800), score: 1, source: 'doc1' }, // "[doc1] " = 7 chars + 800 = 807 chars -> 202 tokens + 4 = 206 tokens
    ];

    // Available tokens: context_length (1000) - maxOutputTokens (100) - buffer (50) = 850
    // System: 8
    // Docs: 206
    // Remaining for messages: 850 - 214 = 636
    // Newest message: 104 -> fits. Remaining: 532
    // Older assistant message: 504 -> fits. Remaining: 28
    // Oldest user message: 504 -> does NOT fit. Break.

    const { optimizedMessages, optimizedDocs, totalTokens } = ContextWindowManager.optimizeContext(
      messages,
      docs,
      dummyPreset
    );

    expect(optimizedDocs.length).toBe(1);
    expect(optimizedMessages.length).toBe(3);
    expect(optimizedMessages[0].role).toBe('system');
    expect(optimizedMessages[1].content).toBe('b'.repeat(2000));
    expect(optimizedMessages[2].content).toBe('c'.repeat(400));
    expect(totalTokens).toBe(8 + 206 + 104 + 504);
  });

  test('should truncate RAG context if it exceeds available tokens', () => {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'system prompt' }, // 8 tokens
      { role: 'user', content: 'c'.repeat(400) } // 104 tokens
    ];

    const docs: ContextDocument[] = [
      { id: '1', content: 'd'.repeat(2000), score: 1, source: 'doc1' }, // ~500 tokens
      { id: '2', content: 'e'.repeat(2000), score: 0.9, source: 'doc2' }, // ~500 tokens
    ];

    // Available tokens: 850
    // System: 8
    // Docs: doc1 (~500) fits. doc2 (~500) does NOT fit. 
    // Messages: user (~104) fits.

    const { optimizedMessages, optimizedDocs } = ContextWindowManager.optimizeContext(
      messages,
      docs,
      dummyPreset
    );

    expect(optimizedDocs.length).toBe(1);
    expect(optimizedDocs[0].id).toBe('1');
    expect(optimizedMessages.length).toBe(2);
  });
});
