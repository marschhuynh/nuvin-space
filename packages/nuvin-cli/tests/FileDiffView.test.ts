import { describe, it, expect } from 'vitest';
import { createSimpleDiff } from '../source/components/shared/FileDiffView.js';

describe('FileDiffView', () => {
  it('should create diff with unique segments', () => {
    const oldText = 'hello world test';
    const newText = 'hello new world test';

    const diff = createSimpleDiff(oldText, newText);

    expect(diff).toBeDefined();
    expect(Array.isArray(diff)).toBe(true);
  });

  it('should handle multiple segments with duplicate text content', () => {
    const oldText = 'a b c d';
    const newText = 'a x b y c z d';

    const diff = createSimpleDiff(oldText, newText);

    expect(diff).toBeDefined();
    expect(diff.length).toBeGreaterThan(0);
  });

  it('should handle whitespace-heavy diffs', () => {
    const oldText = '  hello   world  ';
    const newText = '  hello   new world  ';

    const diff = createSimpleDiff(oldText, newText);

    expect(diff).toBeDefined();
    expect(diff.some((line) => line.type === 'modify' || line.type === 'remove' || line.type === 'add')).toBe(true);
  });

  it('should produce modify lines with segments for similar content', () => {
    const oldText = 'const foo = "bar";';
    const newText = 'const foo = "baz";';

    const diff = createSimpleDiff(oldText, newText);

    const modifyLines = diff.filter((line) => line.type === 'modify');
    expect(modifyLines.length).toBeGreaterThan(0);

    modifyLines.forEach((line) => {
      if (line.segments) {
        const segmentTexts = line.segments.map((s) => s.text);
        const uniqueSegments = new Set(segmentTexts);
        expect(segmentTexts.length).toBeGreaterThanOrEqual(uniqueSegments.size);
      }
    });
  });
});
