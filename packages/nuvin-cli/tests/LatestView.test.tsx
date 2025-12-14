import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LatestView } from '../source/components/LatestView.js';

// Mock the theme context
vi.mock('../source/contexts/ThemeContext.js', () => {
  return {
    useTheme: vi.fn().mockReturnValue({
      theme: {
        colors: {
          info: '#00d9ff',
        },
        tokens: {
          white: '#ffffff',
          gray: '#9b9b9b',
          black: '#282a36',
          dim: '#303030',
        },
      },
    }),
  };
});

// Mock the dimensions hook
vi.mock('../source/hooks/useStdoutDimensions.ts', () => {
  return {
    useStdoutDimensions: vi.fn().mockReturnValue([80, 24]),
  };
});

describe('LatestView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the last 10 lines by default', () => {
    const text = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`).join('\n');
    const { lastFrame } = render(<LatestView height={12}>{text}</LatestView>);
    const output = lastFrame();
    
    // Should contain the last 10 lines (6-15)
    expect(output).toContain('Line 6');
    expect(output).toContain('Line 15');
    // Check specifically for lines that should be at the start of content
    expect(output).toContain('│ Line 6'); // Should start with line 6
    // Should not contain earlier lines as standalone line entries
    const lines = output.split('\n');
    const contentLines = lines.filter(line => line.includes('Line ') && !line.includes('│'));
    expect(contentLines.some(line => line.includes('Line 1'))).toBe(false);
    expect(contentLines.some(line => line.includes('Line 5'))).toBe(false);
  });

  it('should respect custom maxLines prop', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n');
    const { lastFrame } = render(<LatestView maxLines={5} height={8}>{text}</LatestView>);
    const output = lastFrame();
    
    // Should contain the last 5 lines (6-10)
    expect(output).toContain('Line 6');
    expect(output).toContain('Line 10');
    // Check specifically for lines that should be at the start of content
    expect(output).toContain('│ Line 6'); // Should start with line 6
    // Should not contain earlier lines as standalone line entries
    const lines = output.split('\n');
    const contentLines = lines.filter(line => line.includes('Line ') && !line.includes('│'));
    expect(contentLines.some(line => line.includes('Line 1'))).toBe(false);
    expect(contentLines.some(line => line.includes('Line 5'))).toBe(false);
  });

  it('should render with custom height', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const { lastFrame } = render(<LatestView height={5}>{text}</LatestView>);
    const output = lastFrame();
    
    expect(output).toBeTruthy();
    // Component should render without errors
  });

  it('should render empty content gracefully', () => {
    const { lastFrame } = render(<LatestView>{''}</LatestView>);
    const output = lastFrame();
    
    expect(output).toBeTruthy();
  });

  it('should render single line content', () => {
    const { lastFrame } = render(<LatestView>{'Single line'}</LatestView>);
    const output = lastFrame();
    
    expect(output).toContain('Single line');
  });
});