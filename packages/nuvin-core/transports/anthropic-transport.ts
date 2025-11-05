import type { HttpTransport, FetchTransport, HttpHeaders, TransportResponse } from './transport.js';

type OAuthCredentials = {
  type: 'oauth';
  access: string;
  refresh: string;
  expires: number;
};

type AuthOptions = {
  apiKey?: string;
  oauth?: OAuthCredentials;
  baseUrl?: string;
};

export class AnthropicAuthTransport implements HttpTransport {
  private apiKey?: string;
  private oauth?: OAuthCredentials;
  private readonly baseUrl: string;
  private readonly inner: FetchTransport;

  constructor(inner: FetchTransport, opts: AuthOptions = {}) {
    this.inner = inner;
    this.apiKey = opts.apiKey;
    this.oauth = opts.oauth;
    this.baseUrl = opts.baseUrl || 'https://api.anthropic.com';
  }

  private async refreshOAuth(signal?: AbortSignal): Promise<void> {
    if (!this.oauth?.refresh) return;
    if (this.oauth.expires > Date.now()) return; // Token still valid

    try {
      const response = await fetch('https://console.anthropic.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.oauth.refresh,
          client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`OAuth token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Update OAuth credentials
      this.oauth = {
        type: 'oauth',
        access: data.access_token,
        refresh: data.refresh_token || this.oauth.refresh,
        expires: Date.now() + data.expires_in * 1000,
      };

      // Note: In a real implementation, you might want to persist these back to config
      // For now, we'll update the in-memory credentials
    } catch (error) {
      throw new Error(`Failed to refresh OAuth token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildFullUrl(path: string): string {
    // If path is relative, prepend the base URL
    if (path.startsWith('/')) {
      return `${this.baseUrl}${path}`;
    }
    // If path is already a full URL, return as-is
    return path;
  }

  private getAuthHeaders(): HttpHeaders {
    const headers: HttpHeaders = {};

    if (this.oauth) {
      headers.authorization = `Bearer ${this.oauth.access}`;
    } else if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    } else {
      throw new Error('No authentication credentials provided');
    }

    // Required Anthropic headers
    headers['anthropic-version'] = '2023-06-01';

    // Add beta headers for advanced features
    headers['anthropic-beta'] = [
      'claude-code-20250219',
      'interleaved-thinking-2025-05-14',
      'fine-grained-tool-streaming-2025-05-14',
    ].join(',');

    return headers;
  }

  async get(url: string, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    if (this.oauth) {
      await this.refreshOAuth(signal);
    }

    const fullUrl = this.buildFullUrl(url);
    const authHeaders = this.getAuthHeaders();
    const mergedHeaders = { ...authHeaders, ...headers };

    return this.inner.get(fullUrl, mergedHeaders, signal);
  }

  async postJson(url: string, body?: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<TransportResponse> {
    // Refresh OAuth token if needed
    if (this.oauth) {
      await this.refreshOAuth(signal);
    }

    const fullUrl = this.buildFullUrl(url);
    const authHeaders = this.getAuthHeaders();
    const mergedHeaders = { ...authHeaders, ...headers };

    return this.inner.postJson(fullUrl, body, mergedHeaders, signal);
  }

  async postStream(url: string, body?: unknown, headers?: HttpHeaders, signal?: AbortSignal): Promise<Response> {
    // Refresh OAuth token if needed
    if (this.oauth) {
      await this.refreshOAuth(signal);
    }

    const fullUrl = this.buildFullUrl(url);
    const authHeaders = this.getAuthHeaders();
    const mergedHeaders = { ...authHeaders, ...headers };

    return this.inner.postStream(fullUrl, body, mergedHeaders, signal);
  }

  // Method to update OAuth credentials (useful for token refresh from config)
  updateCredentials(opts: AuthOptions): void {
    if (opts.apiKey) this.apiKey = opts.apiKey;
    if (opts.oauth) this.oauth = opts.oauth;
  }
}
