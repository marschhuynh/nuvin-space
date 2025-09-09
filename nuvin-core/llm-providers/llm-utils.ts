import type { ToolCall, UsageData } from '../ports';

// Merge provider choices into a single content string and combined tool_calls
export function mergeChoices(
  choices: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } } | undefined> | undefined,
): { content: string; tool_calls?: ToolCall[] } {
  const contentParts: string[] = [];
  const mergedToolCalls: ToolCall[] = [];
  for (const ch of choices || []) {
    const msg = ch?.message;
    if (!msg) continue;
    if (typeof msg.content === 'string' && msg.content.trim()) contentParts.push(msg.content);
    if (Array.isArray(msg.tool_calls)) mergedToolCalls.push(...msg.tool_calls);
  }
  const content = contentParts.join('\n\n');
  const tool_calls = mergedToolCalls.length ? mergedToolCalls : undefined;
  return { content, ...(tool_calls ? { tool_calls } : {}) } as { content: string; tool_calls?: ToolCall[] };
}

// Normalize usage data across providers (e.g., input/output vs prompt/completion)
export function normalizeUsage(usage?: Partial<UsageData> & { input_tokens?: number; output_tokens?: number } | null):
  | UsageData
  | undefined {
  if (!usage) return undefined;
  const prompt_tokens = usage.prompt_tokens ?? (usage as any).input_tokens;
  const completion_tokens = usage.completion_tokens ?? (usage as any).output_tokens;
  const total_tokens =
    usage.total_tokens ??
    (prompt_tokens != null && completion_tokens != null ? prompt_tokens + completion_tokens : undefined);
  return { prompt_tokens, completion_tokens, total_tokens };
}

