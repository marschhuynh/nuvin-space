import { describe, it, expect } from 'vitest';
import { WebFetchTool } from '../tools/WebFetchTool';

describe('WebFetchTool', () => {
  const tool = new WebFetchTool();

  it('converts HTML to Markdown', async () => {
    const result = await tool.execute({ url: 'https://example.com' });

    expect(result.status).toBe('success');
    expect(result.type).toBe('text');
    expect(result.result).toContain('Example Domain');
    expect(result.result).toContain('#'); // Should have markdown headers
    expect(result.result).not.toContain('<html>'); // Should not have HTML tags
    expect(result.result).not.toContain('<body>'); // Should not have HTML tags
  });

  it('returns error for invalid URL', async () => {
    const result = await tool.execute({ url: 'https://this-domain-does-not-exist-99999.com' });

    expect(result.status).toBe('error');
    expect(result.type).toBe('text');
  });

  it('returns error for empty URL', async () => {
    const result = await tool.execute({ url: '' });

    expect(result.status).toBe('error');
    expect(result.result).toContain('required');
  });

  it('has correct tool definition', () => {
    const definition = tool.definition();

    expect(definition.name).toBe('web_fetch');
    expect(definition.description).toContain('Markdown');
    expect(definition.parameters.properties).toHaveProperty('url');
    expect(definition.parameters.required).toContain('url');
  });
});