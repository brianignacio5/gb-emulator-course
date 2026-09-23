import { describe, expect, it } from 'vitest';
import { Apu } from '@emu/apu/apu.js';

describe('lesson 20 — APU mixer & power', () => {
  it('NR52 power bit', () => {
    const apu = new Apu();
    apu.write(0xff26, 0x80);
    expect(apu.read(0xff26) & 0x80).toBe(0x80);
    apu.write(0xff26, 0x00);
    expect(apu.read(0xff26) & 0x80).toBe(0);
  });

  it('mixSample returns finite stereo values', () => {
    const apu = new Apu();
    apu.write(0xff26, 0x80);
    apu.write(0xff24, 0x77);
    apu.write(0xff25, 0xff);
    const s = apu.mixSample();
    expect(Number.isFinite(s.left)).toBe(true);
    expect(Number.isFinite(s.right)).toBe(true);
  });
});
