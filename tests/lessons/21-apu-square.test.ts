import { describe, expect, it } from 'vitest';
import { Apu } from '@emu/apu/apu.js';

describe('lesson 21 — square channels', () => {
  it('triggers CH2 and produces non-zero samples after stepping', () => {
    const apu = new Apu();
    apu.write(0xff26, 0x80);
    apu.write(0xff24, 0x77);
    apu.write(0xff25, 0xff);
    apu.write(0xff16, 0x80); // duty
    apu.write(0xff17, 0xf0); // volume envelope
    apu.write(0xff18, 0x00);
    apu.write(0xff19, 0x87); // trigger
    apu.step(8192);
    const { left } = apu.drainSamples();
    const energy = left.reduce((a, b) => a + Math.abs(b), 0);
    expect(energy).toBeGreaterThan(0);
  });
});
