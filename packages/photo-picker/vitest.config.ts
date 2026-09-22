import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react-native$/,
        replacement: path.resolve(__dirname, './src/test/reactNativeTestAlias.ts'),
      },
      {
        find: /^expo-modules-core$/,
        replacement: path.resolve(__dirname, './src/test/expoModulesCoreTestAlias.ts'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
