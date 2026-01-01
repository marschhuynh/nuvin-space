import {
  type AgentConfig,
  type AgentEvent,
  type ChatMessage,
  type Clock,
  type CompletionParams,
  type CompletionResult,
  type ContextBuilder,
  type CostCalculator,
  type IdGenerator,
  type LLMPort,
  type MemoryPort,
  type Message,
  type MessageContent,
  type MessageContentPart,
  type MessageResponse,
  type MetricsPort,
  type RemindersPort,
  type SendMessageOptions,
  type ToolExecutionResult,
  type ToolPort,
  type ToolCall,
  type UserAttachment,
  type UserMessagePayload,
  type ToolApprovalDecision,
  type EventPort,
  type UsageData,
  AgentEventTypes,
  MessageRoles,
  ErrorReason,
} from './ports.js';
import { NoopMetricsPort } from './metrics.js';
import { SystemClock } from './clock.js';
import { SimpleId } from './id.js';
import { SimpleCost } from './cost.js';
import { NoopReminders } from './reminders.js';
import { SimpleContextBuilder } from './context.js';
import { NoopEventPort } from './events.js';
import { convertToolCallsWithErrorHandling } from './tools/tool-call-converter.js';

type AssistantChunkEvent = Extract<AgentEvent, { type: typeof AgentEventTypes.AssistantChunk }>;
type AssistantMessageEvent = Extract<AgentEvent, { type: typeof AgentEventTypes.AssistantMessage }>;
type StreamFinishEvent = Extract<AgentEvent, { type: typeof AgentEventTypes.StreamFinish }>;

const removeAttachmentTokens = (value: string, attachments: UserAttachment[]): string => {
  return attachments.reduce((acc, attachment) => {
    if (!attachment.token) return acc;
    return acc.split(attachment.token).join('');
  }, value);
};

const makeImagePart = (attachment: UserAttachment): MessageContentPart => {
  const altText = attachment.altText ?? (attachment.name ? `Image attachment: ${attachment.name}` : undefined);
  return {
    type: 'image',
    data: attachment.data,
    mimeType: attachment.mimeType,
    altText,
    source: attachment.source,
    name: attachment.name,
  };
};

const buildMessageParts = (text: string, attachments: UserAttachment[]): MessageContentPart[] => {
  if (attachments.length === 0) {
    return text ? [{ type: 'text', text }] : [];
  }

  let remainder = text;
  const parts: MessageContentPart[] = [];
  const deferred: UserAttachment[] = [];

  for (const attachment of attachments) {
    const token = attachment.token;
    if (!token) {
      deferred.push(attachment);
      continue;
    }

    const idx = remainder.indexOf(token);
    if (idx === -1) {
      deferred.push(attachment);
      continue;
    }

    const before = removeAttachmentTokens(remainder.slice(0, idx), attachments);
    if (before.length > 0) {
      parts.push({ type: 'text', text: before });
    }

    parts.push(makeImagePart(attachment));
    remainder = remainder.slice(idx + token.length);
  }

  const tail = removeAttachmentTokens(remainder, attachments);
  if (tail.length > 0) {
    parts.push({ type: 'text', text: tail });
  }

  for (const attachment of deferred) {
    parts.push(makeImagePart(attachment));
  }

  return parts;
};

const resolveDisplayText = (text: string, attachments: UserAttachment[], provided?: string): string => {
  if (provided && provided.trim().length > 0) {
    return provided;
  }

  let result = text;
  attachments.forEach((attachment, index) => {
    const label = attachment.name ?? attachment.altText ?? `image-${index + 1}`;
    const marker = `[image:${label}]`;
    if (attachment.token && result.includes(attachment.token)) {
      result = result.split(attachment.token).join(marker);
    } else {
      result = result.length > 0 ? `${result} ${marker}` : marker;
    }
  });
  return result;
};

type ToolApprovalResult = ToolCall[] | { editInstruction: string };

export class AgentOrchestrator {
  private pendingApprovals = new Map<
    string,
    { resolve: (result: ToolApprovalResult) => void; reject: (error: Error) => void }
  >();

