import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrchestratorManager } from '../source/services/OrchestratorManager.js';
import { sessionMetricsService } from '../source/services/SessionMetricsService.js';
import { InMemoryMemory } from '@nuvin/nuvin-core';
import type { Message } from '@nuvin/nuvin-core';
import { eventBus } from '../source/services/EventBus.js';
import { modelLimitsCache } from '../source/services/ModelLimitsCache.js';

const TEST_SESSION_ID = 'test-session';

describe('Context Window Auto-Summary', () => {
  let manager: OrchestratorManager;
  let mockConfigManager: unknown;
  let eventEmitted: unknown[] = [];
  let originalEmit: typeof eventBus.emit;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitted = [];
    modelLimitsCache.clear();
    sessionMetricsService.reset(TEST_SESSION_ID);

    mockConfigManager = {
      getConfig: vi.fn().mockReturnValue({
        activeProvider: 'openrouter',
        model: 'openai/gpt-4o',
        requireToolApproval: false,
        thinking: 'OFF',
        streamingChunks: false,
        mcp: undefined,
        providers: {
          openrouter: {
            auth: [{ apiKey: 'test-key' }],
          },
        },
      }),
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      getCurrentProfile: vi.fn().mockReturnValue(undefined),
      getProfileManager: vi.fn().mockReturnValue(undefined),
    };

    manager = new OrchestratorManager(mockConfigManager);
    (manager as any).sessionId = TEST_SESSION_ID;

    originalEmit = eventBus.emit.bind(eventBus);
    eventBus.emit = vi.fn((event: string, payload?: unknown) => {
      eventEmitted.push({ event, payload });
      return originalEmit(event, payload);
    });
  });

  afterEach(() => {
    eventBus.emit = originalEmit;
    modelLimitsCache.clear();
    sessionMetricsService.reset(TEST_SESSION_ID);
  });

  it('should calculate context window usage from prompt tokens', async () => {
    const memory = new InMemoryMemory<Message>();
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 128000 },
          },
        ]),
      }),
    } as any;

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 45200,
      completion_tokens: 5100,
      total_tokens: 50300,
    });

    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const snapshot = sessionMetricsService.getSnapshot(TEST_SESSION_ID);
    expect(snapshot.contextWindowLimit).toBe(128000);
    expect(snapshot.contextWindowUsage).toBeCloseTo(45200 / 128000, 4);
  });

  it('should emit warning when usage is 85-95%', async () => {
    const memory = new InMemoryMemory<Message>();
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 88000,
      completion_tokens: 1000,
      total_tokens: 89000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const warningEvent = eventEmitted.find(
      (e: any) =>
        e.event === 'ui:line' &&
        e.payload?.content?.includes('⚠️ Context window') &&
        e.payload?.content?.includes('Consider using /summary'),
    );

    expect(warningEvent).toBeDefined();
    expect((warningEvent as any)?.payload.content).toContain('88%');
  });

  it('should trigger auto-summary when usage >= 95%', async () => {
    const memory = new InMemoryMemory<Message>();
    const testMessage: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    await memory.set('cli', [testMessage]);
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    (manager as any).summarize = vi.fn().mockResolvedValue('Summary of conversation');

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 96000,
      completion_tokens: 1000,
      total_tokens: 97000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const autoSummaryEvent = eventEmitted.find(
      (e: any) => e.event === 'ui:line' && e.payload?.content?.includes('Running auto-summary'),
    );

    expect(autoSummaryEvent).toBeDefined();
    expect((autoSummaryEvent as any)?.payload.content).toContain('96%');
  });

  it('should replace history with summary after auto-summary', async () => {
    const memory = new InMemoryMemory<Message>();
    const testMessages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'How are you?',
        timestamp: new Date().toISOString(),
      },
    ];
    await memory.set('cli', testMessages);
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    (manager as any).summarize = vi.fn().mockResolvedValue('Summary of conversation');

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 96000,
      completion_tokens: 1000,
      total_tokens: 97000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const messages = await memory.get('cli');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('user');
    expect(messages[0]?.content).toContain('Previous conversation summary');
    expect(messages[0]?.content).toContain('Summary of conversation');
  });

  it('should reset metrics after auto-summary', async () => {
    const memory = new InMemoryMemory<Message>();
    const testMessage: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    await memory.set('cli', [testMessage]);
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    (manager as any).summarize = vi.fn().mockResolvedValue('Summary of conversation');

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 96000,
      completion_tokens: 1000,
      total_tokens: 97000,
    });

    const beforeMetrics = sessionMetricsService.getSnapshot(TEST_SESSION_ID);
    expect(beforeMetrics.currentTokens).toBe(97000);

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const afterMetrics = sessionMetricsService.getSnapshot(TEST_SESSION_ID);
    expect(afterMetrics.totalTokens).toBe(0);
    expect(afterMetrics.currentTokens).toBe(0);
  });

  it('should emit ui:lines:clear and ui:header:refresh after auto-summary', async () => {
    const memory = new InMemoryMemory<Message>();
    const testMessage: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    await memory.set('cli', [testMessage]);
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    (manager as any).summarize = vi.fn().mockResolvedValue('Summary of conversation');

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 96000,
      completion_tokens: 1000,
      total_tokens: 97000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const clearEvent = eventEmitted.find((e: any) => e.event === 'ui:lines:clear');
    const refreshEvent = eventEmitted.find((e: any) => e.event === 'ui:header:refresh');

    expect(clearEvent).toBeDefined();
    expect(refreshEvent).toBeDefined();
  });

  it('should not trigger auto-summary when usage < 85%', async () => {
    const memory = new InMemoryMemory<Message>();
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    const summarizeSpy = vi.fn().mockResolvedValue('Summary of conversation');
    (manager as any).summarize = summarizeSpy;

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 50000,
      completion_tokens: 1000,
      total_tokens: 51000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const warningEvent = eventEmitted.find((e: any) => e.event === 'ui:line' && e.payload?.content?.includes('⚠️'));

    expect(warningEvent).toBeUndefined();
    expect(summarizeSpy).not.toHaveBeenCalled();
  });

  it('should use fallback limits when model limits are not available from API', async () => {
    const memory = new InMemoryMemory<Message>();
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([]),
      }),
    } as any;

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 45200,
      completion_tokens: 5100,
      total_tokens: 50300,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const snapshot = sessionMetricsService.getSnapshot(TEST_SESSION_ID);
    expect(snapshot.contextWindowLimit).toBe(128000);
  });

  it('should show summary message in UI after auto-summary', async () => {
    const memory = new InMemoryMemory<Message>();
    const testMessage: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    await memory.set('cli', [testMessage]);
    (manager as any).memory = memory;

    (manager as any).orchestrator = {
      getLLM: vi.fn().mockReturnValue({
        getModels: vi.fn().mockResolvedValue([
          {
            id: 'openai/gpt-4o',
            limits: { contextWindow: 100000 },
          },
        ]),
      }),
    } as any;

    (manager as any).summarize = vi.fn().mockResolvedValue('This is a test summary');

    sessionMetricsService.recordLLMCall(TEST_SESSION_ID, {
      prompt_tokens: 96000,
      completion_tokens: 1000,
      total_tokens: 97000,
    });

    // Using TEST_SESSION_ID for metrics consistency
    const provider = 'openrouter';
    const model = 'openai/gpt-4o';

    await (manager as any).checkContextWindowUsage(TEST_SESSION_ID, provider, model);

    const summaryDisplayEvent = eventEmitted.find(
      (e: any) =>
        e.event === 'ui:line' &&
        e.payload?.type === 'user' &&
        e.payload?.content?.includes('Previous conversation summary'),
    );

    expect(summaryDisplayEvent).toBeDefined();
    expect((summaryDisplayEvent as any)?.payload.content).toContain('This is a test summary');
  });
});
