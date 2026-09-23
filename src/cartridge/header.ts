import type { u8 } from '../types.js';

export interface CartridgeHeader {
  title: string;
  cartType: u8;
  romSizeCode: u8;
  ramSizeCode: u8;
  romBanks: number;
  ramBanks: number;
  romSizeBytes: number;
  ramSizeBytes: number;
}

/** Lesson 03 */
export function parseCartridgeHeader(_rom: Uint8Array): CartridgeHeader {
  throw new Error('TODO: lesson-03 implement parseCartridgeHeader');
}
