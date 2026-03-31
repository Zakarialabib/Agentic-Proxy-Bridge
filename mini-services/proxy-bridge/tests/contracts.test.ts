import { describe, expect, test } from "bun:test";
import { toLMStudioInput, toOpenAIChatResponse } from "../openai-adapter";
import { buildContext } from "../context-builder";

describe("OpenAI contract mapping", () => {
  test("maps OpenAI messages to LM Studio input with roles", () => {
    const input = toLMStudioInput([
      { role: "system", content: "You are a coding agent." },
      { role: "user", content: "Refactor the parser." }
    ]);

    expect(input).toContain("system: You are a coding agent.");
    expect(input).toContain("user: Refactor the parser.");
  });

  test("returns OpenAI-compatible response shape", () => {
    const response = toOpenAIChatResponse({
      id: "chatcmpl-test",
      model: "qwen-test",
      content: "Done",
      promptTokens: 10,
      completionTokens: 5
    });

    expect(response.object).toBe("chat.completion");
    expect(response.choices[0]?.message.role).toBe("assistant");
    expect(response.usage.total_tokens).toBe(15);
  });
});

describe("Context builder", () => {
  test("applies retrieval budget and keeps normalized messages", () => {
    const out = buildContext({
      prompt: "Fix bug",
      messages: [{ role: "user", content: "Fix   bug now" }],
      docs: [
        { id: "1", content: "A".repeat(2000), score: 0.9, source: "doc-1" },
        { id: "2", content: "B".repeat(2000), score: 0.8, source: "doc-2" }
      ],
      maxContextChars: 500
    });

    expect(out.normalizedMessages[0]?.content).toBe("Fix bug now");
    expect(out.budgetedContext.length).toBeLessThanOrEqual(500);
  });
});
