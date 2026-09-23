import type { u8, u16 } from '../types.js';

/** DIV bit used for TIMA clock for each TAC speed select. */
const DIV_BIT = [9, 3, 5, 7];

/** DIV / TIMA / TMA / TAC — falling-edge of selected DIV bit clocks TIMA. */
export class Timer {
  private divCounter = 0;
  tima: u8 = 0;
  tma: u8 = 0;
  tac: u8 = 0;
  onOverflow: (() => void) | null = null;

  get div(): u8 {
    return (this.divCounter >> 8) & 0xff;
  }

  read(addr: u16): u8 {
    switch (addr & 0xffff) {
      case 0xff04:
        return this.div;
      case 0xff05:
        return this.tima;
      case 0xff06:
        return this.tma;
      case 0xff07:
        return this.tac | 0xf8;
      default:
        return 0xff;
    }
  }

  write(addr: u16, value: u8): void {
    value &= 0xff;
    switch (addr & 0xffff) {
      case 0xff04: {
        const bit = DIV_BIT[this.tac & 0x03]!;
        const wasHigh = (this.divCounter >> bit) & 1;
        this.divCounter = 0;
        if ((this.tac & 0x04) !== 0 && wasHigh) this.incTima();
        break;
      }
      case 0xff05:
        this.tima = value;
        break;
      case 0xff06:
        this.tma = value;
        break;
      case 0xff07: {
        const oldBit = DIV_BIT[this.tac & 0x03]!;
        const oldEn = (this.tac & 0x04) !== 0;
        const oldHigh = oldEn && ((this.divCounter >> oldBit) & 1) === 1;
        this.tac = value & 0x07;
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

  step(cycles: number): void {
    for (let i = 0; i < cycles; i++) {
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
