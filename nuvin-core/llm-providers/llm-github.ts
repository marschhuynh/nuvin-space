import type { LLMPort } from '../ports';
import { BaseLLM } from './base-llm';
import { FetchTransport, GithubAuthTransport } from '../transports';

type GithubOptions = { apiKey?: string; accessToken?: string; apiUrl?: string };

export class GithubLLM extends BaseLLM implements LLMPort {
  private readonly opts: GithubOptions;

  constructor(opts: GithubOptions = {}) {
    super(opts.apiUrl ?? 'https://api.githubcopilot.com');
    this.opts = opts;
  }

  protected createTransport() {
    const base = new FetchTransport({ persistFile: '.history/http-log.json' })
    return new GithubAuthTransport(base, { apiKey: this.opts.apiKey, accessToken: this.opts.accessToken });
  }
}
