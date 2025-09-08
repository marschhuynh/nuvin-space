// Core ports and types for the agent orchestrator. Self-contained.

// Provider-side types
export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string per OpenAI-style schema
  };
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type CompletionParams = {
  messages: ChatMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object; // JSON Schema
    };
  }>;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
};

export type UsageData = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type CompletionResult = {
  content: string;
  tool_calls?: ToolCall[];
  usage?: UsageData;
};

// Internal domain types
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  timestamp?: string;
  // When role is 'assistant' and it invoked tools
  tool_calls?: ToolCall[];
  // When role is 'tool'
  tool_call_id?: string;
  name?: string;
};

export type MessageResponse = {
  id: string;
  content: string;
  role: 'assistant' | 'tool';
  timestamp: string;
  metadata?: {
    model?: string;
    provider?: string;
    agentId?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    estimatedCost?: number;
    responseTime?: number;
    toolCalls?: number;
  };
};

export type SendMessageOptions = {
  conversationId?: string;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  onAdditionalMessage?: (message: MessageResponse) => void;
};

// Ports (interfaces) the orchestrator depends upon
export interface LLMPort {
  generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult>;
}

export type ToolDefinition = {
  type: 'function';
  function: { name: string; description: string; parameters: object };
};

export type ToolInvocation = { id: string; name: string; parameters: Record<string, any> };

export type ToolExecutionResult = {
  id: string;
  name: string;
  status: 'success' | 'error';
  type: 'text' | 'json';
  result: string | object;
  metadata?: Record<string, unknown>;
};

export interface ToolPort {
  getToolDefinitions(enabledTools: string[]): ToolDefinition[];
  executeToolCalls(calls: ToolInvocation[], context?: Record<string, any>, maxConcurrent?: number): Promise<ToolExecutionResult[]>;
}

export type MemorySnapshot<T = unknown> = Record<string, T[]>;

export interface MemoryPersistence<T = unknown> {
  load(): Promise<MemorySnapshot<T>>;
  save(snapshot: MemorySnapshot<T>): Promise<void>;
}

export interface MemoryPort<T = unknown> {
  get(key: string): Promise<T[]>;
  set(key: string, items: T[]): Promise<void>;
  append(key: string, items: T[]): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  exportSnapshot(): Promise<MemorySnapshot<T>>;
  importSnapshot(snapshot: MemorySnapshot<T>): Promise<void>;
}

export interface ContextBuilder {
  toProviderMessages(history: Message[], systemPrompt: string, newUserContent: string[]): ChatMessage[];
}

export interface RemindersPort {
  enhance(content: string, opts: { conversationId?: string }): string[]; // returns 1+ strings
}

export interface IdGenerator {
  uuid(): string;
}

export interface Clock {
  now(): number; // ms
  iso(dateMs?: number): string; // ISO string
}

export interface CostCalculator {
  estimate(model: string, usage?: UsageData): number | undefined;
}

// Configuration for the orchestrator
export type AgentConfig = {
  id: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  model: string;
  enabledTools?: string[]; // names
  maxToolConcurrency?: number;
};

// Eventing for orchestrator external communication
export type AgentEvent =
  | {
      type: 'message_started';
      conversationId: string;
      messageId: string;
      userContent: string;
      enhanced: string[];
      toolNames: string[];
    }
  | {
      type: 'tool_calls';
      conversationId: string;
      messageId: string;
      toolCalls: ToolCall[];
    }
  | {
      type: 'tool_result';
      conversationId: string;
      messageId: string;
      result: ToolExecutionResult;
    }
  | {
    type: 'assistant_message';
    conversationId: string;
    messageId: string;
    content: string | null;
  }
  | {
      type: 'memory_appended';
      conversationId: string;
      delta: Message[];
    }
  | {
      type: 'done';
      conversationId: string;
      messageId: string;
      responseTimeMs: number;
      usage?: UsageData;
    }
  | {
      type: 'error';
      conversationId: string;
      messageId?: string;
      error: string;
    };

export interface EventPort {
  emit(event: AgentEvent): void | Promise<void>;
}