  private context: ContextBuilder = new SimpleContextBuilder();
  private ids: IdGenerator = new SimpleId();
  private clock: Clock = new SystemClock();
  private cost: CostCalculator = new SimpleCost();
  private reminders: RemindersPort = new NoopReminders();
  // private llm: LLMPort;
  private metrics: MetricsPort = new NoopMetricsPort();
  private events?: EventPort = new NoopEventPort();
  private llm?: LLMPort;
  private tools: ToolPort;
  private memory: MemoryPort<Message>;

  constructor(
    private cfg: AgentConfig,
    deps: {
      memory: MemoryPort<Message>;
      tools: ToolPort;
      context?: ContextBuilder;
      ids?: IdGenerator;
      clock?: Clock;
      cost?: CostCalculator;
      reminders?: RemindersPort;
      llm?: LLMPort;
      metrics?: MetricsPort;
      events?: EventPort;
    },
  ) {
    this.memory = deps.memory;
    this.tools = deps.tools;
    this.llm = deps.llm;
    this.context = deps.context ?? this.context;
    this.ids = deps.ids ?? this.ids;
    this.clock = deps.clock ?? this.clock;
    this.cost = deps.cost ?? this.cost;
    this.reminders = deps.reminders ?? this.reminders;
    this.metrics = deps.metrics ?? this.metrics;
    this.events = deps.events ?? this.events;
  }

  /**
   * Updates the agent configuration dynamically after initialization.
   * This allows for runtime changes to model, provider, and other settings.
   */
  public updateConfig(newConfig: Partial<AgentConfig>): void {
    this.cfg = { ...this.cfg, ...newConfig };
  }

  /**
   * Updates the LLM provider without reinitializing the entire orchestrator.
   * This preserves conversation history, MCP connections, and other state.
   */
  public setLLM(newLLM: LLMPort): void {
    this.llm = newLLM;
  }

  /**
   * Updates the tool port without reinitializing the entire orchestrator.
   * This preserves conversation history and other state while adding/removing tools.
   */
  public setTools(newTools: ToolPort): void {
    this.tools = newTools;
  }

  /**
   * Gets the current tool port.
   */
  public getTools(): ToolPort {
    return this.tools;
  }

  /**
   * Gets the current LLM port.
   */
  public getLLM(): LLMPort | undefined {
    return this.llm;
  }

  /**
   * Gets the current agent configuration.
   */
  public getConfig(): AgentConfig {
    return this.cfg;
  }

  /**
   * Updates the memory port without reinitializing the entire orchestrator.
   * This allows starting a new conversation session while preserving LLM connections,
   * MCP servers, and other state.
   */
  public setMemory(newMemory: MemoryPort<Message>): void {
    this.memory = newMemory;
  }

  /**
   * Updates the event port without reinitializing the entire orchestrator.
   * This is useful when switching to a new session with a different event log file.
   */
  public setEvents(newEvents: import('./ports.js').EventPort): void {
    this.events = newEvents;
  }

  /**
   * Updates the metrics port without reinitializing the entire orchestrator.
   */
  public setMetrics(newMetrics: MetricsPort): void {
    this.metrics = newMetrics;
  }

  /**
   * Gets the current metrics port.
   */
  public getMetrics(): MetricsPort | undefined {
    return this.metrics;
  }

  /**
   * Determines if a tool should bypass approval requirements.
   * Read-only tools and todo management tools are auto-approved.
   */
  private shouldBypassApproval(toolName: string): boolean {
    const readOnlyTools = ['file_read', 'ls_tool', 'web_search', 'web_fetch', 'glob_tool', 'grep_tool'];
    const todoTools = ['todo_write', 'todo_read'];
    return readOnlyTools.includes(toolName) || todoTools.includes(toolName);
  }

