import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic only — no jsdom / react-native runtime needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests need a live `wrangler dev`; run them separately.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
  },
});
