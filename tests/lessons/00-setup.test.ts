import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

describe('lesson 00 — project setup', () => {
  it('has core course folders', () => {
    const root = path.resolve(__dirname, '../..');
    for (const p of ['src', 'lessons', 'tests', 'solutions', 'roms', 'fixtures']) {
      expect(existsSync(path.join(root, p)), `missing ${p}`).toBe(true);
    }
  });

  it('exports shared types helpers', async () => {
    const mod = await import('@emu/types.js');
    expect(mod.wrap8(256)).toBe(0);
    expect(mod.wrap16(0x10000)).toBe(0);
  });
});
