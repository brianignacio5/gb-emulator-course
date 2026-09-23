export const INT_VBLANK = 0;
export const INT_STAT = 1;
export const INT_TIMER = 2;
export const INT_SERIAL = 3;
export const INT_JOYPAD = 4;

/** Lesson 09 */
export class InterruptController {
  ime = false;
  ie = 0;
  ifFlag = 0xe1;

  request(_bit: number): void {
    throw new Error('TODO: lesson-09');
  }

  pending(): { bit: number; vector: number } | null {
    throw new Error('TODO: lesson-09');
  }

  acknowledge(_bit: number): void {
    throw new Error('TODO: lesson-09');
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
