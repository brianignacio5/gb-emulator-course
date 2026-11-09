export const INT_VBLANK = 0;
export const INT_STAT = 1;
export const INT_TIMER = 2;
export const INT_SERIAL = 3;
export const INT_JOYPAD = 4;

export const INT_VECTORS = [
  0x40, // VBLANK
  0x48, // STAT
  0x50, // TIMER
  0x58, // SERIAL
  0x60, // JOYPAD
];

/** Lesson 09 */
export class InterruptController {
  ime = false;
  ie = 0;
  ifFlag = 0xe1;

  request(_bit: number): void {
    this.ifFlag = (this.ifFlag | (1 << _bit)) & 0x1f;
  }

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

  acknowledge(_bit: number): void {
    this.ifFlag = (this.ifFlag & ~(1 << _bit)) & 0x1f;
  }

  getIe(): number {
    return this.ie;
  }
  setIe(v: number): void {
    this.ie = v & 0xff;
  }
  getIf(): number {
    return this.ifFlag | 0xe0;
  }
  setIf(v: number): void {
    this.ifFlag = v | 0xe0;
  }
}
