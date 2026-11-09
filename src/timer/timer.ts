import type { u8, u16 } from '../types.js';

const DIV_BIT = [
  9, // 1/1024
  3, // 1/16
  5, // 1/64
  7, // 1/256
];

/** Lesson 11 */
export class Timer {
  tima = 0;
  tma = 0;
  tac = 0;
  divCounter = 0;
  onOverflow: (() => void) | null = null;

  get div(): u8 {
    return (this.divCounter >> 8) & 0xff;
  }

  read(_addr: u16): u8 {
    switch (_addr & 0xffff) {
      case 0xff04:
        return this.div;
      case 0xff05:
        return this.tima;
      case 0xff06:
        return this.tma;
      case 0xff07:
        return this.tac | 0xf8;
    }
    return 0xff;
  }

  write(_addr: u16, _value: u8): void {
    _value &= 0xff;
    switch (_addr & 0xffff) {
      case 0xff04: {
        const bit = DIV_BIT[this.tac & 0x03]!;
        const wasHigh = (this.divCounter >> bit) & 1;
        this.divCounter = 0;
        if ((this.tac & 0x04) !== 0 && wasHigh) this.incTima();
        break;
      }
      case 0xff05:
        this.tima = _value;
        break;
      case 0xff06:
        this.tma = _value;
        break;
      case 0xff07: {
        const oldBit = DIV_BIT[this.tac & 0x03]!;
        const oldEn = (this.tac & 0x04) !== 0;
        const oldHigh = oldEn && ((this.divCounter >> oldBit) & 1) === 1;
        this.tac = _value & 0x07;
        const newBit = DIV_BIT[this.tac & 0x03]!;
        const newEn = (this.tac & 0x04) !== 0;
        const newHigh = newEn && ((this.divCounter >> newBit) & 1) === 1;
        if (oldHigh && !newHigh) this.incTima();
        break;
      }
    }
  }

  private incTima(): void {
    this.tima = (this.tima + 1) & 0xff;
    if (this.tima === 0) {
      this.tima = this.tma;
      this.onOverflow?.();
    }
  }

  step(_cycles: number): void {
    for (let i = 0; i < _cycles; i++) {
      const prev = this.divCounter;
      this.divCounter = (this.divCounter + 1) & 0xffff;
      if ((this.tac & 0x04) === 0) continue;
      const bit = DIV_BIT[this.tac & 0x03]!;
      const prevBit = (prev >> bit) & 1;
      const newBit = (this.divCounter >> bit) & 1;
      if (prevBit === 1 && newBit === 0) this.incTima();
    }
  }
}
