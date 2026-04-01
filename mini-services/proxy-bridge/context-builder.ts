import { ModelPreset } from "./settings";
import { ContextWindowManager } from "./services/context-window-manager";

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
  preset?: ModelPreset;
}

export interface ContextBuildOutput {
  normalizedMessages: OpenAIMessage[];
  retrievalContext: string;
  budgetedContext: string;
  totalTokens: number;
}

export function buildContext(input: ContextBuildInput): ContextBuildOutput {
  const normalizedMessages = input.messages
    .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content.replace(/\s+/g, " ").trim(),
    }));

  const rankedDocs = [...input.docs]
    .sort((a, b) => b.score - a.score);

  const { optimizedMessages, optimizedDocs, totalTokens, budgetedContextStr } = ContextWindowManager.optimizeContext(
    normalizedMessages,
    rankedDocs,
    input.preset,
    input.maxContextChars
  );

  const retrievalContext = rankedDocs
    .slice(0, 8)
    .map((doc) => `[${doc.source}] ${doc.content}`)
    .join("\n\n");

  return {
    normalizedMessages: optimizedMessages,
    retrievalContext,
    budgetedContext: budgetedContextStr,
    totalTokens
  };
}
