interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_calls?: unknown[];
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: "stop" | "tool_calls" | "length";
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

export function toLMStudioInput(messages: Array<{ role?: string; content?: string }>): string {
  return messages
    .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => `${m.role ?? "user"}: ${m.content}`)
    .join("\n");
}

export function toOpenAIChatResponse(args: {
  id: string;
  model: string;
  content: string;
  finishReason?: "stop" | "tool_calls" | "length";
  promptTokens?: number;
  completionTokens?: number;
  toolCalls?: unknown[];
}): OpenAIResponse {
  const promptTokens = args.promptTokens ?? 0;
  const completionTokens = args.completionTokens ?? 0;
  const finishReason = args.finishReason ?? "stop";

  return {
    id: args.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: args.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: finishReason === "tool_calls" ? null : args.content,
          ...(args.toolCalls && args.toolCalls.length > 0 ? { tool_calls: args.toolCalls } : {}),
        },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}
