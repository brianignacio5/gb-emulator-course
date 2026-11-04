import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers, FLAG_Z } from '@emu/cpu/registers.js';

function makeCpu(program: number[], setup?: (cpu: Cpu, bus: Bus) => void): { cpu: Cpu; bus: Bus } {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  setup?.(cpu, bus);
  return { cpu, bus };
}

function expectFlags(cpu: Cpu, z: boolean, n: boolean, h: boolean, c: boolean) {
  expect(cpu.regs.z).toBe(z);
  expect(cpu.regs.n).toBe(n);
  expect(cpu.regs.hFlag).toBe(h);
  expect(cpu.regs.cy).toBe(c);
}

describe('lesson 06 — ALU & flags', () => {
  it('ADD A,n sets Z and C correctly', () => {
    const { cpu } = makeCpu([0x3e, 0xff, 0xc6, 0x01]); // LD A,FF; ADD A,1
    cpu.step();
    cpu.step();
    expect(cpu.regs.a).toBe(0x00);
    expect(cpu.regs.z).toBe(true);
    expect(cpu.regs.cy).toBe(true);
  });

  it('AND A,n sets Z and H and clears N and C', () => {
    const { cpu } = makeCpu([0x3e, 0xf0, 0xe6, 0x0f]); // LD A,F0; AND 0F
    cpu.step();
    cpu.step();
    expect(cpu.regs.a).toBe(0x00);
    expect(cpu.regs.f & FLAG_Z).toBe(FLAG_Z);
    expectFlags(cpu, true, false, true, false);
  });

  it('ADC SUB SBC XOR OR CP immediate', () => {
    const adc = makeCpu([0x3e, 0x0f, 0xce, 0x01], (cpu) => {
      cpu.regs.cy = true;
    }).cpu; // LD A,0F; ADC A,1
    adc.step();
    adc.step();
    expect(adc.regs.a).toBe(0x11);
    expectFlags(adc, false, false, true, false);

    const sub = makeCpu([0x3e, 0x10, 0xd6, 0x01]).cpu; // LD A,10; SUB 1
    sub.step();
    sub.step();
    expect(sub.regs.a).toBe(0x0f);
    expectFlags(sub, false, true, true, false);

    const sbc = makeCpu([0x3e, 0x00, 0xde, 0x00], (cpu) => {
      cpu.regs.cy = true;
    }).cpu; // LD A,0; SBC A,0
    sbc.step();
    sbc.step();
    expect(sbc.regs.a).toBe(0xff);
    expectFlags(sbc, false, true, true, true);

    const xor = makeCpu([0x3e, 0xff, 0xee, 0xff]).cpu; // LD A,FF; XOR FF
    xor.step();
    xor.step();
    expect(xor.regs.a).toBe(0x00);
    expectFlags(xor, true, false, false, false);

    const or = makeCpu([0x3e, 0xf0, 0xf6, 0x0f]).cpu; // LD A,F0; OR 0F
    or.step();
    or.step();
    expect(or.regs.a).toBe(0xff);
    expectFlags(or, false, false, false, false);

    const cp = makeCpu([0x3e, 0x3c, 0xfe, 0x3c]).cpu; // LD A,3C; CP 3C
    cp.step();
    cp.step();
    expect(cp.regs.a).toBe(0x3c);
    expectFlags(cp, true, true, false, false);
  });

  it('ADD A,r and ADD A,(HL)', () => {
    const { cpu } = makeCpu([0x80], (c) => {
      c.regs.a = 0x01;
      c.regs.b = 0x01;
    });
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.a).toBe(0x02);
    expectFlags(cpu, false, false, false, false);

    const mem = makeCpu([0x86], (c, bus) => {
      c.regs.a = 0x01;
      c.regs.hl = 0xc000;
      bus.write(0xc000, 0xff);
    });
    expect(mem.cpu.step()).toBe(8);
    expect(mem.cpu.regs.a).toBe(0x00);
    expectFlags(mem.cpu, true, false, true, true);
  });

  it('INC B affects flags but not C', () => {
    const { cpu } = makeCpu([0x0e, 0x0f, 0x0c], (c) => {
      c.regs.cy = true;
    }); // LD C,0F; INC C
    cpu.step();
    cpu.step();
    expect(cpu.regs.c).toBe(0x10);
    expect(cpu.regs.hFlag).toBe(true);
    expect(cpu.regs.cy).toBe(true);
  });

  it('DEC r8 and INC/DEC (HL)', () => {
    const { cpu } = makeCpu([0x06, 0x10, 0x05], (c) => {
      c.regs.cy = true;
    }); // LD B,10; DEC B
    cpu.step();
    expect(cpu.step()).toBe(4);
    expect(cpu.regs.b).toBe(0x0f);
    expectFlags(cpu, false, true, true, true);

    const incHl = makeCpu([0x34], (c, bus) => {
      c.regs.hl = 0xc000;
      c.regs.cy = true;
      bus.write(0xc000, 0x0f);
    });
    expect(incHl.cpu.step()).toBe(12);
    expect(incHl.bus.read(0xc000)).toBe(0x10);
    expectFlags(incHl.cpu, false, false, true, true);

    const decHl = makeCpu([0x35], (c, bus) => {
      c.regs.hl = 0xc000;
      c.regs.cy = true;
      bus.write(0xc000, 0x10);
    });
    expect(decHl.cpu.step()).toBe(12);
    expect(decHl.bus.read(0xc000)).toBe(0x0f);
    expectFlags(decHl.cpu, false, true, true, true);
  });

  it('ADD HL, r16', () => {
    const half = makeCpu([0x09], (c) => {
      c.regs.hl = 0x0fff;
      c.regs.bc = 0x0001;
      c.regs.z = true;
      c.regs.n = true;
    }).cpu;
    expect(half.step()).toBe(8);
    expect(half.regs.hl).toBe(0x1000);
    expectFlags(half, true, false, true, false);

    const wrapped = makeCpu([0x09], (c) => {
      c.regs.hl = 0xffff;
      c.regs.bc = 0x0001;
      c.regs.z = false;
    }).cpu;
    expect(wrapped.step()).toBe(8);
    expect(wrapped.regs.hl).toBe(0x0000);
    expectFlags(wrapped, false, false, true, true);
  });

  it('INC r16 and DEC r16 leave F alone', () => {
    const inc = makeCpu([0x03], (c) => {
      c.regs.bc = 0xffff;
      c.regs.z = true;
      c.regs.n = true;
      c.regs.hFlag = false;
      c.regs.cy = true;
    }).cpu;
    expect(inc.step()).toBe(8);
    expect(inc.regs.bc).toBe(0x0000);
    expectFlags(inc, true, true, false, true);

    const dec = makeCpu([0x3b], (c) => {
      c.regs.sp = 0x0000;
      c.regs.z = false;
      c.regs.n = true;
      c.regs.hFlag = true;
      c.regs.cy = false;
    }).cpu;
    expect(dec.step()).toBe(8);
    expect(dec.regs.sp).toBe(0xffff);
    expectFlags(dec, false, true, true, false);
  });

  it('ADD SP, imm8 and LD HL, SP+imm8', () => {
    const add = makeCpu([0xe8, 0x01], (c) => {
      c.regs.sp = 0x000f;
    }).cpu;
    expect(add.step()).toBe(16);
    expect(add.regs.sp).toBe(0x0010);
    expectFlags(add, false, false, true, false);

    const negative = makeCpu([0xe8, 0xff], (c) => {
      c.regs.sp = 0x0000;
    }).cpu;
    expect(negative.step()).toBe(16);
    expect(negative.regs.sp).toBe(0xffff);
    expectFlags(negative, false, false, false, false);

    const ld = makeCpu([0xf8, 0x01], (c) => {
      c.regs.sp = 0x000f;
    }).cpu;
    expect(ld.step()).toBe(12);
    expect(ld.regs.hl).toBe(0x0010);
    expect(ld.regs.sp).toBe(0x000f);
    expectFlags(ld, false, false, true, false);
  });

  it('RLCA RRCA RLA RRA', () => {
    const rlca = makeCpu([0x07], (c) => {
      c.regs.a = 0x80;
    }).cpu;
    expect(rlca.step()).toBe(4);
    expect(rlca.regs.a).toBe(0x01);
    expectFlags(rlca, false, false, false, true);

    const rlcaZero = makeCpu([0x07], (c) => {
      c.regs.a = 0x00;
    }).cpu;
    expect(rlcaZero.step()).toBe(4);
    expect(rlcaZero.regs.a).toBe(0x00);
    expectFlags(rlcaZero, false, false, false, false);

    const rrca = makeCpu([0x0f], (c) => {
      c.regs.a = 0x01;
    }).cpu;
    expect(rrca.step()).toBe(4);
    expect(rrca.regs.a).toBe(0x80);
    expectFlags(rrca, false, false, false, true);

    const rla = makeCpu([0x17], (c) => {
      c.regs.a = 0x00;
      c.regs.cy = true;
    }).cpu;
    expect(rla.step()).toBe(4);
    expect(rla.regs.a).toBe(0x01);
    expectFlags(rla, false, false, false, false);

    const rra = makeCpu([0x1f], (c) => {
      c.regs.a = 0x01;
      c.regs.cy = false;
    }).cpu;
    expect(rra.step()).toBe(4);
    expect(rra.regs.a).toBe(0x00);
    expectFlags(rra, false, false, false, true);
  });

  it('CPL SCF CCF', () => {
    const cpl = makeCpu([0x2f], (c) => {
      c.regs.a = 0x3c;
      c.regs.z = true;
      c.regs.n = false;
      c.regs.hFlag = false;
      c.regs.cy = true;
    }).cpu;
    expect(cpl.step()).toBe(4);
    expect(cpl.regs.a).toBe(0xc3);
    expectFlags(cpl, true, true, true, true);

    const scf = makeCpu([0x37], (c) => {
      c.regs.z = true;
      c.regs.n = true;
      c.regs.hFlag = true;
      c.regs.cy = false;
    }).cpu;
    expect(scf.step()).toBe(4);
    expectFlags(scf, true, false, false, true);

    const ccf = makeCpu([0x3f], (c) => {
      c.regs.z = true;
      c.regs.n = true;
      c.regs.hFlag = true;
      c.regs.cy = true;
    }).cpu;
    expect(ccf.step()).toBe(4);
    expectFlags(ccf, true, false, false, false);
  });

  it('DAA', () => {
    const sum = makeCpu([0x3e, 0x45, 0xc6, 0x38, 0x27]).cpu; // LD A,45; ADD A,38; DAA
    sum.step();
    sum.step();
    expect(sum.step()).toBe(4);
    expect(sum.regs.a).toBe(0x83);
    expectFlags(sum, false, false, false, false);

    const order = makeCpu([0x27], (c) => {
      c.regs.a = 0x95;
      c.regs.n = false;
      c.regs.hFlag = true;
      c.regs.cy = false;
    }).cpu;
    expect(order.step()).toBe(4);
    expect(order.regs.a).toBe(0x9b);
    expectFlags(order, false, false, false, false);

    const sub = makeCpu([0x27], (c) => {
      c.regs.a = 0x00;
      c.regs.n = true;
      c.regs.hFlag = false;
      c.regs.cy = true;
    }).cpu;
    expect(sub.step()).toBe(4);
    expect(sub.regs.a).toBe(0xa0);
    expectFlags(sub, false, true, false, true);
  });
});
