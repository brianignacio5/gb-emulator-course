import { describe, expect, it, vi } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Ppu } from '@emu/ppu/ppu.js';

describe('lesson 15 — PPU timing & STAT', () => {
  it('advances LY across a frame', () => {
    const ppu = new Ppu(new Bus());
    ppu.lcdc = 0x80;
    ppu.step(456 * 10);
    expect(ppu.ly).toBe(10);
  });

  it('enters VBlank at line 144 and requests interrupt', () => {
    const ppu = new Ppu(new Bus());
    ppu.lcdc = 0x80;
    const vb = vi.fn();
    ppu.onVBlank = vb;
    ppu.step(456 * 144);
    expect(ppu.ly).toBe(144);
    expect(vb).toHaveBeenCalled();
  });

  it('LYC=LY sets coincidence flag', () => {
    const ppu = new Ppu(new Bus());
    ppu.lcdc = 0x80;
    ppu.write(0xff45, 5);
    ppu.step(456 * 5);
    expect(ppu.ly).toBe(5);
    expect(ppu.stat & 0x04).toBe(0x04);
  });
});
