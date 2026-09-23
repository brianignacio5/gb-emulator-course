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
    throw new Error('TODO: lesson-01 implement af getter');
  }
  set af(_v: u16) {
    throw new Error('TODO: lesson-01 implement af setter');
  }

  get bc(): u16 {
    throw new Error('TODO: lesson-01 implement bc getter');
  }
  set bc(_v: u16) {
    throw new Error('TODO: lesson-01 implement bc setter');
  }

  get de(): u16 {
    throw new Error('TODO: lesson-01 implement de getter');
  }
  set de(_v: u16) {
    throw new Error('TODO: lesson-01 implement de setter');
  }

  get hl(): u16 {
    throw new Error('TODO: lesson-01 implement hl getter');
  }
  set hl(_v: u16) {
    throw new Error('TODO: lesson-01 implement hl setter');
  }

  get z(): boolean {
    throw new Error('TODO: lesson-01');
  }
  set z(_on: boolean) {
    throw new Error('TODO: lesson-01');
  }
  get n(): boolean {
    throw new Error('TODO: lesson-01');
  }
  set n(_on: boolean) {
    throw new Error('TODO: lesson-01');
  }
  get hFlag(): boolean {
    throw new Error('TODO: lesson-01');
  }
  set hFlag(_on: boolean) {
    throw new Error('TODO: lesson-01');
  }
  get cy(): boolean {
    throw new Error('TODO: lesson-01');
  }
  set cy(_on: boolean) {
    throw new Error('TODO: lesson-01');
  }

  setFlags(_z: boolean, _n: boolean, _h: boolean, _c: boolean): void {
    throw new Error('TODO: lesson-01 implement setFlags');
  }

  resetPostBoot(): void {
    throw new Error('TODO: lesson-01 implement resetPostBoot');
  }
}
