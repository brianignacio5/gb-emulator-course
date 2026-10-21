import { describe, expect, it } from 'vitest';
import { createCartridge } from '@emu/cartridge/index.js';
import { parseCartridgeHeader } from '@emu/cartridge/header.js';
import { RomOnlyCartridge } from '@emu/cartridge/romOnly.js';

function makeRom(opts: { title?: string; type?: number; romSize?: number; ramSize?: number }) {
  const rom = new Uint8Array(0x8000);
  const title = opts.title ?? 'TESTROM';
  for (let i = 0; i < title.length; i++) rom[0x134 + i] = title.charCodeAt(i);
  rom[0x147] = opts.type ?? 0x00;
  rom[0x148] = opts.romSize ?? 0x00;
  rom[0x149] = opts.ramSize ?? 0x00;
  rom[0x0100] = 0xc3;
  return rom;
}

describe('lesson 03 — cartridge header & ROM-only', () => {
  it('parses title and sizes', () => {
    const rom = makeRom({ title: 'HELLO', romSize: 0x01, ramSize: 0x02 });
    const h = parseCartridgeHeader(rom);
    expect(h.title).toBe('HELLO');
    expect(h.romBanks).toBe(4);
    expect(h.ramSizeBytes).toBe(8 * 1024);
  });

  it('ROM-only maps banks 0-1', () => {
    const rom = makeRom({});
    rom[0x0150] = 0xab;
    rom[0x4000] = 0xcd;
    const cart = new RomOnlyCartridge(rom);
    expect(cart.read(0x0150)).toBe(0xab);
    expect(cart.read(0x4000)).toBe(0xcd);
  });

  it('factory maps a ROM-only cartridge', () => {
    const rom = makeRom({ type: 0x00 });
    rom[0x0150] = 0xab;
    const cart = createCartridge(rom);
    expect(cart.read(0x0150)).toBe(0xab);
  });
});
