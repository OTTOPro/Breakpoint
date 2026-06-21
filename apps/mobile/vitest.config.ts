import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic only — no jsdom / react-native runtime needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
