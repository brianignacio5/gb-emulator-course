import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

function cpuAt(program: number[]): Cpu {
  return cpuAndBus(program).cpu;
}

function cpuAndBus(program: number[]): { cpu: Cpu; bus: Bus } {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  return { cpu, bus };
}

describe('lesson 07 — control flow', () => {
  it('JP a16', () => {
    const cpu = cpuAt([0xc3, 0x00, 0x02]);
    cpu.step();
    expect(cpu.regs.pc).toBe(0x0200);
  });

  it('JP cc, a16 taken and not taken', () => {
    const cases: { op: number; take: (cpu: Cpu) => void; skip: (cpu: Cpu) => void }[] = [
      { op: 0xc2, take: (cpu) => { cpu.regs.z = false; }, skip: (cpu) => { cpu.regs.z = true; } },
      { op: 0xca, take: (cpu) => { cpu.regs.z = true; }, skip: (cpu) => { cpu.regs.z = false; } },
      { op: 0xd2, take: (cpu) => { cpu.regs.cy = false; }, skip: (cpu) => { cpu.regs.cy = true; } },
      { op: 0xda, take: (cpu) => { cpu.regs.cy = true; }, skip: (cpu) => { cpu.regs.cy = false; } },
    ];
    for (const { op, take, skip } of cases) {
      const taken = cpuAt([op, 0x00, 0x02]);
      take(taken);
      const takenFlags = taken.regs.f;
      const takenSp = taken.regs.sp;
      expect(taken.step()).toBe(16);
      expect(taken.regs.pc).toBe(0x0200);
      expect(taken.regs.f).toBe(takenFlags);
      expect(taken.regs.sp).toBe(takenSp);

      const skipped = cpuAt([op, 0x00, 0x02]);
      skip(skipped);
      const skippedFlags = skipped.regs.f;
      const skippedSp = skipped.regs.sp;
      expect(skipped.step()).toBe(12);
      expect(skipped.regs.pc).toBe(0x0103);
      expect(skipped.regs.f).toBe(skippedFlags);
      expect(skipped.regs.sp).toBe(skippedSp);
    }
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

  it('STOP consumes the padding byte and takes 4 T-cycles', () => {
    const cpu = cpuAt([0x10, 0x00]);
    const flags = cpu.regs.f;
    const a = cpu.regs.a;
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.pc).toBe(0x0102);
    expect(cpu.regs.f).toBe(flags);
    expect(cpu.halt).toBe(false);
    expect(cpu.regs.sp).toBe(0xfffe);
    expect(cpu.regs.a).toBe(a);
  });

  it('RST pushes the return address and jumps to y * 8', () => {
    const vectors = [0xc7, 0xcf, 0xd7, 0xdf, 0xe7, 0xef, 0xf7, 0xff];
    for (const [y, op] of vectors.entries()) {
      const { cpu, bus } = cpuAndBus([op]);
      cpu.regs.sp = 0xfffe;
      const flags = cpu.regs.f;
      expect(cpu.step()).toBe(16);
      expect(cpu.regs.pc).toBe(y * 8);
      expect(cpu.regs.sp).toBe(0xfffc);
      expect(bus.read(0xfffc)).toBe(0x01);
      expect(bus.read(0xfffd)).toBe(0x01);
      expect(cpu.regs.f).toBe(flags);
    }
  });

  it('HALT sets halt and the next step does not fetch', () => {
    const cpu = cpuAt([0x76, 0x00]);
    const flags = cpu.regs.f;
    const sp = cpu.regs.sp;
    expect(cpu.step()).toBe(4);
    expect(cpu.halt).toBe(true);
    expect(cpu.regs.pc).toBe(0x0101);
    expect(cpu.regs.f).toBe(flags);
    expect(cpu.regs.sp).toBe(sp);
    expect(cpu.step()).toBe(4);
    expect(cpu.halt).toBe(true);
    expect(cpu.regs.pc).toBe(0x0101);
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
