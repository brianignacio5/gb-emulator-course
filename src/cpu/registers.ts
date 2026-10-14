import type { u8, u16 } from '../types.js';

export const FLAG_Z = 0x80;
export const FLAG_N = 0x40;
export const FLAG_H = 0x20;
export const FLAG_C = 0x10;

/**
 * SM83 CPU registers — implement in lesson 01.
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
    return (this.a << 8) | (this.f);
  }
  set af(_v: u16) {
    this.a = (_v >> 8) & 0xFF;
    this.f = _v & 0xF0;
  }

  get bc(): u16 {
    return (this.b << 8) | this.c;
  }
  set bc(_v: u16) {
    this.b = (_v >> 8) & 0xFF;
    this.c = _v & 0xFF;
  }

  get de(): u16 {
    return (this.d << 8) | this.e;
  }
  set de(_v: u16) {
    this.d = (_v >> 8) & 0xFF;
    this.e = _v & 0xFF;
  }

  get hl(): u16 {
    return (this.h << 8) | this.l;
  }
  set hl(_v: u16) {
    this.h = (_v >> 8) & 0xFF;
    this.l = _v & 0xFF;
  }

  get z(): boolean {
    return (this.f & FLAG_Z) !== 0;
  }
  set z(_on: boolean) {
    this.f = _on ? this.f | FLAG_Z : this.f & ~FLAG_Z;
    this.f = this.f & 0xF0;
  }
  get n(): boolean {
    return (this.f & FLAG_N) !== 0;
  }
  set n(_on: boolean) {
    this.f = _on ? this.f | FLAG_N : this.f & ~FLAG_N;
    this.f = this.f & 0xF0;
  }
  get hFlag(): boolean {
    return (this.f & FLAG_H) !== 0;
  }
  set hFlag(_on: boolean) {
    this.f = _on ? this.f | FLAG_H : this.f & ~FLAG_H;
  }
  get cy(): boolean {
    return (this.f & FLAG_C) !== 0;
  }
  set cy(_on: boolean) {
    this.f = _on ? this.f | FLAG_C : this.f & ~FLAG_C;
  }

  setFlags(_z: boolean, _n: boolean, _h: boolean, _c: boolean): void {
    this.z = _z;
    this.n = _n;
    this.hFlag = _h;
    this.cy = _c;
  }

  resetPostBoot(): void {
    this.af = 0x01B0;
    this.bc = 0x0013;
    this.de = 0x00D8;
    this.hl = 0x014D;
    this.sp = 0xFFFE;
    this.pc = 0x0100;
  }
}
