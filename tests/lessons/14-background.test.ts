import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';
import { Ppu } from '@emu/ppu/ppu.js';

function line(ppu: Ppu): number[] {
  return [...ppu.framebuffer.slice(0, 160)];
}

function boot(bus: Bus, scx = 0, scy = 0): Ppu {
  const ppu = new Ppu(bus);
  ppu.lcdc = 0x91; // on, bg on, unsigned tiles, map 9800
  ppu.bgp = 0xe4;
  ppu.ly = 0;
  ppu.scx = scx;
  ppu.scy = scy;
  return ppu;
}

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

  it('draws the solid tile row on the HBlank dot', () => {
    const bus = new Bus();
    for (let i = 0; i < 16; i++) bus.vram[i] = 0xff;
    bus.vram[0x1800] = 0;
    const ppu = boot(bus);

    ppu.step(251);
    expect(line(ppu)).toEqual(Array(160).fill(0));
    expect(ppu.ly).toBe(0);

    ppu.step(1);
    expect(line(ppu)).toEqual(Array(160).fill(3));
    expect(ppu.ly).toBe(0);
  });

  it('uses the map byte to choose the tile', () => {
    const bus = new Bus();
    for (let i = 0; i < 16; i++) bus.vram[16 + i] = 0xff;
    bus.vram[0x1800] = 1;
    const ppu = boot(bus);

    ppu.step(252);
    const pixels = line(ppu);
    expect(pixels.slice(0, 8)).toEqual(Array(8).fill(3));
    expect(pixels.slice(8)).toEqual(Array(152).fill(0));
  });

  it('applies SCX and SCY', () => {
    const bus = new Bus();
    bus.vram[0] = 0x80;
    bus.vram[1] = 0x80;
    for (let i = 0; i < 16; i++) bus.vram[16 + i] = 0xff;
    for (let i = 0; i < 32; i++) bus.vram[0x1820 + i] = 1;

    const origin = boot(bus, 0, 0);
    origin.step(252);
    const originLine = line(origin);
    expect(originLine[0]).toBe(3);
    expect(originLine[1]).toBe(0);
    expect(originLine[8]).toBe(3);

    const scrolledX = boot(bus, 1, 0);
    scrolledX.step(252);
    const scrolledXLine = line(scrolledX);
    expect(scrolledXLine[0]).toBe(0);
    expect(scrolledXLine[7]).toBe(3);

    const scrolledY = boot(bus, 0, 8);
    scrolledY.step(252);
    expect(line(scrolledY)).toEqual(Array(160).fill(3));
  });
});
