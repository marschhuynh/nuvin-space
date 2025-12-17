// Core orchestrator and context
export { AgentOrchestrator } from './orchestrator.js';
export { SimpleContextBuilder } from './context.js';

// Runtime and environment
export { RuntimeEnv } from './runtime-env.js';

// Prompt utilities
export { renderTemplate, buildInjectedSystem } from './prompt-utils.js';
export { AGENT_CREATOR_SYSTEM_PROMPT, buildAgentCreationPrompt } from './prompts/agent-creator-prompt.js';
export { generateFolderTree } from './folder-tree-utils.js';
export type { FolderTreeOptions } from './folder-tree-utils.js';

// Memory and persistence
export { InMemoryMemory, PersistedMemory, JsonFileMemoryPersistence } from './persistent/index.js';
export { InMemoryMetadata, MemoryPortMetadataAdapter } from './persistent/metadata-memory.js';
export { ConversationStore } from './conversation-store.js';
export { ConversationContext } from './conversation-context.js';
export type { Conversation, ConversationMetadata, ConversationSnapshot } from './conversation-store.js';

// Metrics Port
export { NoopMetricsPort, InMemoryMetricsPort, createEmptySnapshot } from './metrics.js';
export type { MetricsChangeHandler } from './metrics.js';
export type { MetricsPort, MetricsSnapshot, UsageData } from './ports.js';

// Ports and types
export type {
  Message,
  MessageContent,
  MessageContentPart,
  MemoryPort,
  MetadataPort,
  LLMPort,
  LLMFactory,
  LLMConfig,
  AgentEvent,
  ToolCall,
  ToolExecutionResult,
  UserAttachment,
  UserMessagePayload,
  ToolApprovalDecision,
  SendMessageOptions,
  AgentAwareToolPort,
  OrchestratorAwareToolPort,
} from './ports.js';
export { AgentEventTypes, ToolPort, AgentConfig, ErrorReason } from './ports.js';

// Core services
export { SimpleId } from './id.js';
export { SystemClock } from './clock.js';
export { SimpleCost } from './cost.js';
export { NoopReminders } from './reminders.js';

// Tools
export { ToolRegistry } from './tools.js';
export { CompositeToolPort } from './tools-composite.js';
export { BashTool } from './tools/BashTool.js';
export type {
  ExecResult,
  ExecResultSuccess,
  ExecResultError,
  FunctionTool,
  ToolExecutionContext,
} from './tools/types.js';
export type { BashResult, BashSuccessResult, BashErrorResult, BashParams } from './tools/BashTool.js';

