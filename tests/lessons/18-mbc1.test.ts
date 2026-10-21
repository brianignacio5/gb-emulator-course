import { describe, expect, it } from 'vitest';
import { createCartridge } from '@emu/cartridge/index.js';
import { Mbc1Cartridge } from '@emu/cartridge/mbc1.js';

function romWithBanks(banks: number): Uint8Array {
  const rom = new Uint8Array(banks * 0x4000);
  for (let b = 0; b < banks; b++) {
    rom[b * 0x4000] = b & 0xff;
  }
  return rom;
}

describe('lesson 18 — MBC1', () => {
  it('switches ROM bank', () => {
    const cart = new Mbc1Cartridge(romWithBanks(8), 8, 0x2000);
    expect(cart.read(0x4000)).toBe(1); // bank 1 default
    cart.write(0x2000, 0x03);
    expect(cart.read(0x4000)).toBe(3);
  });

  it('enables and writes RAM', () => {
    const cart = new Mbc1Cartridge(romWithBanks(4), 4, 0x2000);
    cart.write(0x0000, 0x0a);
    cart.write(0xa000, 0x55);
    expect(cart.read(0xa000)).toBe(0x55);
  });

  it('factory maps MBC1', () => {
    const rom = romWithBanks(8);
    rom[0x147] = 0x01;
    rom[0x148] = 0x02; // 8 banks
    const cart = createCartridge(rom);
    expect(cart.read(0x4000)).toBe(1);
    cart.write(0x2000, 0x03);
    expect(cart.read(0x4000)).toBe(3);
  });
});
