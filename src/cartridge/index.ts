import type { CartridgeLike } from '../memory/bus.js';

export type Cartridge = CartridgeLike & { saveRam?: Uint8Array };

/** Lesson 03 / 18 / 19 — expand factory as you add MBCs. */
export function createCartridge(_rom: Uint8Array): Cartridge {
  throw new Error('TODO: lesson-03 map header.cartType to a cartridge');
}