// Tool parameters (for parsing and type guards)
export type {
  BashToolArgs,
  FileReadArgs,
  FileEditArgs,
  FileNewArgs,
  DirLsArgs,
  WebSearchArgs,
  WebFetchArgs,
  TodoWriteArgs,
  AssignTaskArgs,
  ToolArguments,
} from './tools/tool-params.js';
export {
  parseToolArguments,
  isBashToolArgs,
  isFileReadArgs,
  isFileEditArgs,
  isFileNewArgs,
  isDirLsArgs,
  isWebSearchArgs,
  isWebFetchArgs,
  isTodoWriteArgs,
  isAssignTaskArgs,
} from './tools/tool-params.js';
export type { ToolParameterMap, ToolName, TypedToolInvocation } from './tools/tool-params.js';
export type { ParseResult } from './tools/tool-call-parser.js';
export { parseJSON } from './tools/tool-call-parser.js';
export type { ValidationResult, ToolValidator } from './tools/tool-validators.js';
export { toolValidators } from './tools/tool-validators.js';
export type { ToolCallValidation } from './tools/tool-call-converter.js';
export { convertToolCall, convertToolCalls } from './tools/tool-call-converter.js';
export type {
  BashToolMetadata,
  FileReadMetadata,
  FileEditMetadata,
  FileNewMetadata,
  DirLsMetadata,
  WebSearchMetadata,
  WebFetchMetadata,
  TodoWriteMetadata,
  AssignTaskMetadata,
  ToolErrorMetadata,
  ToolMetadataMap,
} from './tools/tool-result-metadata.js';
export type { FileReadResult, FileReadSuccessResult, FileReadErrorResult, FileReadParams } from './tools/FileReadTool.js';
export type { FileEditResult, FileEditSuccessResult } from './tools/FileEditTool.js';
export type { FileNewResult, FileNewSuccessResult, FileNewParams } from './tools/FileNewTool.js';
export type { DirLsResult, DirLsSuccessResult, DirLsParams, DirEntry } from './tools/DirLsTool.js';
export type { WebSearchToolResult, WebSearchSuccessResult, WebSearchParams, WebSearchResult } from './tools/WebSearchTool.js';
export type { WebFetchResult, WebFetchSuccessResult, WebFetchParams } from './tools/WebFetchTool.js';
export type { TodoWriteResult, TodoWriteSuccessResult } from './tools/TodoWriteTool.js';
export type { AssignResult, AssignSuccessResult, AssignErrorResult } from './tools/AssignTool.js';
export type {
  FileMetadata,
  LineRangeMetadata,
  CommandMetadata,
  ErrorMetadata,
  DelegationMetadata,
} from './tools/metadata-types.js';
export {
  isSuccess,
  isError,
  isTextResult,
  isJsonResult,
  isSuccessText,
  isSuccessJson,
} from './tools/type-guards.js';
export {
  isBashResult,
  isBashSuccess,
  isFileReadResult,
  isFileReadSuccess,
  isFileEditResult,
  isFileEditSuccess,
  isFileNewResult,
  isFileNewSuccess,
  isDirLsResult,
  isDirLsSuccess,
  isWebSearchResult,
  isWebSearchSuccess,
  isWebFetchResult,
  isWebFetchSuccess,
  isTodoWriteResult,
  isTodoWriteSuccess,
  isAssignResult,
  isAssignSuccess,
} from './tools/tool-type-guards.js';
export { okText, okJson, err } from './tools/result-helpers.js';

// Agent delegation
export { AgentRegistry } from './agent-registry.js';
export { AgentManager } from './agent-manager.js';
export { AgentFilePersistence } from './agent-file-persistence.js';
export type {
  AgentTemplate,
  CompleteAgent,
  SpecialistAgentConfig,
  SpecialistAgentResult,
  AssignParams,
} from './agent-types.js';

// Sub-agent types
export type { SubAgentState, SubAgentToolCall } from './sub-agent-types.js';
export { parseSubAgentToolCallArguments } from './sub-agent-types.js';
export {
  DefaultDelegationService,
  DefaultDelegationPolicy,
  DefaultSpecialistAgentFactory,
  DefaultDelegationResultFormatter,
  AgentManagerCommandRunner,
} from './delegation/index.js';
export type { DelegationService, AgentCatalog, DelegationServiceConfig } from './delegation/index.js';
export { DelegationServiceFactory, LLMResolver } from './delegation/index.js';

// LLM providers
export { GithubLLM, AnthropicAISDKLLM } from './llm-providers/index.js';
export {
  createLLM,
  getAvailableProviders,
  supportsGetModels,
  getProviderLabel,
  type LLMOptions,
} from './llm-providers/index.js';
export {
  normalizeModelLimits,
  normalizeModelInfo,
  deduplicateModels,
  getFallbackLimits,
  type ModelLimits,
  type ModelInfo,
} from './llm-providers/index.js';
export { LLMError } from './llm-providers/base-llm.js';
export type { BaseLLMOptions } from './llm-providers/base-llm.js';

// Transports (for retry configuration)
export { AbortError, RetryTransport, DEFAULT_RETRY_CONFIG } from './transports/index.js';
export type { RetryConfig } from './transports/index.js';
export { isRetryableError, isRetryableStatusCode } from './transports/index.js';

// MCP
export { MCPToolPort, CoreMCPClient } from './mcp/index.js';
export { loadMCPConfig } from './config.js';
export type { MCPConfig, MCPServerConfig } from './config.js';

// Events
export { PersistingConsoleEventPort } from './events.js';

// String utilities
export {
  stripAnsiAndControls,
  normalizeNewlines,
  resolveCarriageReturns,
  resolveBackspaces,
  canonicalizeTerminalPaste,
} from './string-utils.js';
