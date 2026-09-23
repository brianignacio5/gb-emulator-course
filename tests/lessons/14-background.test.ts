import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Ppu } from '@emu/ppu/ppu.js';

describe('lesson 14 — background & scroll registers', () => {
  it('reads and writes LCDC SCX SCY BGP', () => {
    const bus = new Bus();
    const ppu = new Ppu(bus);
    ppu.write(0xff40, 0x91);
    ppu.write(0xff42, 0x10);
    ppu.write(0xff43, 0x20);
    ppu.write(0xff47, 0xe4);
    expect(ppu.read(0xff40)).toBe(0x91);
    expect(ppu.read(0xff42)).toBe(0x10);
    expect(ppu.read(0xff43)).toBe(0x20);
    expect(ppu.read(0xff47)).toBe(0xe4);
  });

  it('renders a solid tile row into the framebuffer', () => {
    const bus = new Bus();
    // Fill tile 0 with color 3 pixels
    for (let i = 0; i < 16; i++) bus.vram[i] = 0xff;
    // map (0,0) = tile 0
    bus.vram[0x1800] = 0;
    const ppu = new Ppu(bus);
    ppu.lcdc = 0x91; // on, bg on, unsigned tiles, map 9800
    ppu.bgp = 0xe4;
    ppu.ly = 0;
    // Force one scanline render via step into HBlank
    ppu.step(252);
    // At least some pixels should be non-zero (shade from palette)
    const sum = ppu.framebuffer.slice(0, 160).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });
});
