import { describe, expect, it, vi } from 'vitest';
import { Timer } from '@emu/timer/timer.js';

describe('lesson 11 — timer & DIV', () => {
  it('writing DIV resets the counter', () => {
    const t = new Timer();
    t.step(1024);
    expect(t.div).toBeGreaterThan(0);
    t.write(0xff04, 0);
    expect(t.div).toBe(0);
  });

  it('TIMA overflows and reloads TMA', () => {
    const t = new Timer();
    const overflow = vi.fn();
    t.onOverflow = overflow;
    t.write(0xff06, 0xab); // TMA
    t.write(0xff07, 0x05); // enable, 262144 Hz
    t.write(0xff04, 0); // reset DIV
    t.write(0xff05, 0xff); // TIMA about to overflow
    let guard = 0;
    while (overflow.mock.calls.length === 0 && guard++ < 20000) t.step(1);
    expect(overflow).toHaveBeenCalled();
    expect(t.tima).toBe(0xab);
  });
});
