import type { HttpHeaders, FetchTransport, HttpTransport, TransportResponse } from './transport';

export class OpenRouterAuthTransport implements HttpTransport {
  constructor(private inner: FetchTransport, private apiKey?: string) {}

  private makeHeaders(headers?: HttpHeaders): HttpHeaders {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenRouter API key missing. Set OPENROUTER_API_KEY or provide a key to OpenRouterAuthTransport.');
    }
    const base: HttpHeaders = headers ? { ...headers } : {};
    base['Authorization'] = `Bearer ${this.apiKey}`;
    return base;
  }

  async postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    return this.inner.postJson(url, body, this.makeHeaders(headers), signal);
  }

  async postStream(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<Response> {
    // Preserve Accept if caller provided, otherwise caller decides; streaming handlers often set SSE header
    return this.inner.postStream(url, body, this.makeHeaders(headers), signal);
  }
}

