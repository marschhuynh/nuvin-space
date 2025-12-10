export type ParseResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export function parseJSON(jsonString: string): ParseResult<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(jsonString || '{}');

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Parsed JSON must be an object, not an array or primitive',
      };
    }

    return { success: true, data: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON syntax',
    };
  }
}
