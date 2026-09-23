import { describe, expect, it } from 'vitest';
import { Bus } from '@emu/memory/bus.js';

describe('lesson 02 — memory bus', () => {
  it('reads and writes WRAM and mirrors Echo RAM', () => {
    const bus = new Bus();
    bus.write(0xc000, 0x42);
    expect(bus.read(0xc000)).toBe(0x42);
    expect(bus.read(0xe000)).toBe(0x42);
    bus.write(0xe100, 0x99);
    expect(bus.read(0xc100)).toBe(0x99);
  });

  it('maps VRAM OAM HRAM IE', () => {
    const bus = new Bus();
    bus.write(0x8000, 0x11);
    expect(bus.read(0x8000)).toBe(0x11);
    bus.write(0xfe00, 0x22);
    expect(bus.read(0xfe00)).toBe(0x22);
    bus.write(0xff80, 0x33);
    expect(bus.read(0xff80)).toBe(0x33);
    bus.write(0xffff, 0x1f);
    expect(bus.read(0xffff)).toBe(0x1f);
  });

  it('unused FEA0-FEFF returns 0xff', () => {
    const bus = new Bus();
    expect(bus.read(0xfea0)).toBe(0xff);
  });

  it('routes cartridge ROM region', () => {
    const bus = new Bus();
    bus.cartridge = {
      read: (a) => (a === 0x0100 ? 0xc3 : 0xff),
      write: () => {},
    };
    expect(bus.read(0x0100)).toBe(0xc3);
  });
});
