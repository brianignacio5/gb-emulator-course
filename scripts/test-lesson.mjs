#!/usr/bin/env node
import { spawn } from 'node:child_process';

const lesson = process.argv[2];
if (!lesson) {
  console.error('Usage: npm run test:lesson -- <NN>');
  console.error('Example: npm run test:lesson -- 01');
  process.exit(1);
}

const id = lesson.padStart(2, '0');
const pattern = `tests/lessons/${id}-`;
const child = spawn('npx', ['vitest', 'run', pattern], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
