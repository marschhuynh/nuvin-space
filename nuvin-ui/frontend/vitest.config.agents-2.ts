import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Test file patterns
    include: [
      'src/lib/agents/__tests__/**/*.test.ts',
    ],

    // Setup files
    setupFiles: [
      'src/test/agent-test-setup.ts',
    ],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/agents/local-agent-refactored.ts',
        'src/lib/agents/base-agent.ts',
      ],
      exclude: [
        'src/lib/agents/__tests__/**',
        'src/lib/agents/**/*.d.ts',
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test timeout for async operations
    testTimeout: 10000,

    // Verbose output
    reporter: ['verbose'],

    // Mock configuration
    clearMocks: true,
  },

  // Resolve configuration for path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
