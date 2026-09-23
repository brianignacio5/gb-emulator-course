import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

function cpuWithRom(bytes: number[]): Cpu {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(bytes, 0x0100);
  bus.cartridge = {
    read: (a) => rom[a] ?? 0xff,
    write: () => {},
  };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  return cpu;
}

describe('lesson 04 — CPU skeleton', () => {
  it('NOP advances PC and takes 4 T-cycles', () => {
    const cpu = cpuWithRom([0x00]);
    const cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.regs.pc).toBe(0x0101);
  });
});
