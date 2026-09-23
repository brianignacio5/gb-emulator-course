import { describe, expect, it } from 'vitest';
import { Registers, FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from '@emu/cpu/registers.js';

describe('lesson 01 — registers & flags', () => {
  it('packs and unpacks AF with low nibble of F cleared', () => {
    const r = new Registers();
    r.a = 0x12;
    r.f = 0xb0;
    expect(r.af).toBe(0x12b0);
    r.af = 0x34c5;
    expect(r.a).toBe(0x34);
    expect(r.f).toBe(0xc0); // low nibble masked
  });

  it('packs BC DE HL', () => {
    const r = new Registers();
    r.bc = 0x1234;
    expect(r.b).toBe(0x12);
    expect(r.c).toBe(0x34);
    r.de = 0xabcd;
    expect(r.d).toBe(0xab);
    expect(r.e).toBe(0xcd);
    r.hl = 0x5678;
    expect(r.h).toBe(0x56);
    expect(r.l).toBe(0x78);
  });

  it('flag accessors use ZNHC masks', () => {
    const r = new Registers();
    r.setFlags(true, true, true, true);
    expect(r.f & 0xf0).toBe(FLAG_Z | FLAG_N | FLAG_H | FLAG_C);
    expect(r.z && r.n && r.hFlag && r.cy).toBe(true);
    r.z = false;
    expect(r.f & FLAG_Z).toBe(0);
  });

  it('resetPostBoot matches DMG post-boot values', () => {
    const r = new Registers();
    r.resetPostBoot();
    expect(r.af).toBe(0x01b0);
    expect(r.bc).toBe(0x0013);
    expect(r.de).toBe(0x00d8);
    expect(r.hl).toBe(0x014d);
    expect(r.sp).toBe(0xfffe);
    expect(r.pc).toBe(0x0100);
  });
});
