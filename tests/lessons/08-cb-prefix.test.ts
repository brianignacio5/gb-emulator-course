import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Cpu } from '@emu/cpu/cpu.js';
import { Registers } from '@emu/cpu/registers.js';

function makeCpu(program: number[]): { cpu: Cpu; bus: Bus } {
  const bus = new Bus();
  const rom = new Uint8Array(0x8000);
  rom.set(program, 0x0100);
  bus.cartridge = { read: (a) => rom[a] ?? 0xff, write: () => {} };
  const cpu = new Cpu(bus);
  cpu.regs = new Registers();
  cpu.regs.resetPostBoot();
  return { cpu, bus };
}

function expectFlags(cpu: Cpu, z: boolean, n: boolean, h: boolean, c: boolean, label = '') {
  const suffix = label ? ` (${label})` : '';
  expect(cpu.regs.z, `Z${suffix}`).toBe(z);
  expect(cpu.regs.n, `N${suffix}`).toBe(n);
  expect(cpu.regs.hFlag, `H${suffix}`).toBe(h);
  expect(cpu.regs.cy, `C${suffix}`).toBe(c);
}

function cbLabel(op: number): string {
  return `CB ${op.toString(16).padStart(2, '0')}`;
}

/** Register operand is 8. BIT (HL) is 12. Every other (HL) form is 16. */
function cyclesFor(x: number, z: number): number {
  if (z !== 6) return 8;
  return x === 1 ? 12 : 16;
}

function setOperand(cpu: Cpu, bus: Bus, z: number, value: number): void {
  if (z === 6) {
    cpu.regs.hl = 0xc000;
    bus.write(0xc000, value);
    return;
  }
  switch (z) {
    case 0:
      cpu.regs.b = value;
      break;
    case 1:
      cpu.regs.c = value;
      break;
    case 2:
      cpu.regs.d = value;
      break;
    case 3:
      cpu.regs.e = value;
      break;
    case 4:
      cpu.regs.h = value;
      break;
    case 5:
      cpu.regs.l = value;
      break;
    case 7:
      cpu.regs.a = value;
      break;
    default:
      throw new Error(`invalid r8 ${z}`);
  }
}

function expectOperand(cpu: Cpu, bus: Bus, z: number, value: number, label: string): void {
  if (z === 6) {
    expect(bus.read(0xc000), label).toBe(value);
    expect(cpu.regs.hl, `${label} HL`).toBe(0xc000);
    return;
  }
  const actual = [cpu.regs.b, cpu.regs.c, cpu.regs.d, cpu.regs.e, cpu.regs.h, cpu.regs.l, 0, cpu.regs.a][z];
  expect(actual, label).toBe(value);
}

/** Registers other than the operand stay at the post-boot values. SP stays. */
function expectUntouched(cpu: Cpu, z: number, label: string): void {
  const post: { name: 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l'; value: number; index: number }[] = [
    { name: 'b', value: 0x00, index: 0 },
    { name: 'c', value: 0x13, index: 1 },
    { name: 'd', value: 0x00, index: 2 },
    { name: 'e', value: 0xd8, index: 3 },
    { name: 'h', value: 0x01, index: 4 },
    { name: 'l', value: 0x4d, index: 5 },
    { name: 'a', value: 0x01, index: 7 },
  ];
  for (const reg of post) {
    if (reg.index === z) continue;
    if (z === 6 && (reg.name === 'h' || reg.name === 'l')) continue;
    expect(cpu.regs[reg.name], `${label} ${reg.name}`).toBe(reg.value);
  }
  expect(cpu.regs.sp, `${label} SP`).toBe(0xfffe);
}

/** Z clear, N set, H clear, C set. SET and RES must leave this byte alone. */
function presetFlags(cpu: Cpu): number {
  cpu.regs.z = false;
  cpu.regs.n = true;
  cpu.regs.hFlag = false;
  cpu.regs.cy = true;
  return cpu.regs.f;
}

