import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/** Lesson 03 */
export class RomOnlyCartridge implements CartridgeLike {
  constructor(private rom: Uint8Array) {}

  read(_addr: u16): u8 {
    if (_addr <= 0x9FFF) {
      return this.rom[_addr] ?? 0xFF;
    }
    return 0xFF;
  }

  write(_addr: u16, _value: u8): void {
    // ignore
  }
}
