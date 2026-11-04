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
    expect(cpu.step()).toBe(8);
    expect(cpu.regs.b).toBe(0x42);
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.a).toBe(0x42);
  });

  it('LD (HL), imm8', () => {
    const { cpu, bus } = makeCpu([0x36, 0x42]);
    cpu.regs.hl = 0xc000;
    expect(cpu.step()).toBe(12);
    expect(bus.read(0xc000)).toBe(0x42);
  });

  it('LD r16, imm16', () => {
    const bc = makeCpu([0x01, 0x34, 0x12]).cpu; // LD BC, 0x1234
    const bcFlags = bc.regs.f;
    expect(bc.step()).toBe(12);
    expect(bc.regs.bc).toBe(0x1234);
    expect(bc.regs.f).toBe(bcFlags);

    const sp = makeCpu([0x31, 0xf0, 0xff]).cpu; // LD SP, 0xFFF0
    const spFlags = sp.regs.f;
    const a = sp.regs.a;
    expect(sp.step()).toBe(12);
    expect(sp.regs.sp).toBe(0xfff0);
    expect(sp.regs.a).toBe(a);
    expect(sp.regs.f).toBe(spFlags);
  });

  it('PUSH/POP BC', () => {
    const { cpu, bus } = makeCpu([0xc5, 0x01, 0x00, 0x00, 0xc1]);
    cpu.regs.bc = 0x1234;
    cpu.regs.sp = 0xfffe;
    expect(cpu.step()).toBe(16); // PUSH BC
    expect(cpu.regs.sp).toBe(0xfffc);
    expect(bus.read(0xfffc)).toBe(0x34);
    expect(bus.read(0xfffd)).toBe(0x12);
    cpu.regs.bc = 0;
    cpu.regs.pc = 0x0104;
    expect(cpu.step()).toBe(12); // POP BC at 0x0104
    expect(cpu.regs.bc).toBe(0x1234);
  });

  it('POP AF masks the low nibble of F', () => {
    const { cpu } = makeCpu([0xf5, 0xf1]);
    cpu.regs.a = 0x12;
    cpu.regs.f = 0xf3;
    cpu.regs.sp = 0xfffe;
    expect(cpu.step()).toBe(16);
    cpu.regs.af = 0;
    expect(cpu.step()).toBe(12);
    expect(cpu.regs.a).toBe(0x12);
    expect(cpu.regs.f).toBe(0xf0);
  });

  it('LD (HL),A and LD A,(HL)', () => {
    const { cpu, bus } = makeCpu([0x77, 0x7e]);
    cpu.regs.hl = 0xc000;
    cpu.regs.a = 0x55;
    expect(cpu.step()).toBe(8);
    expect(bus.read(0xc000)).toBe(0x55);
    cpu.regs.a = 0;
    expect(cpu.step()).toBe(8);
    expect(cpu.regs.a).toBe(0x55);
  });

  it('LD (r16mem), A and LD A, (r16mem)', () => {
    const bc = makeCpu([0x02, 0x0a]);
    bc.cpu.regs.bc = 0xc000;
    bc.cpu.regs.a = 0x55;
    expect(bc.cpu.step()).toBe(8);
    expect(bc.bus.read(0xc000)).toBe(0x55);
    expect(bc.cpu.regs.bc).toBe(0xc000);
    bc.cpu.regs.a = 0;
    expect(bc.cpu.step()).toBe(8);
    expect(bc.cpu.regs.a).toBe(0x55);
    expect(bc.cpu.regs.bc).toBe(0xc000);

    const de = makeCpu([0x12, 0x1a]);
    de.cpu.regs.de = 0xc000;
    de.cpu.regs.a = 0x55;
    expect(de.cpu.step()).toBe(8);
    expect(de.bus.read(0xc000)).toBe(0x55);
    expect(de.cpu.regs.de).toBe(0xc000);
    de.cpu.regs.a = 0;
    expect(de.cpu.step()).toBe(8);
    expect(de.cpu.regs.a).toBe(0x55);
    expect(de.cpu.regs.de).toBe(0xc000);

    const hlIncStore = makeCpu([0x22]);
    hlIncStore.cpu.regs.hl = 0xc000;
    hlIncStore.cpu.regs.a = 0x55;
    expect(hlIncStore.cpu.step()).toBe(8);
    expect(hlIncStore.bus.read(0xc000)).toBe(0x55);
    expect(hlIncStore.cpu.regs.hl).toBe(0xc001);

    const hlDecStore = makeCpu([0x32]);
    hlDecStore.cpu.regs.hl = 0xc000;
    hlDecStore.cpu.regs.a = 0x55;
    expect(hlDecStore.cpu.step()).toBe(8);
    expect(hlDecStore.bus.read(0xc000)).toBe(0x55);
    expect(hlDecStore.cpu.regs.hl).toBe(0xbfff);

    const hlIncLoad = makeCpu([0x2a]);
    hlIncLoad.bus.write(0xc000, 0x55);
    hlIncLoad.cpu.regs.hl = 0xc000;
    hlIncLoad.cpu.regs.a = 0;
    expect(hlIncLoad.cpu.step()).toBe(8);
    expect(hlIncLoad.cpu.regs.a).toBe(0x55);
    expect(hlIncLoad.cpu.regs.hl).toBe(0xc001);

    const hlDecLoad = makeCpu([0x3a]);
    hlDecLoad.bus.write(0xc000, 0x55);
    hlDecLoad.cpu.regs.hl = 0xc000;
    hlDecLoad.cpu.regs.a = 0;
    expect(hlDecLoad.cpu.step()).toBe(8);
    expect(hlDecLoad.cpu.regs.a).toBe(0x55);
    expect(hlDecLoad.cpu.regs.hl).toBe(0xbfff);
  });

  it('LD (imm16), SP', () => {
    const { cpu, bus } = makeCpu([0x08, 0x00, 0xc0]);
    cpu.regs.sp = 0xbeef;
    const flags = cpu.regs.f;
    expect(cpu.step()).toBe(20);
    expect(bus.read(0xc000)).toBe(0xef);
    expect(bus.read(0xc001)).toBe(0xbe);
    expect(cpu.regs.sp).toBe(0xbeef);
    expect(cpu.regs.f).toBe(flags);
  });

  it('block 3 loads', () => {
    const ldh = makeCpu([0xe0, 0x01, 0xf0, 0x01]);
    ldh.cpu.regs.a = 0x42;
    expect(ldh.cpu.step()).toBe(12);
    expect(ldh.bus.read(0xff01)).toBe(0x42);
    ldh.cpu.regs.a = 0;
    expect(ldh.cpu.step()).toBe(12);
    expect(ldh.cpu.regs.a).toBe(0x42);

    const ldhC = makeCpu([0xe2, 0xf2]);
    ldhC.cpu.regs.a = 0x42;
    ldhC.cpu.regs.c = 0x02;
    expect(ldhC.cpu.step()).toBe(8);
    expect(ldhC.bus.read(0xff02)).toBe(0x42);
    ldhC.cpu.regs.a = 0;
    expect(ldhC.cpu.step()).toBe(8);
    expect(ldhC.cpu.regs.a).toBe(0x42);

    const abs = makeCpu([0xea, 0x00, 0xc0, 0xfa, 0x00, 0xc0]);
    abs.cpu.regs.a = 0x42;
    expect(abs.cpu.step()).toBe(16);
    expect(abs.bus.read(0xc000)).toBe(0x42);
    abs.cpu.regs.a = 0;
    expect(abs.cpu.step()).toBe(16);
    expect(abs.cpu.regs.a).toBe(0x42);

    const spHl = makeCpu([0xf9]).cpu;
    spHl.regs.hl = 0x1234;
    const flags = spHl.regs.f;
    expect(spHl.step()).toBe(8);
    expect(spHl.regs.sp).toBe(0x1234);
    expect(spHl.regs.hl).toBe(0x1234);
    expect(spHl.regs.f).toBe(flags);
  });
});
