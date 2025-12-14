import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BashToolRenderer } from '../source/components/ToolResultView/renderers/BashToolRenderer.js';
import type { ToolExecutionResult } from '@nuvin/nuvin-core';

// Mock the theme context
vi.mock('@/contexts/ThemeContext.js', () => {
  return {
    useTheme: vi.fn().mockReturnValue({
      theme: {
        tokens: {
          green: '#61de89',
          red: '#cb675e',
          gray: '#9b9b9b',
          white: '#ffffff',
          dim: '#303030',
        },
      },
    }),
  };
});

// Mock the utils
vi.mock('@/components/ToolResultView/utils.js', () => {
  return {
    parseDetailLines: vi.fn().mockImplementation(({ toolResult }) => {
      if (toolResult.type === 'text') {
        return (toolResult.result as string).split('\n');
      }
      return [];
    }),
  };
});

describe('BashToolRenderer with LatestView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render bash success output with LatestView', () => {
    const mockToolResult: ToolExecutionResult = {
      name: 'bash_tool',
      status: 'success',
      type: 'text',
      result: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
      durationMs: 1000,
    };

    const { lastFrame } = render(
      <BashToolRenderer
        toolResult={mockToolResult}
        cols={80}
        messageId="test-1"
      />
    );

    const output = lastFrame();
    
    // Should contain status indicator
    expect(output).toContain('✓ Command output');
    
    // Should contain LatestView border
    expect(output).toContain('┌');
    expect(output).toContain('└');
    
    // Should contain some of the output lines
    expect(output).toContain('Line');
    
    // Should contain summary info
    expect(output).toContain('10 lines total');
  });

  it('should render bash error output with LatestView', () => {
    const mockToolResult: ToolExecutionResult = {
      name: 'bash_tool',
      status: 'error',
      type: 'text',
      result: 'Error: Command not found\nUsage: command [options]',
      durationMs: 500,
    };

    const { lastFrame } = render(
      <BashToolRenderer
        toolResult={mockToolResult}
        cols={80}
        messageId="test-2"
      />
    );

    const output = lastFrame();
    
    // Should contain status indicator
    expect(output).toContain('✗ Command output');
    
    // Should contain LatestView border
    expect(output).toContain('┌');
    expect(output).toContain('└');
    
    // Should contain error output
    expect(output).toContain('Error');
  });

  it('should handle large output and show last lines', () => {
    const largeOutput = Array.from({ length: 25 }, (_, i) => `Output line ${i + 1}`).join('\n');
    
    const mockToolResult: ToolExecutionResult = {
      name: 'bash_tool',
      status: 'success',
      type: 'text',
      result: largeOutput,
      durationMs: 2000,
    };

    const { lastFrame } = render(
      <BashToolRenderer
        toolResult={mockToolResult}
        cols={80}
        messageId="test-3"
      />
    );

    const output = lastFrame();
    
    // Should show last lines by default
    expect(output).toContain('25 lines total');
    
    // Should contain LatestView component
    expect(output).toContain('┌');
    expect(output).toContain('Showing last');
  });

  it('should render in fullMode with more lines visible', () => {
    const mockToolResult: ToolExecutionResult = {
      name: 'bash_tool',
      status: 'success',
      type: 'text',
      result: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      durationMs: 1000,
    };

    const { lastFrame } = render(
      <BashToolRenderer
        toolResult={mockToolResult}
        cols={80}
        messageId="test-4"
        fullMode={true}
      />
    );

    const output = lastFrame();
    
    // Should contain status indicator without expand hint
    expect(output).toContain('✓ Command output');
    expect(output).not.toContain('Press Enter');
    
    // Should contain all lines in full mode
    expect(output).toContain('5 lines total');
  });

  it('should handle empty output gracefully', () => {
    const mockToolResult: ToolExecutionResult = {
      name: 'bash_tool',
      status: 'success',
      type: 'text',
      result: '',
      durationMs: 100,
    };

    const { lastFrame } = render(
      <BashToolRenderer
        toolResult={mockToolResult}
        cols={80}
        messageId="test-5"
      />
    );

    const output = lastFrame();
    
    // Should return empty string for empty output in success case
    expect(output).toBe('');
  });
});