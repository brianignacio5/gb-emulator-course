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
  select = 0x30;

  buttons: Record<Button, boolean> = {
    right: false,
    left: false,
    up: false,
    down: false,
    a: false,
    b: false,
    select: false,
    start: false,
  };

  setButton(_button: Button, _down: boolean): void {
    const was = this.buttons[_button];
    this.buttons[_button] = _down;
    if (_down && !was) this.onInterrupt?.();
  }

  writeP1(_value: u8): void {
    this.select = _value & 0x30;
  }

  readP1(): u8 {
    let low: u8 = 0x0f;
    const selectButtons = (this.select & 0x20) === 0;
    const selectDpad = (this.select & 0x10) === 0;
    if (selectButtons) {
      if (this.buttons.a) low &= ~0x01;
      if (this.buttons.b) low &= ~0x02;
      if (this.buttons.select) low &= ~0x04;
      if (this.buttons.start) low &= ~0x08;
    }
    if (selectDpad) {
      if (this.buttons.right) low &= ~0x01;
      if (this.buttons.left) low &= ~0x02;
      if (this.buttons.up) low &= ~0x04;
      if (this.buttons.down) low &= ~0x08;
    }
    return 0xC0 | this.select | low;
  }
}
