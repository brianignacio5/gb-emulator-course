import { describe, expect, it, vi } from 'vitest';
import { Joypad } from '@emu/joypad/joypad.js';

describe('lesson 12 — joypad', () => {
  it('reads d-pad when selected', () => {
    const j = new Joypad();
    j.writeP1(0x20); // select d-pad (bit4=0), deselect buttons (bit5=1)
    j.setButton('left', true);
    const v = j.readP1();
    expect(v & 0x02).toBe(0); // left clears bit1
  });

  it('reads buttons when selected', () => {
    const j = new Joypad();
    j.writeP1(0x10);
    j.setButton('a', true);
    expect(j.readP1() & 0x01).toBe(0);
  });

  it('fires interrupt on press', () => {
    const j = new Joypad();
    const fn = vi.fn();
    j.onInterrupt = fn;
    j.setButton('start', true);
    expect(fn).toHaveBeenCalled();
  });
});