  private async handleToolDenial(
    denialMessage: string,
    conversationId: string,
    messageId: string,
    accumulatedMessages: ChatMessage[],
    turnHistory: Message[],
    originalToolCalls: ToolCall[],
    assistantContent: string | null,
    usage?: UsageData,
    bypassToolCalls?: ToolCall[],
    bypassResults?: ToolExecutionResult[],
  ): Promise<void> {
    // Include both denied and bypass tool calls in assistant message
    const allToolCalls = [...originalToolCalls, ...(bypassToolCalls || [])];

    const assistantMsg: Message = {
      id: this.ids.uuid(),
      role: 'assistant',
      content: assistantContent ?? null,
      timestamp: this.clock.iso(),
      tool_calls: allToolCalls,
      usage,
    };

    accumulatedMessages.push({
      role: 'assistant',
      content: assistantContent ?? null,
      tool_calls: allToolCalls,
    });
    turnHistory.push(assistantMsg);

    const toolResultMsgs: Message[] = [];
    for (const toolCall of originalToolCalls) {
      const toolDenialResult = 'Tool execution denied by user';

      accumulatedMessages.push({
        role: 'tool',
        content: toolDenialResult,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });

      const toolMsg: Message = {
        id: toolCall.id,
        role: 'tool',
        content: toolDenialResult,
        timestamp: this.clock.iso(),
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        status: 'error',
        durationMs: 0,
        metadata: { errorReason: ErrorReason.Denied },
      };
      turnHistory.push(toolMsg);
      toolResultMsgs.push(toolMsg);

      await this.events?.emit({
        type: AgentEventTypes.ToolResult,
        conversationId,
        messageId,
        result: {
          id: toolCall.id,
          name: toolCall.function.name,
          status: 'error',
          type: 'text',
          result: toolDenialResult,
          durationMs: 0,
          metadata: { errorReason: ErrorReason.Denied },
        },
      });
    }

    // Add bypass tool results (successful executions)
    const bypassToolResultMsgs: Message[] = [];
    if (bypassResults) {
      for (const tr of bypassResults) {
        let contentStr: string;
        if (tr.status === 'error') {
          contentStr = tr.result as string;
        } else if (tr.type === 'text') {
          contentStr = tr.result as string;
        } else {
          contentStr = JSON.stringify(tr.result, null, 2);
        }

        bypassToolResultMsgs.push({
          id: tr.id,
          role: 'tool',
          content: contentStr,
          timestamp: this.clock.iso(),
          tool_call_id: tr.id,
          name: tr.name,
          status: tr.status,
          durationMs: tr.durationMs,
          metadata: tr.metadata,
        });
      }
    }

    await this.memory.append(conversationId, [assistantMsg, ...toolResultMsgs, ...bypassToolResultMsgs]);

    await this.events?.emit({
      type: AgentEventTypes.AssistantMessage,
      conversationId,
      messageId,
      content: denialMessage,
      usage: undefined,
    });
  }

  private async processToolApproval(
    toolCalls: ToolCall[],
    conversationId: string,
    messageId: string,
    accumulatedMessages: ChatMessage[],
    turnHistory: Message[],
    assistantContent: string | null,
    usage?: UsageData,
    signal?: AbortSignal,
  ): Promise<{ approvedCalls: ToolCall[]; bypassCalls: ToolCall[]; bypassResults: ToolExecutionResult[]; wasDenied: boolean; denialMessage?: string }> {
    if (this.cfg.requireToolApproval === false) {
      return { approvedCalls: toolCalls, bypassCalls: [], bypassResults: [], wasDenied: false };
    }

    const callsNeedingApproval = toolCalls.filter((call) => !this.shouldBypassApproval(call.function.name));
    const callsToAutoApprove = toolCalls.filter((call) => this.shouldBypassApproval(call.function.name));

    if (callsNeedingApproval.length === 0) {
      return { approvedCalls: callsToAutoApprove, bypassCalls: [], bypassResults: [], wasDenied: false };
    }

    // Execute bypass (read-only) tools in parallel while waiting for approval
    const executeBypassTools = async (): Promise<ToolExecutionResult[]> => {
      if (callsToAutoApprove.length === 0) return [];
      
      const availableTools = this.getAvailableToolNames();
      const conversionResult = convertToolCallsWithErrorHandling(callsToAutoApprove, {
        strict: this.cfg.strictToolValidation ?? false,
        availableTools,
      });
      
      const results = await this.tools.executeToolCalls(
        conversionResult.invocations,
        {
          conversationId,
          agentId: this.cfg.id,
          messageId,
          eventPort: this.events,
        },
        this.cfg.maxToolConcurrency ?? 3,
        signal,
      );
      
      // Emit tool results for bypass tools
      for (const tr of results) {
        await this.events?.emit({
          type: AgentEventTypes.ToolResult,
          conversationId,
          messageId,
          result: tr,
        });
      }
      
      return results;
    };


    // Execute bypass (read-only) tools immediately, before waiting for approval
    let bypassResults: ToolExecutionResult[] = [];
    if (callsToAutoApprove.length > 0) {
      bypassResults = await executeBypassTools();
    }

    try {
      // Wait for approval of non-bypass tools
      const approvalResult = await this.waitForToolApproval(callsNeedingApproval, conversationId, messageId);

      if ('editInstruction' in approvalResult) {
        const editInstruction = approvalResult.editInstruction;
        // Only apply edit to non-bypass tools (bypass already executed)
        const editedCalls = callsNeedingApproval.map((call) => ({
          ...call,
          editInstruction,
        }));
        return { approvedCalls: editedCalls, bypassCalls: callsToAutoApprove, bypassResults, wasDenied: false };
      }

      return { approvedCalls: approvalResult, bypassCalls: callsToAutoApprove, bypassResults, wasDenied: false };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Tool approval failed';
      const denialMessage = `Tool execution was not approved: ${errorMsg}`;

      // Only deny the tools that needed approval - bypass tools already executed successfully
      await this.handleToolDenial(
        denialMessage,
        conversationId,
        messageId,
        accumulatedMessages,
        turnHistory,
        callsNeedingApproval,  // Only deny non-bypass tools
        assistantContent,  
        usage,
        callsToAutoApprove,  // Include bypass tool calls
        bypassResults,  // Include bypass results
      );

      // Return bypass results even though approval was denied - they executed successfully
      return { approvedCalls: [], bypassCalls: callsToAutoApprove, bypassResults, wasDenied: true, denialMessage };
    }
  }

