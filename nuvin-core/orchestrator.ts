import type {
  AgentConfig,
  ChatMessage,
  Clock,
  CompletionParams,
  CompletionResult,
  ContextBuilder,
  CostCalculator,
  IdGenerator,
  LLMPort,
  MemoryPort,
  Message,
  MessageResponse,
  RemindersPort,
  SendMessageOptions,
  ToolExecutionResult,
  ToolInvocation,
  ToolPort,
  ToolCall,
} from './ports';

export class AgentOrchestrator {
  constructor(
    private cfg: AgentConfig,
    private deps: {
      memory: MemoryPort<Message>;
      llm: LLMPort;
      tools: ToolPort;
      context: ContextBuilder;
      ids: IdGenerator;
      clock: Clock;
      cost: CostCalculator;
      reminders: RemindersPort;
      events?: import('./ports').EventPort;
    },
  ) {}

  async send(content: string, opts: SendMessageOptions = {}): Promise<MessageResponse> {
    const convo = opts.conversationId ?? 'default';
    const t0 = this.deps.clock.now();
    const msgId = this.deps.ids.uuid();

    // Enhance content (system reminders)
    const enhanced = this.deps.reminders.enhance(content, { conversationId: convo });

    // Build provider messages
    const history = await this.deps.memory.get(convo);
    const providerMsgs = this.deps.context.toProviderMessages(history, this.cfg.systemPrompt, enhanced);

    // Prepare tool defs
    const toolDefs = this.deps.tools.getToolDefinitions(this.cfg.enabledTools ?? []);
    const toolNames = toolDefs.map((t) => t.function.name);

    // Emit start
    await this.deps.events?.emit({
      type: 'message_started',
      conversationId: convo,
      messageId: msgId,
      userContent: content,
      enhanced,
      toolNames,
    });

    const params: CompletionParams = {
      messages: providerMsgs,
      model: this.cfg.model,
      temperature: this.cfg.temperature,
      maxTokens: this.cfg.maxTokens,
      topP: this.cfg.topP,
      tools: toolDefs.length ? toolDefs : undefined,
      tool_choice: toolDefs.length ? 'auto' : 'none',
    };

    let result: CompletionResult = await this.deps.llm.generateCompletion(params);
    const allToolResults: ToolExecutionResult[] = [];
    let depth = 0;
    const maxDepth = 10;
    const accumulatedMessages: ChatMessage[] = [...providerMsgs];
    const turnHistory: Message[] = [];

    console.debug('[orchestrator] LLM result:', result);

    // Tool-calling loop
    while (result.tool_calls?.length && depth < maxDepth) {
      await this.deps.events?.emit({ type: 'tool_calls', conversationId: convo, messageId: msgId, toolCalls: result.tool_calls });
      const invocations = this.toInvocations(result.tool_calls);
      const toolResults = await this.deps.tools.executeToolCalls(
        invocations,
        { conversationId: convo, agentId: this.cfg.id },
        this.cfg.maxToolConcurrency ?? 3,
      );
      allToolResults.push(...toolResults);

      // Append assistant-with-tool_calls and tool outputs
      accumulatedMessages.push({ role: 'assistant', content: result.content ?? null, tool_calls: result.tool_calls });
      turnHistory.push({ id: this.deps.ids.uuid(), role: 'assistant', content: result.content ?? null, timestamp: this.deps.clock.iso(), tool_calls: result.tool_calls });
      for (const tr of toolResults) {
        const content = tr.status === 'error' ? String(tr.result) : typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result);
        accumulatedMessages.push({ role: 'tool', content, tool_call_id: tr.id, name: tr.name });
        turnHistory.push({ id: tr.id, role: 'tool', content, timestamp: this.deps.clock.iso(), tool_call_id: tr.id, name: tr.name });
        await this.deps.events?.emit({ type: 'tool_result', conversationId: convo, messageId: msgId, result: tr });
      }

      // Follow-up completion
      result = await this.deps.llm.generateCompletion({ ...params, messages: accumulatedMessages });
      depth++;
    }

    const t1 = this.deps.clock.now();
    const timestamp = this.deps.clock.iso();

    // Update memory: add user + assistant; tool messages optional for demo
    const newHistory: Message[] = [];
    for (const u of enhanced) {
      newHistory.push({ id: this.deps.ids.uuid(), role: 'user', content: u, timestamp });
    }
    // Persist the exact assistant tool_calls and tool outputs sequence from this turn
    for (const m of turnHistory) newHistory.push({ ...m, timestamp });
    newHistory.push({ id: msgId, role: 'assistant', content: result.content, timestamp });
    await this.deps.events?.emit({ type: 'assistant_message', conversationId: convo, messageId: msgId, content: result.content });

    // Build response
    const resp: MessageResponse = {
      id: msgId,
      content: result.content,
      role: 'assistant',
      timestamp,
      metadata: {
        model: this.cfg.model,
        provider: 'echo',
        agentId: this.cfg.id,
        responseTime: t1 - t0,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
        estimatedCost: this.deps.cost.estimate(this.cfg.model, result.usage),
        toolCalls: allToolResults.length,
      },
    };


    await this.deps.memory.append(convo, newHistory);
    await this.deps.events?.emit({ type: 'memory_appended', conversationId: convo, delta: newHistory });

    await this.deps.events?.emit({ type: 'done', conversationId: convo, messageId: msgId, responseTimeMs: t1 - t0, usage: result.usage });

    return resp;
  }

  private toInvocations(toolCalls: ToolCall[]): ToolInvocation[] {
    const out: ToolInvocation[] = [];
    for (const tc of toolCalls) {
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        args = {};
      }
      out.push({ id: tc.id, name: tc.function.name, parameters: args });
    }
    return out;
  }
}
