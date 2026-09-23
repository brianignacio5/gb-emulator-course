import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@emu': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
