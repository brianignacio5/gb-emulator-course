import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/** Lesson 18 */
export class Mbc1Cartridge implements CartridgeLike {
  constructor(
    private _rom: Uint8Array,
    private _romBanks: number,
    _ramSizeBytes: number,
  ) {}

  get saveRam(): Uint8Array {
    throw new Error('TODO: lesson-18');
  }

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-18 implement MBC1 read');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-18 implement MBC1 write');
  }
}
