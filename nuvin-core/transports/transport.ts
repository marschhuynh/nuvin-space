export type HttpHeaders = Record<string, string>;

export interface TransportResponse {
  ok: boolean;
  status: number;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}

export interface HttpTransport {
  postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse>;
  // For SSE or other streamed responses, return the raw Response so callers can read from body
  postStream(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<Response>;
}

type PersistOptions = {
  persistFile?: string; // JSON file path to persist request/response entries
};

export class FetchTransport implements HttpTransport {
  constructor(private opts: PersistOptions = {}) {}

  private async persist(entry: any) {
    if (!this.opts.persistFile) return;
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const file = this.opts.persistFile;
      const dir = path.dirname(file);
      if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let data: any[] = [];
      if (fs.existsSync(file)) {
        try {
          const text = fs.readFileSync(file, 'utf-8');
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) data = parsed;
        } catch {
          // If existing file is invalid, start fresh
          data = [];
        }
      }
      data.push(entry);
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // best-effort only
    }
  }

  async postJson(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available. Use Node 18+ or a compatible runtime.');
    }
    const reqBody = JSON.stringify(body ?? {});
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: reqBody,
      signal,
    });
    // Persist request/response (non-streaming)
    try {
      const clone = res.clone();
      const text = await clone.text();
      let response: any;
      try {
        response = JSON.parse(text);
      } catch {
        response = text;
      }
      await this.persist({
        ts: new Date().toISOString(),
        url,
        method: 'POST',
        headers: { ...(headers || {}) },
        requestBody: body,
        responseStatus: res.status,
        ok: res.ok,
        response,
        stream: false,
      });
    } catch {
      // ignore persistence failures
    }
    return res;
  }
  async postStream(url: string, body: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<Response> {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available. Use Node 18+ or a compatible runtime.');
    }
    const reqBody = JSON.stringify(body ?? {});
    const res = await fetch(url, {
      method: 'POST',
      // Ensure JSON body and allow caller to override/add headers
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: reqBody,
      signal,
    });
    // Persist metadata only for streams (body would be consumed)
    void this.persist({
      ts: new Date().toISOString(),
      url,
      method: 'POST',
      headers: { ...(headers || {}) },
      requestBody: body,
      responseStatus: res.status,
      ok: res.ok,
      stream: true,
    });
    return res;
  }
}
