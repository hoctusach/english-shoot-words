import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/english-shoot-words/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2015',
    sourcemap: false,
  },
});
