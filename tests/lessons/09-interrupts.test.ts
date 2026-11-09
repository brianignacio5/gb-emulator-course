import { describe, expect, it } from 'vitest';
import {
  InterruptController,
  INT_VBLANK,
  INT_STAT,
  INT_TIMER,
  INT_SERIAL,
  INT_JOYPAD,
} from '@emu/interrupts/interrupts.js';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

const VECTORS = [
  { bit: INT_VBLANK, vector: 0x40 },
  { bit: INT_STAT, vector: 0x48 },
  { bit: INT_TIMER, vector: 0x50 },
  { bit: INT_SERIAL, vector: 0x58 },
  { bit: INT_JOYPAD, vector: 0x60 },
] as const;

function cpuWith(program: number[], ic: InterruptController): { cpu: Cpu; bus: Bus } {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus, ic);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  cpu.regs.sp = 0xfffe;
  return { cpu, bus };
}

describe('lesson 09 — interrupts', () => {
  it('priority: VBlank before Timer', () => {
    const ic = new InterruptController();
    ic.ie = 0x1f;
    ic.request(INT_TIMER);
    ic.request(INT_VBLANK);
    const p = ic.pending();
    expect(p?.bit).toBe(INT_VBLANK);
    expect(p?.vector).toBe(0x40);
  });

  it('CPU services each interrupt vector', () => {
    for (const { bit, vector } of VECTORS) {
      const ic = new InterruptController();
      ic.ie = 1 << bit;
      ic.request(bit);
      const { cpu, bus } = cpuWith([0x00], ic);
      cpu.ime = true;
      expect(cpu.step()).toBe(20);
      expect(cpu.regs.pc).toBe(vector);
      expect(cpu.regs.sp).toBe(0xfffc);
      expect(bus.read(0xfffc)).toBe(0x00);
      expect(bus.read(0xfffd)).toBe(0x01);
      expect(cpu.ime).toBe(false);
      expect(ic.pending()).toBeNull();
    }
  });

  it('CPU services interrupts in priority order and acknowledges only the taken bit', () => {
    const ic = new InterruptController();
    ic.ie = 0x1f;
    for (const { bit } of VECTORS) ic.request(bit);
    const { cpu } = cpuWith([0x00], ic);
    for (let i = 0; i < VECTORS.length; i++) {
      cpu.ime = true;
      expect(cpu.step()).toBe(20);
      expect(cpu.regs.pc).toBe(VECTORS[i]!.vector);
      expect(cpu.ime).toBe(false);
      const next = ic.pending();
      if (i === VECTORS.length - 1) {
        expect(next).toBeNull();
      } else {
        expect(next?.bit).toBe(VECTORS[i + 1]!.bit);
        expect(next?.vector).toBe(VECTORS[i + 1]!.vector);
      }
    }
  });

  it('does not service an interrupt when IME is clear', () => {
    const ic = new InterruptController();
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    const { cpu } = cpuWith([0x00], ic);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0101);
    expect(ic.pending()?.bit).toBe(INT_VBLANK);
  });

  it('does not service an interrupt that IE does not enable', () => {
    const ic = new InterruptController();
    ic.ie = 0;
    ic.request(INT_VBLANK);
    const { cpu } = cpuWith([0x00], ic);
    cpu.ime = true;
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0101);
    expect(ic.ifFlag & (1 << INT_VBLANK)).not.toBe(0);
  });

  it('clears halt when an interrupt is serviced', () => {
    const ic = new InterruptController();
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    const { cpu } = cpuWith([0x00], ic);
    cpu.ime = true;
    cpu.halt = true;
    expect(cpu.step()).toBe(20);
    expect(cpu.halt).toBe(false);
    expect(cpu.regs.pc).toBe(0x0040);
  });

  it('DI clears IME and the next instruction still runs', () => {
    const ic = new InterruptController();
    const { cpu } = cpuWith([0xf3, 0x00], ic);
    cpu.ime = true;
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0101);
    expect(cpu.ime).toBe(false);
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0102);
    expect(ic.pending()?.bit).toBe(INT_VBLANK);
  });

  it('EI enables IME after the following instruction', () => {
    const ic = new InterruptController();
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    const { cpu } = cpuWith([0xfb, 0x00, 0x00], ic);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0101);
    expect(cpu.ime).toBe(false);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0102);
    expect(cpu.ime).toBe(false);
    expect(cpu.step()).toBe(20);
    expect(cpu.regs.pc).toBe(0x0040);
  });

  it('DI cancels a pending EI', () => {
    const ic = new InterruptController();
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    const { cpu } = cpuWith([0xfb, 0xf3, 0x00, 0x00], ic);
    expect(cpu.step()).toBe(4);
    expect(cpu.step()).toBe(4);
    expect(cpu.step()).toBe(4);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0104);
    expect(cpu.ime).toBe(false);
  });

  it('RETI pops PC, sets IME immediately, and the next step can service', () => {
    const ic = new InterruptController();
    ic.ie = 1 << INT_VBLANK;
    ic.request(INT_VBLANK);
    const { cpu, bus } = cpuWith([0xd9], ic);
    cpu.regs.sp = 0xfffc;
    bus.write(0xfffc, 0x00);
    bus.write(0xfffd, 0x02);
    expect(cpu.step()).toBe(16);
    expect(cpu.regs.pc).toBe(0x0200);
    expect(cpu.regs.sp).toBe(0xfffe);
    expect(cpu.ime).toBe(true);
    expect(cpu.step()).toBe(20);
    expect(cpu.regs.pc).toBe(0x0040);
  });
});
