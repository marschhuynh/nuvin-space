// Minimal HTTP transport abstraction so LLMs don't depend on fetch directly.

export type HttpHeaders = Record<string, string>;

export interface TransportResponse {
  ok: boolean;
  status: number;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}

export interface HttpTransport {
  postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse>;
}

class FetchResponseWrapper implements TransportResponse {
  constructor(private res: Response) {}
  get ok() {
    return this.res.ok;
  }
  get status() {
    return this.res.status;
  }
  async json<T>(): Promise<T> {
    const resp = await this.res.json();
    console.debug(`[fetch-transport]`, JSON.stringify(resp, null, 2));
    return resp;
  }
  text(): Promise<string> {
    return this.res.text();
  }
}

export class FetchTransport implements HttpTransport {
  async postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available. Use Node 18+ or a compatible runtime.');
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: JSON.stringify(body ?? {}),
      signal,
    });
    return new FetchResponseWrapper(res);
  }
}

