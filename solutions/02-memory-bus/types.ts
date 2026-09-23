/** Shared numeric helpers for Game Boy emulation (8/16-bit wrap). */

export type u8 = number;
export type u16 = number;

export const wrap8 = (n: number): u8 => n & 0xff;
export const wrap16 = (n: number): u16 => n & 0xffff;

export const bit = (value: number, n: number): boolean => ((value >> n) & 1) === 1;

export const setBit = (value: number, n: number, on: boolean): number =>
  on ? value | (1 << n) : value & ~(1 << n);

/** Memory-mapped device: 16-bit address space accessors. */
export interface Memory {
  read(addr: u16): u8;
  write(addr: u16, value: u8): void;
}

/** Advance by T-cycles (1 M-cycle = 4 T-cycles on DMG). */
export interface Clocked {
  step(cycles: number): void;
}
