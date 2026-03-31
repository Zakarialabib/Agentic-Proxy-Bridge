export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ContextDocument {
  id: string;
  content: string;
  score: number;
  source: string;
}

export interface ContextBuildInput {
  prompt: string;
  messages: OpenAIMessage[];
  docs: ContextDocument[];
  maxContextChars?: number;
}

export interface ContextBuildOutput {
  normalizedMessages: OpenAIMessage[];
  retrievalContext: string;
  budgetedContext: string;
}

export function buildContext(input: ContextBuildInput): ContextBuildOutput {
  const maxContextChars = input.maxContextChars ?? 6000;
  const normalizedMessages = input.messages
    .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content.replace(/\s+/g, " ").trim(),
    }));

  const rankedDocs = [...input.docs]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const retrievalContext = rankedDocs
    .map((doc) => `[${doc.source}] ${doc.content}`)
    .join("\n\n");

  const budgetedContext =
    retrievalContext.length > maxContextChars
      ? retrievalContext.slice(0, maxContextChars)
      : retrievalContext;

  return {
    normalizedMessages,
    retrievalContext,
    budgetedContext,
  };
}