describe('lesson 08 — CB prefix', () => {
  it('RLC B and BIT 7,B', () => {
    const { cpu } = makeCpu([0xcb, 0x00, 0xcb, 0x78]);
    cpu.regs.b = 0x80;
    expect(cpu.step()).toBe(8);
    expect(cpu.regs.b).toBe(0x01);
    expect(cpu.regs.pc).toBe(0x0102);
    expectFlags(cpu, false, false, false, true);

    expect(cpu.step()).toBe(8);
    expect(cpu.regs.b).toBe(0x01);
    expect(cpu.regs.pc).toBe(0x0104);
    expectFlags(cpu, true, false, true, true);
  });

  it('SWAP A and SET/RES', () => {
    const { cpu } = makeCpu([0xcb, 0x37, 0xcb, 0xc7, 0xcb, 0x87]);
    cpu.regs.a = 0x1f;
    expect(cpu.step()).toBe(8);
    expect(cpu.regs.a).toBe(0xf1);
    expect(cpu.regs.pc).toBe(0x0102);
    expectFlags(cpu, false, false, false, false);

    const flags = cpu.regs.f;
    expect(cpu.step()).toBe(8);
    expect(cpu.regs.a).toBe(0xf1);
    expect(cpu.regs.f).toBe(flags);
    expect(cpu.regs.pc).toBe(0x0104);

    expect(cpu.step()).toBe(8);
    expect(cpu.regs.a).toBe(0xf0);
    expect(cpu.regs.f).toBe(flags);
    expect(cpu.regs.pc).toBe(0x0106);
  });

  it('rotates, shifts, and SWAP on every r8', () => {
    const value = 0xb1;
    const expected: { result: number; c: boolean }[] = [
      { result: 0x63, c: true }, // RLC
      { result: 0xd8, c: true }, // RRC
      { result: 0x63, c: true }, // RL, old C into bit 0
      { result: 0xd8, c: true }, // RR, old C into bit 7
      { result: 0x62, c: true }, // SLA
      { result: 0xd8, c: true }, // SRA, bit 7 stays
      { result: 0x1b, c: false }, // SWAP
      { result: 0x58, c: true }, // SRL, bit 7 becomes 0
    ];
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const op = (y << 3) | z;
        const label = cbLabel(op);
        const { cpu, bus } = makeCpu([0xcb, op]);
        setOperand(cpu, bus, z, value);
        cpu.regs.cy = true;
        expect(cpu.step(), label).toBe(cyclesFor(0, z));
        expectOperand(cpu, bus, z, expected[y].result, label);
        expectFlags(cpu, false, false, false, expected[y].c, label);
        expect(cpu.regs.pc, label).toBe(0x0102);
        expectUntouched(cpu, z, label);
      }
    }
  });

  it('BIT y, r8 leaves the operand and C', () => {
    const value = 0xb1;
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const op = 0x40 | (y << 3) | z;
        const label = cbLabel(op);
        const carry = (z & 1) === 0;
        const { cpu, bus } = makeCpu([0xcb, op]);
        setOperand(cpu, bus, z, value);
        cpu.regs.cy = carry;
        expect(cpu.step(), label).toBe(cyclesFor(1, z));
        expectOperand(cpu, bus, z, value, label);
        const bitClear = ((value >> y) & 1) === 0;
        expectFlags(cpu, bitClear, false, true, carry, label);
        expect(cpu.regs.pc, label).toBe(0x0102);
        expectUntouched(cpu, z, label);
      }
    }
  });

  it('RES and SET on every r8 leave F', () => {
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const bit = 1 << y;

        const res = 0x80 | (y << 3) | z;
        const resLabel = cbLabel(res);
        const cleared = makeCpu([0xcb, res]);
        setOperand(cleared.cpu, cleared.bus, z, 0xff);
        const resFlags = presetFlags(cleared.cpu);
        expect(cleared.cpu.step(), resLabel).toBe(cyclesFor(2, z));
        expectOperand(cleared.cpu, cleared.bus, z, 0xff & ~bit, resLabel);
        expect(cleared.cpu.regs.f, resLabel).toBe(resFlags);
        expect(cleared.cpu.regs.pc, resLabel).toBe(0x0102);
        expectUntouched(cleared.cpu, z, resLabel);

        const set = 0xc0 | (y << 3) | z;
        const setLabel = cbLabel(set);
        const raised = makeCpu([0xcb, set]);
        setOperand(raised.cpu, raised.bus, z, 0x00);
        const setFlags = presetFlags(raised.cpu);
        expect(raised.cpu.step(), setLabel).toBe(cyclesFor(3, z));
        expectOperand(raised.cpu, raised.bus, z, bit, setLabel);
        expect(raised.cpu.regs.f, setLabel).toBe(setFlags);
        expect(raised.cpu.regs.pc, setLabel).toBe(0x0102);
        expectUntouched(raised.cpu, z, setLabel);
      }
    }
  });

  it('rotate and shift flag edges', () => {
    const rlc = makeCpu([0xcb, 0x07]).cpu; // RLC A
    rlc.regs.a = 0x00;
    expect(rlc.step()).toBe(8);
    expect(rlc.regs.a).toBe(0x00);
    expectFlags(rlc, true, false, false, false, 'RLC A of 0x00');

    const rlIn = makeCpu([0xcb, 0x17]).cpu; // RL A
    rlIn.regs.a = 0x00;
    rlIn.regs.cy = true;
    expect(rlIn.step()).toBe(8);
    expect(rlIn.regs.a).toBe(0x01);
    expectFlags(rlIn, false, false, false, false, 'RL A of 0x00 with C');

    const rlOut = makeCpu([0xcb, 0x17]).cpu;
    rlOut.regs.a = 0x80;
    rlOut.regs.cy = false;
    expect(rlOut.step()).toBe(8);
    expect(rlOut.regs.a).toBe(0x00);
    expectFlags(rlOut, true, false, false, true, 'RL A of 0x80');

    const rrIn = makeCpu([0xcb, 0x1f]).cpu; // RR A
    rrIn.regs.a = 0x00;
    rrIn.regs.cy = true;
    expect(rrIn.step()).toBe(8);
    expect(rrIn.regs.a).toBe(0x80);
    expectFlags(rrIn, false, false, false, false, 'RR A of 0x00 with C');

    const rrOut = makeCpu([0xcb, 0x1f]).cpu;
    rrOut.regs.a = 0x01;
    rrOut.regs.cy = false;
    expect(rrOut.step()).toBe(8);
    expect(rrOut.regs.a).toBe(0x00);
    expectFlags(rrOut, true, false, false, true, 'RR A of 0x01');

    const sla = makeCpu([0xcb, 0x27]).cpu; // SLA A
    sla.regs.a = 0x80;
    expect(sla.step()).toBe(8);
    expect(sla.regs.a).toBe(0x00);
    expectFlags(sla, true, false, false, true, 'SLA A of 0x80');

    const sra = makeCpu([0xcb, 0x2f]).cpu; // SRA A
    sra.regs.a = 0x81;
    expect(sra.step()).toBe(8);
    expect(sra.regs.a).toBe(0xc0);
    expectFlags(sra, false, false, false, true, 'SRA A of 0x81');

    const srl = makeCpu([0xcb, 0x3f]).cpu; // SRL A
    srl.regs.a = 0x01;
    expect(srl.step()).toBe(8);
    expect(srl.regs.a).toBe(0x00);
    expectFlags(srl, true, false, false, true, 'SRL A of 0x01');

    const swap = makeCpu([0xcb, 0x37]).cpu; // SWAP A
    swap.regs.a = 0x00;
    expect(swap.step()).toBe(8);
    expect(swap.regs.a).toBe(0x00);
    expectFlags(swap, true, false, false, false, 'SWAP A of 0x00');

    const mem = makeCpu([0xcb, 0x2e]); // SRA (HL)
    mem.cpu.regs.hl = 0xc000;
    mem.bus.write(0xc000, 0x80);
    expect(mem.cpu.step()).toBe(16);
    expect(mem.bus.read(0xc000)).toBe(0xc0);
    expect(mem.cpu.regs.hl).toBe(0xc000);
    expect(mem.cpu.regs.pc).toBe(0x0102);
    expectFlags(mem.cpu, false, false, false, false, 'SRA (HL) of 0x80');
  });
});
