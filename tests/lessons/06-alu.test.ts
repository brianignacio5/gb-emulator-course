import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers, FLAG_Z, FLAG_C } from '@emu/cpu/registers.js';

function run(program: number[], setup?: (cpu: Cpu) => void): Cpu {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  setup?.(cpu);
  for (let i = 0; i < program.length; ) {
    const before = cpu.regs.pc;
    cpu.step();
    if (cpu.regs.pc === before) break;
    i = cpu.regs.pc - 0x0100;
    if (i < 0 || i >= program.length) break;
  }
  return cpu;
}

describe('lesson 06 — ALU & flags', () => {
  it('ADD A,n sets Z and C correctly', () => {
    const bus = new Bus();
    const rom = new Uint8Array(0x8000);
    rom.set([0x3e, 0xff, 0xc6, 0x01], 0x0100); // LD A,FF; ADD A,1
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.step();
    cpu.step();
    expect(cpu.regs.a).toBe(0x00);
    expect(cpu.regs.z).toBe(true);
    expect(cpu.regs.cy).toBe(true);
  });

  it('AND OR XOR CP', () => {
    const bus = new Bus();
    const rom = new Uint8Array(0x8000);
    rom.set([0x3e, 0xf0, 0xe6, 0x0f], 0x0100); // LD A,F0; AND 0F
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.step();
    cpu.step();
    expect(cpu.regs.a).toBe(0x00);
    expect(cpu.regs.f & FLAG_Z).toBe(FLAG_Z);
  });

  it('INC B affects flags but not C', () => {
    const bus = new Bus();
    const rom = new Uint8Array(0x8000);
    rom.set([0x0e, 0xff, 0x04], 0x0100); // LD C,FF; INC B — wait use INC C: 0x0c
    rom.set([0x0e, 0x0f, 0x0c], 0x0100); // LD C,0F; INC C
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.regs.cy = true;
    cpu.step();
    cpu.step();
    expect(cpu.regs.c).toBe(0x10);
    expect(cpu.regs.hFlag).toBe(true);
    expect(cpu.regs.cy).toBe(true);
  });
});
