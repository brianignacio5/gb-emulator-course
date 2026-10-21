import { parseCartridgeHeader } from './header.js';
import { RomOnlyCartridge } from './romOnly.js';
import { Mbc1Cartridge } from './mbc1.js';
import { Mbc2Cartridge } from './mbc2.js';
import { Mbc3Cartridge } from './mbc3.js';
import type { CartridgeLike } from '../memory/bus.js';

export type Cartridge = CartridgeLike & { saveRam?: Uint8Array };

/** Lesson 03 / 18 / 19 — expand factory as you add MBCs. */
export function createCartridge(rom: Uint8Array): Cartridge {
  const header = parseCartridgeHeader(rom);
  const t = header.cartType;
  if (t === 0x00 || t === 0x08 || t === 0x09) return new RomOnlyCartridge(rom);
  if (t >= 0x01 && t <= 0x03) return new Mbc1Cartridge(rom, header.romBanks, header.ramSizeBytes);
  if (t === 0x05 || t === 0x06) return new Mbc2Cartridge(rom, header.romBanks);
  if (t >= 0x0f && t <= 0x13) return new Mbc3Cartridge(rom, header.romBanks, header.ramSizeBytes);
  return new RomOnlyCartridge(rom);
}

export { parseCartridgeHeader, RomOnlyCartridge, Mbc1Cartridge, Mbc2Cartridge, Mbc3Cartridge };
