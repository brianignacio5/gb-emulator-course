import { describe, expect, it, vi } from 'vitest';
import { Joypad, type Button } from '@emu/joypad/joypad.js';

describe('lesson 12 — joypad', () => {
  it('writeP1 stores only the select bits', () => {
    const j = new Joypad();
    expect(j.readP1()).toBe(0xff);
    j.writeP1(0xff);
    expect(j.readP1()).toBe(0xff);
    j.writeP1(0x0f);
    expect(j.readP1()).toBe(0xcf);
    j.writeP1(0x2f);
    expect(j.readP1()).toBe(0xef);
    j.writeP1(0x1f);
    expect(j.readP1()).toBe(0xdf);
    j.writeP1(0x00);
    expect(j.readP1()).toBe(0xcf);
    j.writeP1(0x30);
    expect(j.readP1()).toBe(0xff);
  });

  it('readP1 reports each selected button', () => {
    const dpad: [Button, number][] = [
      ['right', 0xee],
      ['left', 0xed],
      ['up', 0xeb],
      ['down', 0xe7],
    ];
    for (const [button, value] of dpad) {
      const j = new Joypad();
      j.writeP1(0x20);
      j.setButton(button, true);
      expect(j.readP1()).toBe(value);
    }

    const actions: [Button, number][] = [
      ['a', 0xde],
      ['b', 0xdd],
      ['select', 0xdb],
      ['start', 0xd7],
    ];
    for (const [button, value] of actions) {
      const j = new Joypad();
      j.writeP1(0x10);
      j.setButton(button, true);
      expect(j.readP1()).toBe(value);
    }

    const held = new Joypad();
    held.setButton('left', true);
    held.setButton('a', true);
    held.writeP1(0x20);
    expect(held.readP1()).toBe(0xed);
    held.writeP1(0x10);
    expect(held.readP1()).toBe(0xde);
    held.writeP1(0x30);
    expect(held.readP1()).toBe(0xff);

    const both = new Joypad();
    both.writeP1(0x00);
    both.setButton('right', true);
    expect(both.readP1()).toBe(0xce);
    both.setButton('a', true);
    expect(both.readP1()).toBe(0xce);

    const lines = new Joypad();
    lines.writeP1(0x00);
    lines.setButton('up', true);
    lines.setButton('start', true);
    expect(lines.readP1()).toBe(0xc3);
  });

  it('setButton calls onInterrupt only on a new press', () => {
    const j = new Joypad();
    const fn = vi.fn();
    j.onInterrupt = fn;

    j.setButton('start', true);
    expect(fn).toHaveBeenCalledTimes(1);
    j.setButton('start', true);
    j.setButton('start', false);
    expect(fn).toHaveBeenCalledTimes(1);
    j.setButton('start', true);
    expect(fn).toHaveBeenCalledTimes(2);

    j.writeP1(0x30);
    j.setButton('a', true);
    expect(fn).toHaveBeenCalledTimes(3);

    j.writeP1(0x20);
    j.setButton('left', true);
    expect(j.readP1()).toBe(0xed);
    j.setButton('left', false);
    expect(j.readP1()).toBe(0xef);
  });
});
