import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/** ROM-only cartridge (mapper 0): fixed ROM, no external RAM. */
export class RomOnlyCartridge implements CartridgeLike {
  constructor(private readonly rom: Uint8Array) {}

  read(addr: u16): u8 {
    if (addr <= 0x7fff) {
      return this.rom[addr] ?? 0xff;
    }
    return 0xff;
  }

  write(_addr: u16, _value: u8): void {
    // ROM-only: writes ignored
  }
}
