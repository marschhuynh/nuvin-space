import { describe, it, expect, vi } from 'vitest';
import { BaseLLM } from '../llm-providers/base-llm.js';
import type { CompletionParams, CompletionResult } from '../ports.js';

class TestLLM extends BaseLLM {
  public mockTransport: any;

  constructor(enableCaching: boolean = false) {
    super('https://test.api', { enablePromptCaching: enableCaching });
    
    this.mockTransport = {
      postJson: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      }),
    };
    
    this.transport = this.mockTransport;
  }

  protected createTransport() {
    return this.mockTransport;
  }
}

describe('BaseLLM Prompt Caching', () => {
  it('should not apply caching by default', async () => {
    const llm = new TestLLM(false);
    
    const params: CompletionParams = {
      model: 'test-model',
      messages: [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
      ],
      temperature: 0.7,
      topP: 1,
    };

    await llm.generateCompletion(params);

    const sentBody = llm.mockTransport.postJson.mock.calls[0][1];
    
    expect(sentBody.messages[0].content).toBe('System');
    expect(sentBody.messages[1].content).toBe('User');
  });

  it('should apply caching when enabled', async () => {
    const llm = new TestLLM(true);
    
    const params: CompletionParams = {
      model: 'test-model',
      messages: [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
      ],
      temperature: 0.7,
      topP: 1,
    };

    await llm.generateCompletion(params);

    const sentBody = llm.mockTransport.postJson.mock.calls[0][1];
    
    expect(sentBody.messages[0].content).toEqual([
      { type: 'text', text: 'System', cache_control: { type: 'ephemeral' } }
    ]);
    expect(sentBody.messages[1].content).toEqual([
      { type: 'text', text: 'User', cache_control: { type: 'ephemeral' } }
    ]);
  });

  it('should work with array content when caching enabled', async () => {
    const llm = new TestLLM(true);
    
    const params: CompletionParams = {
      model: 'test-model',
      messages: [
        {
          role: 'system',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' },
          ],
        },
        { role: 'user', content: [{ type: 'text', text: 'Question' }] },
      ],
      temperature: 0.7,
      topP: 1,
    };

    await llm.generateCompletion(params);

    const sentBody = llm.mockTransport.postJson.mock.calls[0][1];
    
    expect(sentBody.messages[0].content[0].cache_control).toBeUndefined();
    expect(sentBody.messages[0].content[1].cache_control).toEqual({ type: 'ephemeral' });
    expect(sentBody.messages[1].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('should cache first 2 system messages and last 2 user/assistant messages', async () => {
    const llm = new TestLLM(true);
    
    const params: CompletionParams = {
      model: 'test-model',
      messages: [
        { role: 'system', content: 'System 1' },
        { role: 'system', content: 'System 2' },
        { role: 'system', content: 'System 3' },
        { role: 'user', content: 'User 1' },
        { role: 'assistant', content: 'Assistant 1' },
        { role: 'user', content: 'User 2' },
      ],
      temperature: 0.7,
      topP: 1,
    };

    await llm.generateCompletion(params);

    const sentBody = llm.mockTransport.postJson.mock.calls[0][1];
    
    expect(sentBody.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(sentBody.messages[1].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(sentBody.messages[2].content).toBe('System 3');
    expect(sentBody.messages[3].content).toBe('User 1');
    expect(sentBody.messages[4].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(sentBody.messages[5].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('should work with streaming when caching enabled', async () => {
    const llm = new TestLLM(true);
    
    llm.mockTransport.postStream = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"test"}}]}\n\n'),
              done: false,
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const params: CompletionParams = {
      model: 'test-model',
      messages: [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
      ],
      temperature: 0.7,
      topP: 1,
    };

    await llm.streamCompletion(params);

    const sentBody = llm.mockTransport.postStream.mock.calls[0][1];
    
    expect(sentBody.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(sentBody.messages[1].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });
});
