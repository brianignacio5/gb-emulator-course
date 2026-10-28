import type { CartridgeLike } from '../memory/bus.js';
import { RomOnlyCartridge } from './romOnly.js';

export type Cartridge = CartridgeLike & { saveRam?: Uint8Array };

/** Lesson 03 / 18 / 19 — expand factory as you add MBCs. */
export function createCartridge(_rom: Uint8Array): Cartridge {
  const cartType = _rom[0x0147];
  switch (cartType) {
    case 0x00:
    case 0x08:
    case 0x09:
      return new RomOnlyCartridge(_rom);
    default:
      throw new Error(`Unknown cartridge type: ${cartType}`);
  }
}
