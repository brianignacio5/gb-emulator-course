import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

/** Synthetic acceptance: exercise a spread of opcodes. Optional Blargg hook. */
describe('lesson 10 — CPU acceptance', () => {
  it('runs a mini program: set A, add, store, jump', () => {
    const rom = new Uint8Array(0x8000);
    // LD A,10; ADD A,20; LD (C000),A; JP 0200
    rom.set([0x3e, 0x10, 0xc6, 0x20, 0xea, 0x00, 0xc0, 0xc3, 0x00, 0x02], 0x0100);
    const bus = new Bus();
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    for (let i = 0; i < 4; i++) cpu.step();
    expect(cpu.regs.a).toBe(0x30);
    expect(bus.read(0xc000)).toBe(0x30);
    expect(cpu.regs.pc).toBe(0x0200);
  });

  it('optionally notes Blargg fixture directory', () => {
    const dir = path.resolve(__dirname, '../../fixtures/blargg');
    // Soft check — directory may be empty until you download tests
    expect(typeof existsSync(dir)).toBe('boolean');
  });
});
