import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Ppu } from '@emu/ppu/ppu.js';

describe('lesson 16 — sprites & OAM DMA', () => {
  it('DMA copies 0xA0 bytes into OAM', () => {
    const bus = new Bus();
    for (let i = 0; i < 0xa0; i++) bus.wram[i] = i & 0xff;
    const ppu = new Ppu(bus);
    ppu.doDma(0xc0, bus); // from 0xC000
    expect(bus.read(0xfe00)).toBe(0);
    expect(bus.read(0xfe10)).toBe(0x10);
    expect(bus.read(0xfe9f)).toBe(0x9f);
  });
});
