import type { u8, u16 } from '../types.js';

/** Lesson 11 */
export class Timer {
  tima = 0;
  tma = 0;
  tac = 0;
  onOverflow: (() => void) | null = null;

  get div(): u8 {
    throw new Error('TODO: lesson-11');
  }

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-11');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-11');
  }

  step(_cycles: number): void {
    throw new Error('TODO: lesson-11');
  }
}
