import { describe, expect, it } from 'vitest';
import { Emulator } from '@emu/emulator.js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('lesson 24 — capstone', () => {
  it('emulator can load a synthetic ROM-only image', () => {
    const rom = new Uint8Array(0x8000);
    rom[0x100] = 0x00; // NOP
    rom[0x147] = 0x00;
    rom[0x148] = 0x00;
    rom[0x149] = 0x00;
    for (let i = 0; i < 10; i++) rom[0x134 + i] = 'CAPSTONE'.charCodeAt(i) || 0;
    const emu = new Emulator();
    emu.loadRom(rom);
    emu.stepInstruction();
    expect(emu.getFramebuffer().length).toBe(160 * 144);
  });

  it('documents accuracy notes in lesson 24', () => {
    const readme = path.resolve(__dirname, '../../lessons/24-capstone/README.md');
    expect(existsSync(readme)).toBe(true);
    const text = readFileSync(readme, 'utf8');
    expect(text.toLowerCase()).toContain('scanline');
  });
});
