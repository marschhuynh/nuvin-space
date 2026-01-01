import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLLM, getAvailableProviders, type CustomProviderDefinition } from '../llm-providers/llm-factory.js';
import { GenericAnthropicLLM } from '../llm-providers/llm-anthropic-compat.js';

describe('Anthropic-compat Provider Type', () => {
  const customProviders: Record<string, CustomProviderDefinition> = {
    'test-anthropic': {
      type: 'anthropic-compat',
      baseUrl: 'https://api.test-anthropic.com/v1',
    },
    'test-anthropic-with-headers': {
      type: 'anthropic-compat',
      baseUrl: 'https://api.custom-anthropic.com',
      customHeaders: {
        'X-Custom-Header': 'test-value',
      },
    },
  };

  describe('createLLM', () => {
    it('should create GenericAnthropicLLM for anthropic-compat type', () => {
      const llm = createLLM('test-anthropic', { apiKey: 'test-key' }, customProviders);
      expect(llm).toBeInstanceOf(GenericAnthropicLLM);
    });

    it('should create LLM with correct base URL', () => {
      const llm = createLLM('test-anthropic', { apiKey: 'test-key' }, customProviders);
      expect((llm as GenericAnthropicLLM)['apiUrl']).toBe('https://api.test-anthropic.com/v1');
    });

    it('should have generateCompletion method', () => {
      const llm = createLLM('test-anthropic', { apiKey: 'test-key' }, customProviders);
      expect(llm).toHaveProperty('generateCompletion');
      expect(typeof llm.generateCompletion).toBe('function');
    });

    it('should have streamCompletion method', () => {
      const llm = createLLM('test-anthropic', { apiKey: 'test-key' }, customProviders);
      expect(llm).toHaveProperty('streamCompletion');
      expect(typeof llm.streamCompletion).toBe('function');
    });

    it('should have getModels method', () => {
      const llm = createLLM('test-anthropic', { apiKey: 'test-key' }, customProviders);
      expect(llm).toHaveProperty('getModels');
      expect(typeof llm.getModels).toBe('function');
    });

    it('should support custom apiUrl override', () => {
      const llm = createLLM(
        'test-anthropic',
        { apiKey: 'test-key', apiUrl: 'https://custom-override.com' },
        customProviders,
      );
      expect((llm as GenericAnthropicLLM)['apiUrl']).toBe('https://custom-override.com');
    });
  });

  describe('getAvailableProviders', () => {
    it('should include custom anthropic-compat providers', () => {
      const providers = getAvailableProviders(customProviders);
      expect(providers).toContain('test-anthropic');
      expect(providers).toContain('test-anthropic-with-headers');
    });
  });

  describe('GenericAnthropicLLM class', () => {
    it('should instantiate directly', () => {
      const llm = new GenericAnthropicLLM('https://api.anthropic.com/v1', {
        apiKey: 'test-key',
        providerName: 'test',
      });
      expect(llm).toBeInstanceOf(GenericAnthropicLLM);
    });

    it('should respect enablePromptCaching option', () => {
      const llm = new GenericAnthropicLLM('https://api.anthropic.com/v1', {
        apiKey: 'test-key',
        enablePromptCaching: true,
      });
      expect((llm as any).enablePromptCaching).toBe(true);
    });

    it('should default enablePromptCaching to false', () => {
      const llm = new GenericAnthropicLLM('https://api.anthropic.com/v1', {
        apiKey: 'test-key',
      });
      expect((llm as any).enablePromptCaching).toBe(false);
    });
  });

  describe('mixed provider types', () => {
    const mixedProviders: Record<string, CustomProviderDefinition> = {
      'openai-provider': {
        type: 'openai-compat',
        baseUrl: 'https://api.openai-compat.com/v1',
      },
      'anthropic-provider': {
        type: 'anthropic-compat',
        baseUrl: 'https://api.anthropic-compat.com/v1',
      },
    };

    it('should create correct LLM type for openai-compat', () => {
      const llm = createLLM('openai-provider', { apiKey: 'test-key' }, mixedProviders);
      expect(llm).not.toBeInstanceOf(GenericAnthropicLLM);
    });

    it('should create correct LLM type for anthropic-compat', () => {
      const llm = createLLM('anthropic-provider', { apiKey: 'test-key' }, mixedProviders);
      expect(llm).toBeInstanceOf(GenericAnthropicLLM);
    });
  });

  describe('thinking/reasoning content handling', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should capture thinking content from non-streaming response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'Let me analyze this problem step by step...' },
          { type: 'text', text: 'The answer is 42.' },
        ],
        model: 'test-model',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 50 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(''),
      } as any);

      const llm = new GenericAnthropicLLM('https://api.test.com/v1', { apiKey: 'test-key' });
      const result = await llm.generateCompletion({
        messages: [{ role: 'user', content: 'What is the meaning of life?' }],
        model: 'test-model',
        temperature: 0.7,
        topP: 1,
      });

      expect(result.content).toBe('The answer is 42.');
      expect(result.reasoning).toBe('Let me analyze this problem step by step...');
    });

    it('should send thinking disabled in request body', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        model: 'test-model',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(''),
      } as any);

      const llm = new GenericAnthropicLLM('https://api.test.com/v1', { apiKey: 'test-key' });
      await llm.generateCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model',
        temperature: 0.7,
        topP: 1,
        thinking: { type: 'disabled' },
      });

      const fetchCall = (global.fetch as vi.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);

      expect(requestBody.thinking).toEqual({ type: 'disabled' });
    });

    it('should send thinking enabled with budget_tokens in request body', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        model: 'test-model',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(''),
      } as any);

      const llm = new GenericAnthropicLLM('https://api.test.com/v1', { apiKey: 'test-key' });
      await llm.generateCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model',
        temperature: 0.7,
        topP: 1,
        thinking: { type: 'enabled', budget_tokens: 4096 },
      });

      const fetchCall = (global.fetch as vi.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);

      expect(requestBody.thinking).toEqual({ type: 'enabled', budget_tokens: 4096 });
    });

    it('should stream thinking content via onReasoningChunk', async () => {
      const streamEvents = [
        'data: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"test-model","usage":{"input_tokens":10,"output_tokens":0}}}',
        '',
        'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}',
        '',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me "}}',
        '',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"think..."}}',
        '',
        'data: {"type":"content_block_stop","index":0}',
        '',
        'data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}',
        '',
        'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hello!"}}',
        '',
        'data: {"type":"content_block_stop","index":1}',
        '',
        'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":20}}',
        '',
        'data: {"type":"message_stop"}',
        '',
      ].join('\n');

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamEvents));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
        text: vi.fn().mockResolvedValue(''),
      } as any);

      const llm = new GenericAnthropicLLM('https://api.test.com/v1', { apiKey: 'test-key' });

      const reasoningChunks: string[] = [];
      const textChunks: string[] = [];

      const result = await llm.streamCompletion(
        {
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'test-model',
          temperature: 0.7,
          topP: 1,
        },
        {
          onChunk: (delta) => textChunks.push(delta),
          onReasoningChunk: (delta) => reasoningChunks.push(delta),
        },
      );

      expect(reasoningChunks).toEqual(['Let me ', 'think...']);
      expect(textChunks).toEqual(['Hello!']);
      expect(result.content).toBe('Hello!');
      expect(result.reasoning).toBe('Let me think...');
    });

    it('should send thinking disabled in streaming request', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'message_start',
                message: { id: 'msg_123', usage: { input_tokens: 10, output_tokens: 0 } },
              }),
            ),
          );
          controller.enqueue(encoder.encode('\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'message_stop' })));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
        text: vi.fn().mockResolvedValue(''),
      } as any);

      const llm = new GenericAnthropicLLM('https://api.test.com/v1', { apiKey: 'test-key' });

      await llm.streamCompletion(
        {
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'test-model',
          temperature: 0.7,
          topP: 1,
          thinking: { type: 'disabled' },
        },
        { onChunk: () => {} },
      );

      const fetchCall = (global.fetch as vi.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);

      expect(requestBody.thinking).toEqual({ type: 'disabled' });
    });
  });
});
