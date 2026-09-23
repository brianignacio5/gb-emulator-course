import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

function makeCpu(program: number[]): { cpu: Cpu; bus: Bus } {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = {
    read: (a) => rom[a] ?? 0xff,
    write: () => {},
  };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  return { cpu, bus };
}

describe('lesson 05 — loads & stack', () => {
  it('LD r,r and LD r,d8', () => {
    // LD B,0x42 ; LD A,B
    const { cpu } = makeCpu([0x06, 0x42, 0x78]);
    cpu.step();
    cpu.step();
    expect(cpu.regs.b).toBe(0x42);
    expect(cpu.regs.a).toBe(0x42);
  });

  it('PUSH/POP BC', () => {
    const { cpu } = makeCpu([0xc5, 0x01, 0x00, 0x00, 0xc1]);
    cpu.regs.bc = 0x1234;
    cpu.regs.sp = 0xfffe;
    cpu.step(); // PUSH BC
    expect(cpu.regs.sp).toBe(0xfffc);
    cpu.regs.bc = 0;
    cpu.regs.pc = 0x0104;
    cpu.step(); // POP BC at 0x0104
    expect(cpu.regs.bc).toBe(0x1234);
  });

  it('LD (HL),A and LD A,(HL)', () => {
    const { cpu, bus } = makeCpu([0x77, 0x7e]);
    cpu.regs.hl = 0xc000;
    cpu.regs.a = 0x55;
    cpu.step();
    expect(bus.read(0xc000)).toBe(0x55);
    cpu.regs.a = 0;
    cpu.step();
    expect(cpu.regs.a).toBe(0x55);
  });
});
