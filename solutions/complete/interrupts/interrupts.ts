import type { u8 } from '../types.js';

export const INT_VECTORS = [0x40, 0x48, 0x50, 0x58, 0x60] as const;

export const INT_VBLANK = 0;
export const INT_STAT = 1;
export const INT_TIMER = 2;
export const INT_SERIAL = 3;
export const INT_JOYPAD = 4;

/** Interrupt enable / request / master enable. */
export class InterruptController {
  ime = false;
  ie: u8 = 0;
  ifFlag: u8 = 0xe1;

  request(bit: number): void {
    this.ifFlag = (this.ifFlag | (1 << bit)) & 0x1f;
  }

  /** Highest-priority interrupt enabled in IE & IF, or null. */
  pending(): { bit: number; vector: number } | null {
    const pending = this.ie & this.ifFlag & 0x1f;
    if (!pending) return null;
    for (let bit = 0; bit < 5; bit++) {
      if (pending & (1 << bit)) {
        return { bit, vector: INT_VECTORS[bit]! };
      }
    }
    return null;
  }

  acknowledge(bit: number): void {
    this.ifFlag &= ~(1 << bit);
    this.ifFlag &= 0x1f;
  }

  getIe(): u8 {
    return this.ie;
  }
  setIe(v: u8): void {
    this.ie = v & 0xff;
  }
  getIf(): u8 {
    return (this.ifFlag & 0x1f) | 0xe0;
  }
  setIf(v: u8): void {
    this.ifFlag = v & 0x1f;
  }
}
