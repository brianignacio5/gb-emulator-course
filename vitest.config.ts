import path from 'node:path';
import { defineConfig } from 'vitest/config';

const useSolutions = process.env.USE_SOLUTIONS === '1';
const emuRoot = useSolutions
  ? path.resolve(__dirname, 'solutions/complete')
  : path.resolve(__dirname, 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@emu': emuRoot,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
