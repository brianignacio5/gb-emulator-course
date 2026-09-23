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

/** Joypad (P1 / 0xFF00). Active-low; bit4=0 selects d-pad, bit5=0 selects buttons. */
export class Joypad {
  onInterrupt: (() => void) | null = null;

  private select: u8 = 0x30;
  private buttons: Record<Button, boolean> = {
    right: false,
    left: false,
    up: false,
    down: false,
    a: false,
    b: false,
    select: false,
    start: false,
  };

  setButton(button: Button, down: boolean): void {
    const was = this.buttons[button];
    this.buttons[button] = down;
    if (down && !was) this.onInterrupt?.();
  }

  writeP1(value: u8): void {
    this.select = value & 0x30;
  }

  readP1(): u8 {
    let low: u8 = 0x0f;
    const selectDpad = (this.select & 0x10) === 0;
    const selectButtons = (this.select & 0x20) === 0;

    if (selectDpad) {
      if (this.buttons.right) low &= ~0x01;
      if (this.buttons.left) low &= ~0x02;
      if (this.buttons.up) low &= ~0x04;
      if (this.buttons.down) low &= ~0x08;
    }
    if (selectButtons) {
      if (this.buttons.a) low &= ~0x01;
      if (this.buttons.b) low &= ~0x02;
      if (this.buttons.select) low &= ~0x04;
      if (this.buttons.start) low &= ~0x08;
    }

    return 0xc0 | this.select | low;
  }
}
