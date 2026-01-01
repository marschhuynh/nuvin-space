import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../orchestrator.js';
import type {
  LLMPort,
  ToolPort,
  MemoryPort,
  Message,
  ContextBuilder,
  IdGenerator,
  Clock,
  CostCalculator,
  RemindersPort,
  EventPort,
  AgentEvent,
  CompletionResult,
  ToolInvocation,
} from '../ports.js';
import { AgentEventTypes, ErrorReason } from '../ports.js';

describe('AgentOrchestrator - Tool Approval Denial Flow', () => {
  let orchestrator: AgentOrchestrator;
  let mockLLM: LLMPort;
  let mockTools: ToolPort;
  let mockMemory: MemoryPort<Message>;
  let mockContext: ContextBuilder;
  let mockIds: IdGenerator;
  let mockClock: Clock;
  let mockCost: CostCalculator;
  let mockReminders: RemindersPort;
  let mockEvents: EventPort;
  let emittedEvents: AgentEvent[];
  let savedHistory: Message[];

  beforeEach(() => {
    emittedEvents = [];
    savedHistory = [];

    mockMemory = {
      get: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockResolvedValue(undefined),
      append: vi.fn().mockImplementation(async (conversationId: string, messages: Message[]) => {
        savedHistory.push(...messages);
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
      exportSnapshot: vi.fn().mockResolvedValue({}),
      importSnapshot: vi.fn().mockResolvedValue(undefined),
    };

    mockTools = {
      getToolDefinitions: vi.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'file_new',
            description: 'Create a new file',
            parameters: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['file_path', 'content'],
            },
          },
        },
      ]),
      executeToolCalls: vi.fn().mockResolvedValue([
        {
          id: 'call_1',
          name: 'file_new',
          status: 'success',
          type: 'text',
          result: 'File created successfully',
          durationMs: 100,
        },
      ]),
    };

    mockContext = {
      toProviderMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'Create a file test.txt' }]),
    };

    let idCounter = 0;
    mockIds = {
      uuid: vi.fn(() => `id-${idCounter++}`),
    };

    mockClock = {
      now: vi.fn(() => Date.now()),
      iso: vi.fn(() => new Date().toISOString()),
    };

    mockCost = {
      estimate: vi.fn(() => 0.001),
    };

    mockReminders = {
      enhance: vi.fn((content: string) => [content]),
    };

    mockEvents = {
      emit: vi.fn((event: AgentEvent) => {
        emittedEvents.push(event);
        return Promise.resolve();
      }),
    };

    mockLLM = {
      generateCompletion: vi.fn(),
      streamCompletion: vi.fn(),
    };

    orchestrator = new AgentOrchestrator(
      {
        id: 'test-agent',
        systemPrompt: 'Test system prompt',
        model: 'test-model',
        temperature: 0.7,
        topP: 1,
        enabledTools: ['file_new'],
        maxToolConcurrency: 3,
        requireToolApproval: true,
      },
      {
        memory: mockMemory,
        llm: mockLLM,
        tools: mockTools,
        context: mockContext,
        ids: mockIds,
        clock: mockClock,
        cost: mockCost,
        reminders: mockReminders,
        events: mockEvents,
      },
    );
  });

  describe('Single Tool Denial', () => {
    it('should emit ToolApprovalRequired event when LLM requests tools', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent).toMatchObject({
        type: AgentEventTypes.ToolApprovalRequired,
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      });

      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      await sendPromise;
    });

    it('should add complete conversation history when tool is denied', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      await sendPromise;

      expect(savedHistory.length).toBeGreaterThanOrEqual(3);

      expect(savedHistory[0]).toMatchObject({
        role: 'user',
        content: 'Create a file test.txt',
      });

      expect(savedHistory[1]).toMatchObject({
        role: 'assistant',
        content: '',
      });
      expect(savedHistory[1].tool_calls).toBeDefined();
      expect(savedHistory[1].tool_calls).toHaveLength(1);
      expect(savedHistory[1].tool_calls?.[0].function.name).toBe('file_new');

      expect(savedHistory[2]).toMatchObject({
        role: 'tool',
        content: 'Tool execution denied by user',
        tool_call_id: 'call_1',
        name: 'file_new',
        status: 'error',
        metadata: { errorReason: ErrorReason.Denied },
      });
    });

    it('should emit AssistantMessage event with denial message', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      await sendPromise;

      const denialMessages = emittedEvents.filter(
        (e) => e.type === AgentEventTypes.AssistantMessage && e.content?.includes('not approved'),
      );
      expect(denialMessages).toHaveLength(1);
      expect(denialMessages[0].content).toContain('Tool execution was not approved');
      expect(denialMessages[0].content).toContain('Tool execution denied by user');
    });

    it('should return response with denial message as content', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      const response = await sendPromise;

      expect(response.content).toContain('Tool execution was not approved');
      expect(response.content).toContain('Tool execution denied by user');
    });
  });

  describe('Multiple Tool Denials', () => {
    it('should handle multiple consecutive denials correctly', async () => {
      const firstToolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const secondToolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test2.txt', content: 'world' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(firstToolCallResponse)
        .mockResolvedValueOnce(secondToolCallResponse);

      const firstSendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const firstApprovalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((firstApprovalEvent as any).approvalId, 'deny');

      await firstSendPromise;

      const firstHistoryLength = savedHistory.length;
      expect(firstHistoryLength).toBeGreaterThan(0);

      emittedEvents = [];

      const secondSendPromise = orchestrator.send('Try creating test2.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const secondApprovalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((secondApprovalEvent as any).approvalId, 'deny');

      await secondSendPromise;

      expect(savedHistory.length).toBeGreaterThan(firstHistoryLength);

      const assistantWithToolCalls = savedHistory.filter(
        (m) => m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0,
      );
      expect(assistantWithToolCalls).toHaveLength(2);

      const toolResults = savedHistory.filter((m) => m.role === 'tool');
      expect(toolResults).toHaveLength(2);

      toolResults.forEach((result) => {
        expect(result.content).toBe('Tool execution denied by user');
      });
    });

    it('should handle denial of multiple tools in same request', async () => {
      const multiToolResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test1.txt', content: 'hello' }),
            },
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test2.txt', content: 'world' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(multiToolResponse);

      const sendPromise = orchestrator.send('Create two files', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      expect(approvalEvent).toBeDefined();
      expect((approvalEvent as any).toolCalls).toHaveLength(2);

      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      await sendPromise;

      const assistantMsg = savedHistory.find((m) => m.role === 'assistant' && m.tool_calls);
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg!.tool_calls).toHaveLength(2);

      const toolResults = savedHistory.filter((m) => m.role === 'tool');
      expect(toolResults).toHaveLength(2);

      expect(toolResults[0]).toMatchObject({
        role: 'tool',
        content: 'Tool execution denied by user',
        tool_call_id: 'call_1',
        name: 'file_new',
      });

      expect(toolResults[1]).toMatchObject({
        role: 'tool',
        content: 'Tool execution denied by user',
        tool_call_id: 'call_2',
        name: 'file_new',
      });
    });
  });

  describe('Partial Approval', () => {
    it('should handle approval of some tools and denial of others', async () => {
      const multiToolResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test1.txt', content: 'hello' }),
            },
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test2.txt', content: 'world' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'I created one file as requested',
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValueOnce(multiToolResponse).mockResolvedValueOnce(finalResponse);

      const sendPromise = orchestrator.send('Create two files', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      expect(approvalEvent).toBeDefined();

      const approvedCalls = [multiToolResponse.tool_calls![0]];
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'approve', approvedCalls);

      await sendPromise;

      const toolResults = savedHistory.filter((m) => m.role === 'tool');
      expect(toolResults.length).toBeGreaterThan(0);

      const assistantMessages = savedHistory.filter((m) => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);

      const finalAssistant = assistantMessages[assistantMessages.length - 1];
      expect(finalAssistant.content).toBe('I created one file as requested');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate approval responses gracefully', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      const approvalId = (approvalEvent as any).approvalId;

      orchestrator.handleToolApproval(approvalId, 'deny');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      orchestrator.handleToolApproval(approvalId, 'deny');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Received approval for unknown or already processed ID'),
      );

      consoleSpy.mockRestore();

      await sendPromise;
    });

    it('should handle invalid approval decision', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(toolCallResponse);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);

      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'invalid_decision' as any);

      await sendPromise;

      const denialMessages = emittedEvents.filter(
        (e) => e.type === AgentEventTypes.AssistantMessage && e.content?.includes('not approved'),
      );
      expect(denialMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Edit Instruction Flow', () => {
    it('should pass editInstruction to tool execution when edit decision is made', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'I updated the file path as requested',
      };

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      let capturedInvocations: ToolInvocation[] = [];
      vi.mocked(mockTools.executeToolCalls).mockImplementation(async (calls) => {
        capturedInvocations = calls;
        return calls.map((c) => ({
          id: c.id,
          name: c.name,
          status: 'error' as const,
          type: 'text' as const,
          result: `${c.editInstruction}
<system-reminder>
This is not a result from the tool call. The user wants something else. Please follow the user's instruction.
DO NOT mention this explicitly to the user.
</system-reminder>`,
          metadata: { errorReason: ErrorReason.Edited, editInstruction: c.editInstruction },
          durationMs: 0,
        }));
      });

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      expect(approvalEvent).toBeDefined();

      const editInstruction = 'change the file path to /tmp/test.txt';
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'edit', undefined, editInstruction);

      await sendPromise;

      expect(capturedInvocations).toHaveLength(1);
      expect(capturedInvocations[0].editInstruction).toBe(editInstruction);
    });

    it('should save edited tool call to conversation history', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'Done with updated path',
      };

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      const editInstruction = 'use /tmp/test.txt instead';
      const editResult = `${editInstruction}
<system-reminder>
This is not a result from the tool call. The user wants something else. Please follow the user's instruction.
DO NOT mention this explicitly to the user.
</system-reminder>`;
      vi.mocked(mockTools.executeToolCalls).mockResolvedValue([
        {
          id: 'call_1',
          name: 'file_new',
          status: 'error' as const,
          type: 'text' as const,
          result: editResult,
          metadata: { errorReason: ErrorReason.Edited, editInstruction },
          durationMs: 0,
        },
      ]);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'edit', undefined, editInstruction);

      await sendPromise;

      const toolResults = savedHistory.filter((m) => m.role === 'tool');
      expect(toolResults.length).toBeGreaterThan(0);

      const editedToolResult = toolResults.find((m) => m.content?.includes('<system-reminder>'));
      expect(editedToolResult).toBeDefined();
      expect(editedToolResult!.content).toContain(editInstruction);
    });

    it('should emit ToolResult event with Edited error reason', async () => {
      const toolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'Updated as requested',
      };

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      const editInstruction = 'change content to world';
      const editResult = `${editInstruction}
<system-reminder>
This is not a result from the tool call. The user wants something else. Please follow the user's instruction.
DO NOT mention this explicitly to the user.
</system-reminder>`;
      vi.mocked(mockTools.executeToolCalls).mockResolvedValue([
        {
          id: 'call_1',
          name: 'file_new',
          status: 'error' as const,
          type: 'text' as const,
          result: editResult,
          metadata: { errorReason: ErrorReason.Edited, editInstruction },
          durationMs: 0,
        },
      ]);

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'edit', undefined, editInstruction);

      await sendPromise;

      const toolResultEvents = emittedEvents.filter((e) => e.type === AgentEventTypes.ToolResult);
      expect(toolResultEvents.length).toBeGreaterThan(0);

      const editedResultEvent = toolResultEvents.find(
        (e) => e.type === AgentEventTypes.ToolResult && (e as any).result?.metadata?.errorReason === ErrorReason.Edited,
      );
      expect(editedResultEvent).toBeDefined();
      expect((editedResultEvent as any).result.metadata.editInstruction).toBe(editInstruction);
    });

    it('should continue LLM loop after edit instruction', async () => {
      const firstToolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const secondToolCallResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: '/tmp/test.txt', content: 'hello' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'File created at /tmp/test.txt',
      };

      const editInstruction = 'change the file path to /tmp/test.txt';

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(firstToolCallResponse)
        .mockResolvedValueOnce(secondToolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      let callCount = 0;
      vi.mocked(mockTools.executeToolCalls).mockImplementation(async (calls) => {
        callCount++;
        if (callCount === 1) {
          return calls.map((c) => ({
            id: c.id,
            name: c.name,
            status: 'error' as const,
            type: 'text' as const,
            result: `${c.editInstruction}
<system-reminder>
This is not a result from the tool call. The user wants something else. Please follow the user's instruction.
DO NOT mention this explicitly to the user.
</system-reminder>`,
            metadata: { errorReason: ErrorReason.Edited, editInstruction: c.editInstruction },
            durationMs: 0,
          }));
        }
        return calls.map((c) => ({
          id: c.id,
          name: c.name,
          status: 'success' as const,
          type: 'text' as const,
          result: 'File created successfully',
          durationMs: 100,
        }));
      });

      const sendPromise = orchestrator.send('Create a file test.txt', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const firstApprovalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((firstApprovalEvent as any).approvalId, 'edit', undefined, editInstruction);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const secondApprovalEvent = emittedEvents.find(
        (e) =>
          e.type === AgentEventTypes.ToolApprovalRequired &&
          (e as any).approvalId !== (firstApprovalEvent as any).approvalId,
      );
      expect(secondApprovalEvent).toBeDefined();

      const approvedCalls = [secondToolCallResponse.tool_calls![0]];
      orchestrator.handleToolApproval((secondApprovalEvent as any).approvalId, 'approve', approvedCalls);

      const response = await sendPromise;

      expect(response.content).toBe('File created at /tmp/test.txt');
      expect(vi.mocked(mockLLM.generateCompletion)).toHaveBeenCalledTimes(3);
    });

    it('should handle edit instruction for multiple tools', async () => {
      const multiToolResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test1.txt', content: 'hello' }),
            },
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',
              arguments: JSON.stringify({ file_path: 'test2.txt', content: 'world' }),
            },
          },
        ],
      };

      const finalResponse: CompletionResult = {
        content: 'Updated both files',
      };

      vi.mocked(mockLLM.generateCompletion)
        .mockResolvedValueOnce(multiToolResponse)
        .mockResolvedValueOnce(finalResponse);

      const editInstruction = 'put both files in /tmp directory';
      let capturedInvocations: ToolInvocation[] = [];
      vi.mocked(mockTools.executeToolCalls).mockImplementation(async (calls) => {
        capturedInvocations = calls;
        return calls.map((c) => ({
          id: c.id,
          name: c.name,
          status: 'error' as const,
          type: 'text' as const,
          result: `${c.editInstruction}
<system-reminder>
This is not a result from the tool call. The user wants something else. Please follow the user's instruction.
DO NOT mention this explicitly to the user.
</system-reminder>`,
          metadata: { errorReason: ErrorReason.Edited, editInstruction: c.editInstruction },
          durationMs: 0,
        }));
      });

      const sendPromise = orchestrator.send('Create two files', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'edit', undefined, editInstruction);

      await sendPromise;

      expect(capturedInvocations).toHaveLength(2);
      expect(capturedInvocations[0].editInstruction).toBe(editInstruction);
      expect(capturedInvocations[1].editInstruction).toBe(editInstruction);
    });
  });

  describe('Bypass Tools with Denial', () => {
    it('should execute bypass tools successfully even when approval tools are denied', async () => {
      const multiToolResponse: CompletionResult = {
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'file_read',  // Bypass tool
              arguments: JSON.stringify({ path: 'test.txt' }),
            },
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'file_new',  // Requires approval
              arguments: JSON.stringify({ file_path: 'output.txt', content: 'data' }),
            },
          },
        ],
      };

      vi.mocked(mockLLM.generateCompletion).mockResolvedValue(multiToolResponse);

      // Mock tool definitions to include file_read
      vi.mocked(mockTools.getToolDefinitions).mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'file_read',
            description: 'Read a file',
            parameters: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'file_new',
            description: 'Create a new file',
            parameters: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['file_path', 'content'],
            },
          },
        },
      ]);

      vi.mocked(mockTools.executeToolCalls).mockImplementation(async (calls) => {
        return calls.map((c) => ({
          id: c.id,
          name: c.name,
          status: 'success' as const,
          type: 'text' as const,
          result: c.name === 'file_read' ? 'File content here' : 'File created',
          durationMs: 50,
        }));
      });

      const sendPromise = orchestrator.send('Read and modify', { stream: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const approvalEvent = emittedEvents.find((e) => e.type === AgentEventTypes.ToolApprovalRequired);
      expect(approvalEvent).toBeDefined();
      expect((approvalEvent as any).toolCalls).toHaveLength(1);  // Only file_new needs approval
      expect((approvalEvent as any).toolCalls[0].function.name).toBe('file_new');

      // Deny the approval-required tool
      orchestrator.handleToolApproval((approvalEvent as any).approvalId, 'deny');

      await sendPromise;

      // Check that file_read (bypass) succeeded
      const fileReadResult = savedHistory.find((m) => m.role === 'tool' && m.name === 'file_read');
      expect(fileReadResult).toBeDefined();
      expect(fileReadResult!.content).toBe('File content here');

      // Check that file_new was denied
      const fileNewResult = savedHistory.find((m) => m.role === 'tool' && m.name === 'file_new');
      expect(fileNewResult).toBeDefined();
      expect(fileNewResult!.content).toBe('Tool execution denied by user');

      // Verify ToolResult events
      const toolResultEvents = emittedEvents.filter((e) => e.type === AgentEventTypes.ToolResult);
      expect(toolResultEvents.length).toBeGreaterThanOrEqual(2);

      const fileReadEvent = toolResultEvents.find((e) => (e as any).result?.name === 'file_read');
      expect(fileReadEvent).toBeDefined();
      expect((fileReadEvent as any).result.status).toBe('success');

      const fileNewEvent = toolResultEvents.find((e) => (e as any).result?.name === 'file_new');
      expect(fileNewEvent).toBeDefined();
      expect((fileNewEvent as any).result.metadata?.errorReason).toBe(ErrorReason.Denied);
    });
  });
});
