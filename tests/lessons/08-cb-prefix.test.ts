import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

describe('lesson 08 — CB prefix', () => {
  it('RLC B and BIT 7,B', () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0xcb, 0x00, 0xcb, 0x78], 0x0100); // RLC B; BIT 7,B
    const bus = new Bus();
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.regs.b = 0x80;
    cpu.step();
    expect(cpu.regs.b).toBe(0x01);
    expect(cpu.regs.cy).toBe(true);
    cpu.step();
    expect(cpu.regs.z).toBe(true); // bit 7 of 0x01 is 0
  });

  it('SWAP A and SET/RES', () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0xcb, 0x37, 0xcb, 0xc7, 0xcb, 0x87], 0x0100);
    const bus = new Bus();
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.regs.a = 0x1f;
    cpu.step();
    expect(cpu.regs.a).toBe(0xf1);
    cpu.step(); // SET 0,A
    expect(cpu.regs.a & 1).toBe(1);
    cpu.step(); // RES 0,A
    expect(cpu.regs.a & 1).toBe(0);
  });
});
