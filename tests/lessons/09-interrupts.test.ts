import { describe, expect, it } from 'vitest';
import { InterruptController, INT_VBLANK, INT_TIMER } from '@emu/interrupts/interrupts.js';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

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

  it('CPU services interrupt when IME set', () => {
    const ic = new InterruptController();
    ic.ie = 0x01;
    ic.request(INT_VBLANK);
    const bus = new Bus();
    const rom = new Uint8Array(0x8000);
    rom[0x0100] = 0x00; // NOP
    bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
    const cpu = new Cpu(bus, ic);
    cpu.regs = new Registers();
    cpu.regs.resetPostBoot();
    cpu.regs.sp = 0xfffe;
    cpu.ime = true;
    const cycles = cpu.step();
    expect(cpu.regs.pc).toBe(0x0040);
    expect(cycles).toBe(20);
    expect(ic.pending()?.bit).not.toBe(INT_VBLANK);
  });
});
