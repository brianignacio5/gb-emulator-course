import type { u8 } from '../types.js';

export type Button =
  | 'right'
  | 'left'
  | 'up'
  | 'down'
  | 'a'
  | 'b'
  | 'select'
  | 'start';

/** Lesson 12 */
export class Joypad {
  onInterrupt: (() => void) | null = null;

  setButton(_button: Button, _down: boolean): void {
    throw new Error('TODO: lesson-12');
  }

  writeP1(_value: u8): void {
    throw new Error('TODO: lesson-12');
  }

  readP1(): u8 {
    throw new Error('TODO: lesson-12');
  }
}
