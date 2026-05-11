import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: [
      {
        find: /^react-native$/,
        replacement: path.resolve(__dirname, './test-react-native-alias.ts'),
      },
    ],
  },
});