  async send(content: UserMessagePayload, opts: SendMessageOptions = {}): Promise<MessageResponse> {
    const convo = opts.conversationId ?? 'default';
    const t0 = this.clock.now();
    const msgId = this.ids.uuid();

    const history = await this.memory.get(convo);
    let providerMsgs: ChatMessage[];
    let userMessages: Message[];
    let userDisplay: string;
    let enhanced: string[];

    const _llm = this.getLLM();
    if (!_llm) {
      throw new Error('LLM provider not set');
    }

    const normalized =
      typeof content === 'string'
        ? { text: content, displayText: content, attachments: [] as UserAttachment[] }
        : {
            text: content.text ?? '',
            displayText: content.displayText,
            attachments: Array.isArray(content.attachments) ? content.attachments : [],
          };

    const attachments = normalized.attachments;
    enhanced = this.reminders.enhance(normalized.text, { conversationId: convo });
    const enhancedCombined = enhanced.join('\n');
    const messageParts = buildMessageParts(enhancedCombined, attachments);

    let userContent: MessageContent;
    if (attachments.length > 0 || messageParts.some((part) => part.type === 'image')) {
      userContent = { type: 'parts', parts: messageParts };
    } else if (messageParts.length === 1 && messageParts[0]?.type === 'text') {
      userContent = messageParts[0].text;
    } else if (messageParts.length > 0) {
      userContent = { type: 'parts', parts: messageParts };
    } else {
      userContent = enhancedCombined;
    }

    providerMsgs = this.context.toProviderMessages(history, this.cfg.systemPrompt, [userContent]);

    userDisplay = resolveDisplayText(normalized.text, attachments, normalized.displayText);
    const userTimestamp = this.clock.iso();
    userMessages = [{ id: this.ids.uuid(), role: 'user', content: userContent, timestamp: userTimestamp }];

    await this.memory.append(convo, userMessages);

    if (opts.signal?.aborted) throw new Error('Aborted');

    const toolDefs = this.tools.getToolDefinitions(this.cfg.enabledTools ?? []);
    const toolNames = toolDefs.map((t) => t.function.name);

    await this.events?.emit({
      type: AgentEventTypes.MessageStarted,
      conversationId: convo,
      messageId: msgId,
      userContent: userDisplay,
      enhanced,
      toolNames,
    });

    const reasoningParam = this.cfg.reasoningEffort ? { effort: this.cfg.reasoningEffort } : undefined;

    const params: CompletionParams = {
      messages: providerMsgs,
      model: this.cfg.model,
      temperature: this.cfg.temperature,
      maxTokens: this.cfg.maxTokens,
      topP: this.cfg.topP,
      tools: toolDefs.length ? toolDefs : undefined,
      tool_choice: toolDefs.length ? 'auto' : 'none',
      reasoning: reasoningParam,
    };

    let streamedAssistantContent = '';
    const allToolResults: ToolExecutionResult[] = [];
    const accumulatedMessages: ChatMessage[] = [...providerMsgs];
    const turnHistory: Message[] = [];
    let result: CompletionResult;
    let toolApprovalDenied = false;
    let denialMessage = '';
    let finalResponseSaved = false;

    if (opts.stream && typeof _llm.streamCompletion === 'function') {
      let isFirstChunk = true;
      result = await _llm.streamCompletion(
        params,
        {
          onChunk: async (delta: string, usage?: UsageData) => {
            streamedAssistantContent += delta;
            const cleanDelta = isFirstChunk ? delta.replace(/^\n+/, '') : delta;
            isFirstChunk = false;
            const chunkEvent: AssistantChunkEvent = {
              type: AgentEventTypes.AssistantChunk,
              conversationId: convo,
              messageId: msgId,
              delta: cleanDelta,
              ...(usage && { usage }),
            };
            await this.events?.emit(chunkEvent);
          },
          onReasoningChunk: async (delta: string) => {
            await this.events?.emit({
              type: AgentEventTypes.ReasoningChunk,
              conversationId: convo,
              messageId: msgId,
              delta,
            });
          },
          onStreamFinish: async (finishReason?: string, usage?: UsageData) => {
            if (usage) {
              const cost = this.cost.estimate(this.cfg.model, usage);
              this.metrics?.recordLLMCall?.(usage, cost);
            }
            const finishEvent: StreamFinishEvent = {
              type: AgentEventTypes.StreamFinish,
              conversationId: convo,
              messageId: msgId,
              ...(finishReason && { finishReason }),
              ...(usage && { usage }),
            };
            await this.events?.emit(finishEvent);
          },
        },
        opts.signal,
      );
    } else {
      result = await _llm.generateCompletion(params, opts.signal);
      if (result.usage) {
        const cost = this.cost.estimate(this.cfg.model, result.usage);
        this.metrics?.recordLLMCall?.(result.usage, cost);
      }
    }

    if (!result.tool_calls?.length && result.content && !finalResponseSaved) {
      const content = opts.stream ? streamedAssistantContent : result.content;

      const assistantMsg: Message = {
        id: msgId,
        role: 'assistant',
        content,
        timestamp: this.clock.iso(),
        usage: result.usage,
      };
      await this.memory.append(convo, [assistantMsg]);
      finalResponseSaved = true;

      // Emit AssistantMessage for both streaming and non-streaming
      // This signals the UI to finalize rendering and enable markdown
      if (content.trim()) {
        const messageEvent: AssistantMessageEvent = {
          type: AgentEventTypes.AssistantMessage,
          conversationId: convo,
          messageId: msgId,
          content,
          ...(result.usage && { usage: result.usage }),
        };
        await this.events?.emit(messageEvent);
      }
    }

    while (result.tool_calls?.length) {
      // Emit the assistant message along with the tool call
      if (result.content?.trim()) {
        const messageEvent: AssistantMessageEvent = {
          type: AgentEventTypes.AssistantMessage,
          conversationId: convo,
          messageId: msgId,
          content: result.content,
          ...(result.usage && { usage: result.usage }),
        };
        await this.events?.emit(messageEvent);
      }

      if (opts.signal?.aborted) throw new Error('Aborted');

      await this.events?.emit({
        type: AgentEventTypes.ToolCalls,
        conversationId: convo,
        messageId: msgId,
        toolCalls: result.tool_calls,
        usage: result.usage,
      });

      const approvalResult = await this.processToolApproval(
        result.tool_calls,
        convo,
        msgId,
        accumulatedMessages,
        turnHistory,
        result.content,
        result.usage,
        opts.signal,
      );

      if (approvalResult.wasDenied) {
        denialMessage = approvalResult.denialMessage || '';
        toolApprovalDenied = true;
        break;
      }

      const approvedCalls = approvalResult.approvedCalls;
      const bypassCalls = approvalResult.bypassCalls;
      const bypassResults = approvalResult.bypassResults;
      const availableTools = this.getAvailableToolNames();
      const conversionResult = convertToolCallsWithErrorHandling(approvedCalls, {
        strict: this.cfg.strictToolValidation ?? false,
        availableTools,
      });

      const validationErrors: ToolExecutionResult[] = [];
      const validInvocations = conversionResult.invocations;

      if (conversionResult.errors) {
        for (const err of conversionResult.errors) {
          validationErrors.push({
            id: err.id,
            name: err.name,
            status: 'error',
            type: 'text',
            result: `Tool call validation failed (${err.errorType}): ${err.error}`,
            metadata: { errorReason: ErrorReason.ValidationFailed },
            durationMs: 0,
          });
        }
      }

      if (opts.signal?.aborted) throw new Error('Aborted');

      const executionToolResults = await this.tools.executeToolCalls(
        validInvocations,
        {
          conversationId: convo,
          agentId: this.cfg.id,
          messageId: msgId,
          eventPort: this.events,
        },
        this.cfg.maxToolConcurrency ?? 3,
        opts.signal,
      );

      // Merge bypass results (pre-executed) with approved tool results
      const allToolResults = [...bypassResults, ...validationErrors, ...executionToolResults];

      // Include both approved and bypass calls for complete history
      const allToolCalls = [...approvedCalls, ...bypassCalls];

      const assistantMsg: Message = {
        id: this.ids.uuid(),
        role: 'assistant',
        content: result.content ?? null,
        timestamp: this.clock.iso(),
        tool_calls: allToolCalls,
        usage: result.usage,
      };

      const toolResultMsgs: Message[] = [];
      for (const tr of allToolResults) {
        let contentStr: string;
        if (tr.status === 'error') {
          contentStr = tr.result as string;
        } else if (tr.type === 'text') {
          contentStr = tr.result as string;
        } else {
          contentStr = JSON.stringify(tr.result, null, 2);
        }

        toolResultMsgs.push({
          id: tr.id,
          role: 'tool',
          content: contentStr,
          timestamp: this.clock.iso(),
          tool_call_id: tr.id,
          name: tr.name,
          status: tr.status,
          durationMs: tr.durationMs,
          metadata: tr.metadata,
        });

        this.metrics?.recordToolCall?.();

        // Only emit ToolResult for non-bypass tools (bypass already emitted in processToolApproval)
        const isBypassResult = bypassResults.some(br => br.id === tr.id);
        if (!isBypassResult) {
          await this.events?.emit({
            type: AgentEventTypes.ToolResult,
            conversationId: convo,
            messageId: msgId,
            result: tr,
          });
        }
      }

      await this.memory.append(convo, [assistantMsg, ...toolResultMsgs]);

      const { usage: _usage, ...extraField } = result;
      // TODO: revisit the logic here
      accumulatedMessages.push({
        ...extraField,
        role: 'assistant',
        content: result.content ?? null,
        tool_calls: allToolCalls,
      });
      for (const tr of allToolResults) {
        let contentStr: string;
        if (tr.status === 'error') {
          contentStr = tr.result as string;
        } else if (tr.type === 'text') {
          contentStr = tr.result as string;
        } else {
          contentStr = JSON.stringify(tr.result, null, 2);
        }
        accumulatedMessages.push({ role: 'tool', content: contentStr, tool_call_id: tr.id, name: tr.name });
      }

      if (opts.signal?.aborted) throw new Error('Aborted');

      streamedAssistantContent = '';

      if (opts.stream && typeof _llm.streamCompletion === 'function') {
        let isFirstChunk = true;
        result = await _llm.streamCompletion(
          { ...params, messages: accumulatedMessages },
          {
            onChunk: async (delta: string, usage?: UsageData) => {
              streamedAssistantContent += delta;
              const cleanDelta = isFirstChunk ? delta.replace(/^\n+/, '') : delta;
              isFirstChunk = false;
              const chunkEvent: AssistantChunkEvent = {
                type: AgentEventTypes.AssistantChunk,
                conversationId: convo,
                messageId: msgId,
                delta: cleanDelta,
                ...(usage && { usage }),
              };
              await this.events?.emit(chunkEvent);
            },
            onReasoningChunk: async (delta: string) => {
              await this.events?.emit({
                type: AgentEventTypes.ReasoningChunk,
                conversationId: convo,
                messageId: msgId,
                delta,
              });
            },
            onStreamFinish: async (finishReason?: string, usage?: UsageData) => {
              if (usage) {
                const cost = this.cost.estimate(this.cfg.model, usage);
                this.metrics?.recordLLMCall?.(usage, cost);
              }
              const finishEvent: StreamFinishEvent = {
                type: AgentEventTypes.StreamFinish,
                conversationId: convo,
                messageId: msgId,
                ...(finishReason && { finishReason }),
                ...(usage && { usage }),
              };
              await this.events?.emit(finishEvent);
            },
          },
          opts.signal,
        );
      } else {
        result = await _llm.generateCompletion({ ...params, messages: accumulatedMessages }, opts.signal);
        if (result.usage) {
          const cost = this.cost.estimate(this.cfg.model, result.usage);
          this.metrics?.recordLLMCall?.(result.usage, cost);
        }
      }

      if (!result.tool_calls?.length && result.content && !finalResponseSaved) {
        const content = opts.stream ? streamedAssistantContent : result.content;
        const assistantMsg: Message = {
          id: msgId,
          role: 'assistant',
          content,
          timestamp: this.clock.iso(),
          usage: result.usage,
        };
        await this.memory.append(convo, [assistantMsg]);
        finalResponseSaved = true;

        // Emit AssistantMessage for both streaming and non-streaming
        // This signals the UI to finalize rendering and enable markdown
        if (content.trim()) {
          const messageEvent: AssistantMessageEvent = {
            type: AgentEventTypes.AssistantMessage,
            conversationId: convo,
            messageId: msgId,
            content,
            ...(result.usage && { usage: result.usage }),
          };
          await this.events?.emit(messageEvent);
        }
      }
    }

    const t1 = this.clock.now();
    const timestamp = this.clock.iso();

    this.metrics?.recordRequestComplete?.(t1 - t0);

    const shouldEmitFinalMessage = result.content?.trim() && !toolApprovalDenied && !finalResponseSaved;

    if (shouldEmitFinalMessage) {
      const messageEvent: AssistantMessageEvent = {
        type: AgentEventTypes.AssistantMessage,
        conversationId: convo,
        messageId: msgId,
        content: result.content,
        ...(result.usage && { usage: result.usage }),
      };
      await this.events?.emit(messageEvent);
    }

    const responseContent = toolApprovalDenied ? denialMessage : result.content;

    const resp: MessageResponse = {
      id: msgId,
      content: responseContent,
      role: MessageRoles.Assistant,
      timestamp,
      metadata: {
        model: this.cfg.model,
        provider: 'echo',
        agentId: this.cfg.id,
        responseTime: t1 - t0,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
        estimatedCost: this.cost.estimate(this.cfg.model, result.usage),
        toolCalls: allToolResults.length,
      },
    };

    await this.events?.emit({
      type: AgentEventTypes.Done,
      conversationId: convo,
      messageId: msgId,
      responseTimeMs: t1 - t0,
      usage: result.usage,
    });

    return resp;
  }

