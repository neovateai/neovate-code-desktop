import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tailwindcss(),
  ],
  base: './',
  root: 'src/renderer',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      onLog(level, log, handler) {
        // Suppress warnings from @hugeicons/core-free-icons ESM files containing
        // /*#__PURE__*/ annotations in positions Rollup cannot interpret.
        // These warnings are harmless - Rollup auto-removes the comments.
        // See: https://github.com/rollup/rollup/issues/5324
        if (
          level === 'warn' &&
          log.id?.includes('@hugeicons') &&
          log.message?.includes('annotation')
        ) {
          return;
        }
        handler(level, log);
      },
    },
  },
  server: {
    port: 5173,
  },
});
