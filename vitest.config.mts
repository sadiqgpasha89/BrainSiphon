import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { 'server-only': fileURLToPath(new URL('./src/test/empty.ts', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    testTimeout: 20_000,
    coverage: { reporter: ['text-summary'] },
  },
});
