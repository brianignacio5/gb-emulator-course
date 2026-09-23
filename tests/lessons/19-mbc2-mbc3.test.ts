import { describe, expect, it } from 'vitest';
import { Mbc2Cartridge } from '@emu/cartridge/mbc2.js';
import { Mbc3Cartridge } from '@emu/cartridge/mbc3.js';

describe('lesson 19 — MBC2 & MBC3', () => {
  it('MBC2 RAM is 4-bit', () => {
    const rom = new Uint8Array(0x8000);
    const cart = new Mbc2Cartridge(rom, 2);
    cart.write(0x0000, 0x0a); // enable (bit8 clear)
    cart.write(0xa000, 0xab);
    expect(cart.read(0xa000) & 0x0f).toBe(0x0b);
  });

  it('MBC3 ROM banking', () => {
    const rom = new Uint8Array(0x10000);
    rom[0x8000] = 0x77; // bank 2
    const cart = new Mbc3Cartridge(rom, 4, 0x2000);
    cart.write(0x2000, 0x02);
    expect(cart.read(0x4000)).toBe(0x77);
  });

  it('MBC3 RTC register select', () => {
    const cart = new Mbc3Cartridge(new Uint8Array(0x8000), 2, 0);
    cart.write(0x0000, 0x0a);
    cart.write(0x4000, 0x08); // RTC seconds
    cart.write(0xa000, 0x1e);
    expect(cart.read(0xa000)).toBe(0x1e);
  });
});
