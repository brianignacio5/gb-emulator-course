import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

function cpuAt(program: number[]): Cpu {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  return cpu;
}

describe('lesson 07 — control flow', () => {
  it('JP a16', () => {
    const cpu = cpuAt([0xc3, 0x00, 0x02]);
    cpu.step();
    expect(cpu.regs.pc).toBe(0x0200);
  });

  it('JR e', () => {
    const cpu = cpuAt([0x18, 0x02, 0x00, 0x00]);
    cpu.step();
    expect(cpu.regs.pc).toBe(0x0104);
  });

  it('CALL and RET', () => {
    const cpu = cpuAt([0xcd, 0x50, 0x01]);
    // place RET at 0x0150
    const bus = (cpu as unknown as { mem: Bus }).mem ?? null;
    // rewrite via cartridge - need write to rom buffer
    const rom = new Uint8Array(0x8000);
    rom[0x0100] = 0xcd;
    rom[0x0101] = 0x50;
    rom[0x0102] = 0x01;
    rom[0x0150] = 0xc9;
    const b = new Bus();
    b.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const c = new Cpu(b);
    c.regs = new Registers();
    c.regs.resetPostBoot();
    c.regs.sp = 0xfffe;
    c.step();
    expect(c.regs.pc).toBe(0x0150);
    c.step();
    expect(c.regs.pc).toBe(0x0103);
  });

  it('JR NZ taken/not taken', () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0x20, 0x02, 0x00, 0x00], 0x0100);
    const b = new Bus();
    b.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const c = new Cpu(b);
    c.regs = new Registers();
    c.regs.resetPostBoot();
    c.regs.z = false;
    c.step();
    expect(c.regs.pc).toBe(0x0104);
  });
});
