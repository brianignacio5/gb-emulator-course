import { describe, expect, it } from 'vitest';
import { Apu } from '@emu/apu/apu.js';

describe('lesson 22 — wave & noise', () => {
  it('writes wave RAM', () => {
    const apu = new Apu();
    apu.write(0xff26, 0x80);
    apu.write(0xff30, 0xab);
    expect(apu.read(0xff30)).toBe(0xab);
  });

  it('triggers noise channel', () => {
    const apu = new Apu();
    apu.write(0xff26, 0x80);
    apu.write(0xff24, 0x77);
    apu.write(0xff25, 0xff);
    apu.write(0xff21, 0xf0);
    apu.write(0xff22, 0x00);
    apu.write(0xff23, 0x80);
    apu.step(4096);
    expect(apu.read(0xff26) & 0x08).toBe(0x08);
  });
});