  private async waitForToolApproval(
    toolCalls: ToolCall[],
    conversationId: string,
    messageId: string,
  ): Promise<ToolApprovalResult> {
    const approvalId = this.ids.uuid();

    return new Promise((resolve, reject) => {
      this.pendingApprovals.set(approvalId, { resolve, reject });

      this.events?.emit({
        type: AgentEventTypes.ToolApprovalRequired,
        conversationId,
        messageId,
        toolCalls,
        approvalId,
      });
    });
  }

  public handleToolApproval(
    approvalId: string,
    decision: ToolApprovalDecision,
    approvedCalls?: ToolCall[],
    editInstruction?: string,
  ): void {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      console.warn(`[Orchestrator] Received approval for unknown or already processed ID: ${approvalId}`);
      return;
    }

    this.pendingApprovals.delete(approvalId);

    if (decision === 'deny') {
      approval.reject(new Error('Tool execution denied by user'));
    } else if (decision === 'edit' && editInstruction) {
      approval.resolve({ editInstruction });
    } else if (decision === 'approve_all' || decision === 'approve') {
      approval.resolve(approvedCalls || []);
    } else {
      approval.reject(new Error(`Invalid approval decision: ${decision}`));
    }
  }

  private getAvailableToolNames(): Set<string> {
    const toolDefs = this.tools.getToolDefinitions(this.cfg.enabledTools ?? []);
    return new Set(toolDefs.map((t) => t.function.name));
  }
}
