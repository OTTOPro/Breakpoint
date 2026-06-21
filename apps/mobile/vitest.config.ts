import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Render React Native components in jsdom via react-native-web.
      'react-native': 'react-native-web',
      // In-memory AsyncStorage for the local-persistence tests.
      '@react-native-async-storage/async-storage': fileURLToPath(
        new URL('./test/asyncStorageMock.ts', import.meta.url),
      ),
      // Lightweight safe-area shim (the real package isn't jsdom-transpilable).
      'react-native-safe-area-context': fileURLToPath(
        new URL('./test/safeAreaMock.tsx', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Integration tests need a live `wrangler dev`; run them separately.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
  },
});
