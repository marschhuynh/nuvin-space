import type { LLMPort } from '../ports.js';
import { BaseLLM } from './base-llm.js';
import { FetchTransport, ZAIAuthTransport } from '../transports/index.js';

type ZaiOptions = { apiKey?: string; apiUrl?: string; httpLogFile?: string };

export class ZaiLLM extends BaseLLM implements LLMPort {
  private readonly opts: ZaiOptions;

  constructor(opts: ZaiOptions = {}) {
    super('https://api.z.ai/api/coding/paas/v4');
    this.opts = opts;
  }

  protected createTransport() {
    const base = new FetchTransport({
      persistFile: this.opts.httpLogFile,
      logLevel: 'INFO',
      enableConsoleLog: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB before rotation
      captureResponseBody: true, // Disable for better performance
    });
    return new ZAIAuthTransport(base, this.opts.apiKey, this.apiUrl);
  }
}
