import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Emulator } from '@emu/emulator.js';

describe('lesson 17 — UI / emulator run loop', () => {
  it('emulator exposes framebuffer and stepFrame', () => {
    const emu = new Emulator();
    expect(emu.getFramebuffer().length).toBe(160 * 144);
    expect(typeof emu.stepFrame).toBe('function');
  });

  it('index.html exists for Vite', () => {
    expect(existsSync(path.resolve(__dirname, '../../index.html'))).toBe(true);
  });
});
