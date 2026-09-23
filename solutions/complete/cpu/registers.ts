import type { u8, u16 } from '../types.js';
import { wrap8, wrap16 } from '../types.js';

/** Flag bits in F (low nibble of F is always 0). */
export const FLAG_Z = 0x80;
export const FLAG_N = 0x40;
export const FLAG_H = 0x20;
export const FLAG_C = 0x10;

/**
 * SM83 CPU registers.
 * @see https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 */
export class Registers {
  a: u8 = 0;
  b: u8 = 0;
  c: u8 = 0;
  d: u8 = 0;
  e: u8 = 0;
  h: u8 = 0;
  l: u8 = 0;
  f: u8 = 0;
  sp: u16 = 0;
  pc: u16 = 0;

  get af(): u16 {
    return ((this.a & 0xff) << 8) | (this.f & 0xf0);
  }
  set af(v: u16) {
    this.a = (v >> 8) & 0xff;
    this.f = v & 0xf0;
  }

  get bc(): u16 {
    return ((this.b & 0xff) << 8) | (this.c & 0xff);
  }
  set bc(v: u16) {
    this.b = (v >> 8) & 0xff;
    this.c = v & 0xff;
  }

  get de(): u16 {
    return ((this.d & 0xff) << 8) | (this.e & 0xff);
  }
  set de(v: u16) {
    this.d = (v >> 8) & 0xff;
    this.e = v & 0xff;
  }

  get hl(): u16 {
    return ((this.h & 0xff) << 8) | (this.l & 0xff);
  }
  set hl(v: u16) {
    this.h = (v >> 8) & 0xff;
    this.l = v & 0xff;
  }

  get z(): boolean {
    return (this.f & FLAG_Z) !== 0;
  }
  set z(on: boolean) {
    this.f = on ? this.f | FLAG_Z : this.f & ~FLAG_Z;
    this.f &= 0xf0;
  }

  get n(): boolean {
    return (this.f & FLAG_N) !== 0;
  }
  set n(on: boolean) {
    this.f = on ? this.f | FLAG_N : this.f & ~FLAG_N;
    this.f &= 0xf0;
  }

  get hFlag(): boolean {
    return (this.f & FLAG_H) !== 0;
  }
  set hFlag(on: boolean) {
    this.f = on ? this.f | FLAG_H : this.f & ~FLAG_H;
    this.f &= 0xf0;
  }

  get cy(): boolean {
    return (this.f & FLAG_C) !== 0;
  }
  set cy(on: boolean) {
    this.f = on ? this.f | FLAG_C : this.f & ~FLAG_C;
    this.f &= 0xf0;
  }

  setFlags(z: boolean, n: boolean, h: boolean, c: boolean): void {
    this.f =
      (z ? FLAG_Z : 0) | (n ? FLAG_N : 0) | (h ? FLAG_H : 0) | (c ? FLAG_C : 0);
  }

  /** Post-boot DMG register state (boot ROM skipped). */
  resetPostBoot(): void {
    this.af = 0x01b0;
    this.bc = 0x0013;
    this.de = 0x00d8;
    this.hl = 0x014d;
    this.sp = 0xfffe;
    this.pc = 0x0100;
  }
}

export { wrap8, wrap16 };
