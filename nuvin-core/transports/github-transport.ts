import type { HttpTransport, FetchTransport, HttpHeaders, TransportResponse } from './transport';

type TokenExchangeResponse = { token?: string };

export class GithubAuthTransport implements HttpTransport {
  private apiKey?: string;
  private accessToken?: string;
  private readonly inner: HttpTransport;

  constructor(inner: FetchTransport, opts: { apiKey?: string; accessToken?: string }) {
    this.inner = inner;
    this.apiKey = opts.apiKey;
    this.accessToken = opts.accessToken;
  }

  private async exchangeToken(signal?: AbortSignal): Promise<void> {
    if (!this.accessToken) return;
    if (typeof fetch !== 'function') throw new Error('Global fetch not available for token exchange');
    const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'user-agent': 'GithubCopilot/1.330.0',
        accept: 'application/json',
      },
      signal,
    });
    if (!res.ok) {
      // Fallback: use access token directly as API key
      this.apiKey = this.accessToken;
      return;
    }
    const data = (await res.json()) as TokenExchangeResponse;
    this.apiKey = data?.token || this.accessToken;
  }

  private makeAuthHeaders(url: string, headers?: HttpHeaders): HttpHeaders {
    const base: HttpHeaders = headers ? { ...headers } : {};
    if (this.apiKey) base['Authorization'] = `Bearer ${this.apiKey}`;
    // Inject standard Copilot headers for Copilot API host
    if (url.startsWith('https://api.githubcopilot.com')) {
      base['editor-version'] = base['editor-version'] || 'vscode/1.100.3';
      base['editor-plugin-version'] = base['editor-plugin-version'] || 'GitHub.copilot/1.330.0';
      base['user-agent'] = base['user-agent'] || 'GithubCopilot/1.330.0';
    }
    return base;
  }

  async postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    // Ensure we have an API key if possible
    if (!this.apiKey && this.accessToken) {
      await this.exchangeToken(signal);
    }

    let res = await this.inner.postJson(url, body, this.makeAuthHeaders(url, headers), signal);
    if (res.status === 401 && this.accessToken) {
      // Refresh and retry once
      await this.exchangeToken(signal);
      res = await this.inner.postJson(url, body, this.makeAuthHeaders(url, headers), signal);
    }
    return res;
  }

  async postStream(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<Response> {
    // Ensure we have an API key if possible
    if (!this.apiKey && this.accessToken) {
      await this.exchangeToken(signal);
    }

    // Default SSE accept header for Copilot streams if not provided
    const hdrs = this.makeAuthHeaders(url, { Accept: 'text/event-stream', ...(headers || {}) });
    let res = await this.inner.postStream(url, body, hdrs, signal);
    if (res.status === 401 && this.accessToken) {
      // Refresh and retry once
      await this.exchangeToken(signal);
      res = await this.inner.postStream(url, body, this.makeAuthHeaders(url, hdrs), signal);
    }
    return res;
  }
}
