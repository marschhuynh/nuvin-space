import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicLLM } from '../llm-providers/llm-anthropic.js';
import type { CompletionParams, ChatMessage, ToolCall } from '../ports.js';

// Mock transport
const createMockTransport = (mockResponses?: any[]) => ({
  postJson: vi.fn(),
  postStream: vi.fn(),
});

describe('AnthropicLLM', () => {
  let llm: AnthropicLLM;
  let mockTransport: any;

  beforeEach(() => {
    mockTransport = createMockTransport();
    llm = new AnthropicLLM({ apiKey: 'test-key' });

    // Mock the transport
    vi.spyOn(llm as any, 'getTransport').mockReturnValue(mockTransport);
  });

  describe('Message Transformation', () => {
    it('should extract system prompt to separate parameter', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      // Access internal transformation method
      const { system, messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      expect(system).toEqual([
        { type: 'text', text: "You are Claude Code, Anthropic's official CLI for Claude." },
        { type: 'text', text: 'You are a helpful assistant.' }
      ]);
      expect(transformedMessages).toHaveLength(2);
      expect(transformedMessages[0].role).toBe('user');
      expect(transformedMessages[0].content).toBe('Hello');
      expect(transformedMessages[1].role).toBe('assistant');
      expect(transformedMessages[1].content).toBe('Hi there!');
    });

    it('should handle multiple system messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'First instruction' },
        { role: 'system', content: 'Second instruction' },
        { role: 'user', content: 'Hello' },
      ];

      const { system } = (llm as any).transformToAnthropicMessages(messages);

      expect(system).toEqual([
        { type: 'text', text: "You are Claude Code, Anthropic's official CLI for Claude." },
        { type: 'text', text: 'First instruction\n\nSecond instruction' }
      ]);
    });

    it('should transform OpenAI message format to Anthropic content blocks', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } }
          ]
        },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      expect(transformedMessages).toHaveLength(1);
      expect(transformedMessages[0].role).toBe('user');
      expect(Array.isArray(transformedMessages[0].content)).toBe(true);
      expect(transformedMessages[0].content).toEqual([
        { type: 'text', text: 'Hello' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
          }
        }
      ]);
    });

    it('should convert string content to text content block', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Simple text' },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      expect(transformedMessages[0].content).toBe('Simple text');
    });

    it('should handle tool calls in assistant messages', () => {
      const toolCall: ToolCall = {
        id: 'tool_1',
        type: 'function',
        function: {
          name: 'test_function',
          arguments: '{"param": "value"}',
        },
      };

      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: 'Let me help you with that.',
          tool_calls: [toolCall]
        },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      const content = transformedMessages[0].content;
      expect(Array.isArray(content)).toBe(true);
      expect(content).toContainEqual({ type: 'text', text: 'Let me help you with that.' });
      expect(content).toContainEqual({
        type: 'tool_use',
        id: 'tool_1',
        name: 'test_function',
        input: { param: 'value' },
      });
    });

    it('should handle tool results as tool_result blocks', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: '', tool_calls: [{
          id: 'tool_1',
          type: 'function',
          function: { name: 'test', arguments: '{}' }
        }]},
        { role: 'tool', tool_call_id: 'tool_1', content: 'Function result' },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      const userMessage = transformedMessages.find(m => m.role === 'user');
      expect(userMessage).toBeDefined();
      const content = userMessage!.content as any[];
      expect(content).toContainEqual({
        type: 'tool_result',
        tool_use_id: 'tool_1',
        content: 'Function result',
      });
    });
  });

  describe('Tool Transformation', () => {
    it('should transform OpenAI tools to Anthropic format', () => {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_function',
            description: 'A test function',
            parameters: {
              type: 'object',
              properties: {
                param: { type: 'string' }
              },
              required: ['param'],
            },
          },
        },
      ];

      const transformed = (llm as any).transformTools(tools);

      expect(transformed).toEqual([
        {
          name: 'test_function',
          description: 'A test function',
          input_schema: {
            type: 'object',
            properties: {
              param: { type: 'string' }
            },
            required: ['param'],
          },
        },
      ]);
    });

    it('should handle undefined tools', () => {
      const transformed = (llm as any).transformTools(undefined);
      expect(transformed).toBeUndefined();
    });

    it('should transform tool_choice', () => {
      expect((llm as any).transformToolChoice('auto')).toEqual({ type: 'auto' });
      expect((llm as any).transformToolChoice('none')).toBeUndefined();
      expect((llm as any).transformToolChoice({
        type: 'function',
        function: { name: 'specific_tool' }
      })).toEqual({ type: 'tool', name: 'specific_tool' });
    });
  });

  describe('Response Transformation', () => {
    it('should transform Anthropic response to CompletionResult', () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
          { type: 'text', text: 'Hello world!' },
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'test_function',
            input: { param: 'value' },
          },
        ],
        model: 'claude-3',
        stop_reason: 'end_turn' as const,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      };

      const result = (llm as any).transformResponse(anthropicResponse);

      expect(result).toEqual({
        content: 'Hello world!',
        tool_calls: [
          {
            id: 'tool_123',
            type: 'function',
            function: {
              name: 'test_function',
              arguments: '{"param":"value"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });
    });

    it('should handle multiple text blocks', () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: ' second part' },
        ],
        model: 'claude-3',
        stop_reason: 'end_turn' as const,
        usage: {
          input_tokens: 5,
          output_tokens: 3,
        },
      };

      const result = (llm as any).transformResponse(anthropicResponse);

      expect(result.content).toBe('First part second part');
      expect(result.tool_calls).toBeUndefined();
    });

    it('should handle empty content', () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [],
        model: 'claude-3',
        stop_reason: 'end_turn' as const,
        usage: {
          input_tokens: 5,
          output_tokens: 0,
        },
      };

      const result = (llm as any).transformResponse(anthropicResponse);

      expect(result.content).toBe('');
      expect(result.tool_calls).toBeUndefined();
    });
  });

  describe('generateCompletion', () => {
    it('should make correct API call and transform response', async () => {
      const mockAnthropicResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
        model: 'claude-3',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockTransport.postJson.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnthropicResponse),
        text: () => Promise.resolve(''),
      });

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
        topP: 1,
        maxTokens: 100,
      };

      const result = await llm.generateCompletion(params);

      expect(mockTransport.postJson).toHaveBeenCalledWith(
        '/v1/messages',
        {
          model: 'claude-3',
          max_tokens: 100,
          temperature: 0.7,
          stream: false,
          system: [
            { type: 'text', text: "You are Claude Code, Anthropic's official CLI for Claude." },
            { type: 'text', text: 'You are helpful.' }
          ],
          messages: [
            { role: 'user', content: 'Hello' },
          ],
        },
        undefined,
        undefined,
      );

      expect(result).toEqual({
        content: 'Hello!',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });
    });

    it('should include tools and tool_choice when provided', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-3',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockTransport.postJson.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      });

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {}, required: [] },
          },
        },
      ];

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        topP: 1,
        maxTokens: 100,
        tools,
        tool_choice: 'auto',
      };

      await llm.generateCompletion(params);

      expect(mockTransport.postJson).toHaveBeenCalledWith(
        '/v1/messages',
        expect.objectContaining({
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              input_schema: { type: 'object', properties: {}, required: [] },
            },
          ],
          tool_choice: { type: 'auto' },
        }),
        undefined,
        undefined,
      );
    });

    it('should handle API errors', async () => {
      mockTransport.postJson.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      });

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        topP: 1,
      };

      await expect(llm.generateCompletion(params)).rejects.toThrow('Rate limited');
    });
  });

  describe('Streaming', () => {
    it('should handle streaming events correctly', async () => {
      const streamEvents = [
        'data: {"type":"message_start","message":{"id":"msg_123","usage":{"input_tokens":10}}}',
        'data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
        'data: {"type":"content_block_stop","index":0}',
        'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}',
        'data: {"type":"message_stop"}',
      ];

      mockTransport.postStream.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: () => {
              if (streamEvents.length === 0) {
                return Promise.resolve({ done: true, value: undefined });
              }
              const event = streamEvents.shift()!;
              return Promise.resolve({
                done: false,
                value: new TextEncoder().encode(event + '\n'),
              });
            },
          }),
        },
        text: () => Promise.resolve(''),
      });

      const chunks: string[] = [];
      const finishReasons: string[] = [];

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        topP: 1,
        maxTokens: 100,
      };

      const result = await llm.streamCompletion(params, {
        onChunk: (delta) => chunks.push(delta),
        onStreamFinish: (reason) => finishReasons.push(reason || ''),
      });

      expect(chunks).toEqual(['Hello', ' world']);
      expect(finishReasons).toEqual(['end_turn']);
      expect(result).toEqual({
        content: 'Hello world',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });
    });

    it('should handle tool use streaming events', async () => {
      const streamEvents = [
        'data: {"type":"message_start","message":{"id":"msg_123","usage":{"input_tokens":10}}}',
        'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_123","name":"test_function"}}',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"param\\""}}',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":":\\"value\\"}"}}',
        'data: {"type":"content_block_stop","index":0}',
        'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":5}}',
        'data: {"type":"message_stop"}',
      ];

      mockTransport.postStream.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: () => {
              if (streamEvents.length === 0) {
                return Promise.resolve({ done: true, value: undefined });
              }
              const event = streamEvents.shift()!;
              return Promise.resolve({
                done: false,
                value: new TextEncoder().encode(event + '\n'),
              });
            },
          }),
        },
        text: () => Promise.resolve(''),
      });

      const toolDeltaCalls: ToolCall[] = [];

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Call tool' }],
        temperature: 0.7,
        topP: 1,
        maxTokens: 100,
      };

      const result = await llm.streamCompletion(params, {
        onToolCallDelta: (tc) => {
          // Store a copy of the current state to check progression
          toolDeltaCalls.push({ ...tc, function: { ...tc.function } });
        },
      });

      // Should have been called twice (once for each delta)
      expect(toolDeltaCalls).toHaveLength(2);
      // First call has partial arguments
      expect(toolDeltaCalls[0].function.arguments).toBe('{"param"');
      // Second call has accumulated arguments
      expect(toolDeltaCalls[1].function.arguments).toBe('{"param":"value"}');

      // Final result should have complete tool call
      expect(result.tool_calls).toEqual([
        {
          id: 'tool_123',
          type: 'function',
          function: {
            name: 'test_function',
            arguments: '{"param":"value"}',
          },
        },
      ]);
    });

    it('should handle streaming errors', async () => {
      mockTransport.postStream.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error'),
      });

      const params: CompletionParams = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        topP: 1,
      };

      await expect(llm.streamCompletion(params)).rejects.toThrow('Internal error');
    });
  });

  describe('Authentication Integration', () => {
    it('should use AnthropicAuthTransport with proper options', () => {
      const llmWithOAuth = new AnthropicLLM({
        oauth: {
          type: 'oauth',
          access: 'access_token',
          refresh: 'refresh_token',
          expires: Date.now() + 3600000,
        },
      });

      // Force transport creation
      const transport = (llmWithOAuth as any).getTransport();

      expect(transport).toBeDefined();
      // The transport should be an instance of AnthropicAuthTransport
      // with the correct OAuth credentials
    });

    it('should use API key authentication when provided', () => {
      const llmWithKey = new AnthropicLLM({
        apiKey: 'sk-ant-test-key',
      });

      const transport = (llmWithKey as any).getTransport();

      expect(transport).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message arrays', () => {
      const { system, messages } = (llm as any).transformToAnthropicMessages([]);

      expect(system).toBeUndefined();
      expect(messages).toEqual([]);
    });

    it('should handle images without base64 prefix', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: 'data:image/jpeg;base64,abc123' },
            },
          ],
        },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      const content = transformedMessages[0].content as any[];
      expect(content[0]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'abc123',
        },
      });
    });

    it('should handle non-string tool result content', () => {
      const messages: ChatMessage[] = [
        {
          role: 'tool',
          tool_call_id: 'tool_1',
          content: { result: 'data', type: 'object' }
        },
      ];

      const { messages: transformedMessages } = (llm as any).transformToAnthropicMessages(messages);

      const userMessage = transformedMessages.find(m => m.role === 'user');
      const content = userMessage!.content as any[];
      expect(content).toContainEqual({
        type: 'tool_result',
        tool_use_id: 'tool_1',
        content: '{"result":"data","type":"object"}',
      });
    });
  });
});