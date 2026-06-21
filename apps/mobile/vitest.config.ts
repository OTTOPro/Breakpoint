import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Render React Native components in jsdom via react-native-web.
    alias: { 'react-native': 'react-native-web' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Integration tests need a live `wrangler dev`; run them separately.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
  },
});
