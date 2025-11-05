import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAISDKLLM } from '../llm-providers/llm-anthropic-aisdk.js';
import type { CompletionParams } from '../ports.js';

// Mock the AI SDK dependencies
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn()),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  jsonSchema: vi.fn((params) => params),
  APICallError: {
    isInstance: vi.fn(() => false),
  },
}));

describe('AnthropicAISDKLLM - Usage and Cache Token Handling', () => {
  let llm: AnthropicAISDKLLM;

  beforeEach(() => {
    llm = new AnthropicAISDKLLM({ apiKey: 'test-key' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCompletion - Cache Token Mapping', () => {
    it('should map cachedInputTokens to cached_tokens', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response with cache',
        toolCalls: [],
        usage: {
          inputTokens: 200,
          outputTokens: 50,
          totalTokens: 250,
          cachedInputTokens: 150,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'Large system context' },
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.usage).toBeDefined();
      expect(result.usage?.prompt_tokens).toBe(200);
      expect(result.usage?.completion_tokens).toBe(50);
      expect(result.usage?.total_tokens).toBe(250);
      expect(result.usage?.prompt_tokens_details).toBeDefined();
      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(150);
    });

    it('should handle zero cached tokens', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response without cache',
        toolCalls: [],
        usage: {
          inputTokens: 200,
          outputTokens: 50,
          totalTokens: 250,
          cachedInputTokens: 0,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'First time asking this question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(0);
    });

    it('should handle missing cachedInputTokens field gracefully', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response',
        toolCalls: [],
        usage: {
          inputTokens: 100,
          outputTokens: 25,
          totalTokens: 125,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(0);
    });

    it('should handle subsequent cached request', async () => {
      const { generateText } = await import('ai');
      
      // Simulate cache hit on second request
      vi.mocked(generateText).mockResolvedValue({
        text: 'Cached response',
        toolCalls: [],
        usage: {
          inputTokens: 50,
          outputTokens: 100,
          totalTokens: 150,
          cachedInputTokens: 6278,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: [
              { type: 'text', text: 'Same context as before' },
            ],
          },
          { role: 'user', content: 'Different question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(6278);
      expect(result.content).toBe('Cached response');
    });
  });

  describe('streamCompletion - Cache Token Mapping', () => {
    it('should map cachedInputTokens in streaming response', async () => {
      const { streamText } = await import('ai');
      
      const mockTextStream = (async function* () {
        yield 'Streaming ';
        yield 'response';
      })();

      vi.mocked(streamText).mockReturnValue({
        textStream: mockTextStream,
        toolCalls: Promise.resolve([]),
        usage: Promise.resolve({
          inputTokens: 200,
          outputTokens: 50,
          totalTokens: 250,
          cachedInputTokens: 150,
        } as any),
        finishReason: Promise.resolve('stop'),
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'System with cache' },
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.streamCompletion(params);

      expect(result.content).toBe('Streaming response');
      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(150);
    });

    it('should call onStreamFinish with cached tokens', async () => {
      const { streamText } = await import('ai');
      
      const mockTextStream = (async function* () {
        yield 'Response';
      })();

      vi.mocked(streamText).mockReturnValue({
        textStream: mockTextStream,
        toolCalls: Promise.resolve([]),
        usage: Promise.resolve({
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cachedInputTokens: 75,
        } as any),
        finishReason: Promise.resolve('stop'),
      } as any);

      const onStreamFinish = vi.fn();
      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      await llm.streamCompletion(params, { onStreamFinish });

      expect(onStreamFinish).toHaveBeenCalledWith('stop', expect.objectContaining({
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        prompt_tokens_details: expect.objectContaining({
          cached_tokens: 75,
        }),
      }));
    });

    it('should handle streaming with zero cached tokens', async () => {
      const { streamText } = await import('ai');
      
      const mockTextStream = (async function* () {
        yield 'Response';
      })();

      vi.mocked(streamText).mockReturnValue({
        textStream: mockTextStream,
        toolCalls: Promise.resolve([]),
        usage: Promise.resolve({
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cachedInputTokens: 0,
        } as any),
        finishReason: Promise.resolve('stop'),
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'New question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.streamCompletion(params);

      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(0);
    });

    it('should handle streaming without cache fields', async () => {
      const { streamText } = await import('ai');
      
      const mockTextStream = (async function* () {
        yield 'Response';
      })();

      vi.mocked(streamText).mockReturnValue({
        textStream: mockTextStream,
        toolCalls: Promise.resolve([]),
        usage: Promise.resolve({
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        } as any),
        finishReason: Promise.resolve('stop'),
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.streamCompletion(params);

      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined usage gracefully', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response',
        toolCalls: [],
        usage: undefined as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.content).toBe('Response');
      expect(result.usage?.prompt_tokens).toBe(0);
    });

    it('should handle malformed usage object', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response',
        toolCalls: [],
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      expect(result.usage?.prompt_tokens).toBe(0);
      expect(result.usage?.completion_tokens).toBe(0);
      expect(result.usage?.total_tokens).toBe(0);
    });

    it('should preserve other usage fields when mapping cache tokens', async () => {
      const { generateText } = await import('ai');
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response',
        toolCalls: [],
        usage: {
          inputTokens: 200,
          outputTokens: 50,
          totalTokens: 250,
          cachedInputTokens: 150,
        } as any,
        finishReason: 'stop',
      } as any);

      const params: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result = await llm.generateCompletion(params);

      // Should map cache tokens correctly
      expect(result.usage?.prompt_tokens_details?.cached_tokens).toBe(150);
      // Should preserve standard fields
      expect(result.usage?.prompt_tokens).toBe(200);
      expect(result.usage?.completion_tokens).toBe(50);
      expect(result.usage?.total_tokens).toBe(250);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a complete conversation with cache building and reading', async () => {
      const { generateText } = await import('ai');
      
      // First request - cache creation (no cached tokens returned)
      vi.mocked(generateText).mockResolvedValueOnce({
        text: 'First response',
        toolCalls: [],
        usage: {
          inputTokens: 6281,
          outputTokens: 153,
          totalTokens: 6434,
          cachedInputTokens: 0,
        } as any,
        finishReason: 'stop',
      } as any);

      const params1: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: 'Very long system prompt that will be cached...',
          },
          { role: 'user', content: 'First question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result1 = await llm.generateCompletion(params1);
      
      expect(result1.usage?.prompt_tokens_details?.cached_tokens).toBe(0);

      // Second request - cache hit
      vi.mocked(generateText).mockResolvedValueOnce({
        text: 'Second response',
        toolCalls: [],
        usage: {
          inputTokens: 20,
          outputTokens: 100,
          totalTokens: 120,
          cachedInputTokens: 6278,
        } as any,
        finishReason: 'stop',
      } as any);

      const params2: CompletionParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: 'Very long system prompt that will be cached...',
          },
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second question' },
        ],
        temperature: 0.7,
        topP: 1,
      };

      const result2 = await llm.generateCompletion(params2);
      
      expect(result2.usage?.prompt_tokens_details?.cached_tokens).toBe(6278);
      expect(result2.usage?.prompt_tokens).toBe(20);
    });
  });
});
