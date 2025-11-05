import type { LLMPort } from '../ports.js';
import { BaseLLM } from './base-llm.js';
import { FetchTransport, GithubAuthTransport } from '../transports/index.js';

type GithubOptions = { apiKey?: string; accessToken?: string; apiUrl?: string; httpLogFile?: string };

export class GithubLLM extends BaseLLM implements LLMPort {
  private readonly opts: GithubOptions;

  constructor(opts: GithubOptions = {}) {
    super(opts.apiUrl ?? 'https://api.individual.githubcopilot.com');
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
    return new GithubAuthTransport(base, {
      baseUrl: this.opts.apiUrl,
      apiKey: this.opts.apiKey,
      accessToken: this.opts.accessToken,
    });
  }
}
