#!/usr/bin/env node
import { spawn } from 'node:child_process';

const child = spawn('npx', ['vitest', 'run'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, USE_SOLUTIONS: '1' },
});
child.on('exit', (code) => process.exit(code ?? 1));
