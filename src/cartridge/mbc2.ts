import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/** Lesson 19 */
export class Mbc2Cartridge implements CartridgeLike {
  constructor(
    private _rom: Uint8Array,
    private _romBanks: number,
  ) {}

  get saveRam(): Uint8Array {
    throw new Error('TODO: lesson-19');
  }

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-19');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-19');
  }
}
