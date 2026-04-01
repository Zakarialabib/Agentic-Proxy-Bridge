import { describe, test, expect } from 'bun:test';
import { buildContext, ContextBuildInput } from '../context-builder';

describe('buildContext', () => {
  const dummyPreset = {
    model_key: "test",
    name: "test",
    context_length: 1000,
    max_tokens: 100,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    system_prompt: "You are a helpful assistant."
  };

  test('should normalize messages and rank docs', () => {
    const input: ContextBuildInput = {
      prompt: 'hello',
      messages: [
        { role: 'system', content: '  system   prompt  ' },
        { role: 'user', content: '   ' }, // should be filtered out
        { role: 'user', content: 'hello  world' }
      ],
      docs: [
        { id: '1', content: 'doc1', score: 0.5, source: 'src1' },
        { id: '2', content: 'doc2', score: 0.9, source: 'src2' }
      ],
      preset: dummyPreset
    };

    const output = buildContext(input);

    // Messages should be normalized
    expect(output.normalizedMessages.length).toBe(2);
    expect(output.normalizedMessages[0].content).toBe('system prompt');
    expect(output.normalizedMessages[1].content).toBe('hello world');

    // Docs should be ranked
    expect(output.retrievalContext).toContain('doc2');
    expect(output.retrievalContext.indexOf('doc2')).toBeLessThan(output.retrievalContext.indexOf('doc1'));
  });
});
