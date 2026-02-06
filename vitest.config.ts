import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/main/**/*.{test,spec}.{ts,tsx}',
      'src/renderer/**/*.{test,spec}.{ts,tsx}',
      'src/shared/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
