import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 12000,
    strictPort: true,
    cors: true,
    allowedHosts: ['work-1-mjybvfixjquhywug.prod-runtime.all-hands.dev', 'localhost', '127.0.0.1'],
    hmr: {
      clientPort: 12000,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wails/runtime': path.resolve(__dirname, './wailsjs/runtime/runtime.js'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Exclude Node.js modules that shouldn't be bundled for browser
        'events',
        'fs',
        'path',
        'http',
        'https',
        'url',
        'querystring',
        'buffer',
        'stream',
        'util',
        'zlib',
        'crypto',
        'net',
        'async_hooks',
      ],
    },
  },
});
