import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseLLM } from '../llm-providers/base-llm';
import { mergeChoices } from '../llm-providers/llm-utils';
import type { HttpTransport } from '../transports/index.js';
import type { CompletionParams } from '../ports.js';

// Mock transport implementation
const createMockTransport = (): HttpTransport => ({
  postJson: vi.fn(),
  postStream: vi.fn(),
});

// Concrete implementation for testing
class TestLLM extends BaseLLM {
  public mockTransport: HttpTransport;

  constructor(apiUrl: string) {
    super(apiUrl);
    this.mockTransport = createMockTransport();
  }

  protected createTransport(): HttpTransport {
    return this.mockTransport;
  }
}

describe('BaseLLM - Reasoning & Metadata Support', () => {
  let llm: TestLLM;
  const apiUrl = 'https://api.example.com';

  beforeEach(() => {
    llm = new TestLLM(apiUrl);
  });

  const createMockStreamResponse = (chunks: string[]) => {
    const encoder = new TextEncoder();
    const encodedChunks = chunks.map((chunk) => encoder.encode(chunk));

    let currentIndex = 0;
    const reader = {
      read: vi.fn(async () => {
        if (currentIndex >= encodedChunks.length) {
          return { done: true, value: undefined };
        }
        return { done: false, value: encodedChunks[currentIndex++] };
      }),
    };

    return {
      ok: true,
      body: { getReader: () => reader },
      text: () => Promise.resolve(''),
    };
  };

  describe('streamCompletion with Root-Level Flattening', () => {
    it('should accumulate "reasoning" field into root object', async () => {
      // Simulating DeepSeek-style reasoning field
      const chunks = [
        'data: {"choices":[{"delta":{"content":null,"reasoning":"I need"}}]}',
        'data: {"choices":[{"delta":{"content":null,"reasoning":" to think"}}]}',
        'data: {"choices":[{"delta":{"content":"Here"}}]}',
        'data: {"choices":[{"delta":{"content":" is answer"}}]}',
        'data: [DONE]',
      ];

      const mockResponse = createMockStreamResponse(chunks);
      vi.mocked(llm.mockTransport.postStream).mockResolvedValueOnce(mockResponse as any);

      const params: CompletionParams = {
        model: 'deepseek-r1',
        messages: [],
      };

      const result = await llm.streamCompletion(params);

      expect(result.content).toBe('Here is answer');
      // Expect reasoning to be at root level, not in metadata
      expect((result as any).reasoning).toBe('I need to think');
      // Metadata should be undefined if no generic valid metadata was passed
      expect(result.metadata).toBeUndefined();
    });

    it('should accumulate arbitrary unknown string fields into root', async () => {
      // Simulating a custom provider sending "thoughts" field
      const chunks = [
        'data: {"choices":[{"delta":{"content":null,"thoughts":"Step 1"}}]}',
        'data: {"choices":[{"delta":{"content":null,"thoughts":": Analyze"}}]}',
        'data: {"choices":[{"delta":{"content":"Result"}}]}',
        'data: [DONE]',
      ];

      const mockResponse = createMockStreamResponse(chunks);
      vi.mocked(llm.mockTransport.postStream).mockResolvedValueOnce(mockResponse as any);

      const params: CompletionParams = {
        model: 'custom-model',
        messages: [],
      };

      const result = await llm.streamCompletion(params);

      expect(result.content).toBe('Result');
      expect((result as any).thoughts).toBe('Step 1: Analyze');
    });

    it('should capture non-string root fields (last write wins)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"msg","provider_id":123}}]}',
        'data: {"choices":[{"delta":{"content":"", "provider_id":456}}]}',
        'data: [DONE]',
      ];

      const mockResponse = createMockStreamResponse(chunks);
      vi.mocked(llm.mockTransport.postStream).mockResolvedValueOnce(mockResponse as any);

      const params: CompletionParams = {
        model: 'custom-model',
        messages: [],
      };

      const result = await llm.streamCompletion(params);

      expect((result as any).provider_id).toBe(456); // Last one should win for non-strings
    });

  });

  describe('mergeChoices (LLM Utils)', () => {
    it('should merge unknown fields from choices into root', () => {
      const choices = [
        {
          message: {
            content: 'Test content',
            reasoning: 'I am thinking',
            custom_field: 'custom value',
          } as any, // Intentional cast to any to simulate unknown fields
        },
      ];

      const result = mergeChoices(choices);

      expect(result.content).toBe('Test content');
      expect((result as any).reasoning).toBe('I am thinking');
      expect((result as any).custom_field).toBe('custom value');
    });
  });
});
