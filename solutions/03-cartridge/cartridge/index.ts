import { parseCartridgeHeader } from './header.js';
import { RomOnlyCartridge } from './romOnly.js';
import type { CartridgeLike } from '../memory/bus.js';

export type Cartridge = CartridgeLike & { saveRam?: Uint8Array };

/** Lesson 03 / 18 / 19 — expand factory as you add MBCs. */
export function createCartridge(rom: Uint8Array): Cartridge {
  const header = parseCartridgeHeader(rom);
  const t = header.cartType;
  if (t === 0x00 || t === 0x08 || t === 0x09) return new RomOnlyCartridge(rom);
  return new RomOnlyCartridge(rom);
}

export { parseCartridgeHeader, RomOnlyCartridge };
