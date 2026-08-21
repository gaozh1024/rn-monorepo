import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-native',
    '@react-navigation/native',
    'expo-image',
    'expo-image-manipulator',
    'react-native-safe-area-context',
    'react-native-zoom-toolkit',
  ],
});
