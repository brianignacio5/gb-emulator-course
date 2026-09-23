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

const ROM_BANKS: Record<number, number> = {
  0x00: 2,
  0x01: 4,
  0x02: 8,
  0x03: 16,
  0x04: 32,
  0x05: 64,
  0x06: 128,
  0x07: 256,
  0x08: 512,
};

const RAM_BYTES: Record<number, number> = {
  0x00: 0,
  0x01: 2 * 1024,
  0x02: 8 * 1024,
  0x03: 32 * 1024,
  0x04: 128 * 1024,
  0x05: 64 * 1024,
};

/**
 * @see https://gbdev.io/pandocs/The_Cartridge_Header.html
 */
export function parseCartridgeHeader(rom: Uint8Array): CartridgeHeader {
  if (rom.length < 0x150) {
    throw new Error('ROM too small to contain a cartridge header');
  }
  let title = '';
  for (let i = 0x134; i <= 0x143; i++) {
    const c = rom[i]!;
    if (c === 0) break;
    if (c >= 0x20 && c <= 0x7e) title += String.fromCharCode(c);
  }
  const cartType = rom[0x147]!;
  const romSizeCode = rom[0x148]!;
  const ramSizeCode = rom[0x149]!;
  const romBanks = ROM_BANKS[romSizeCode] ?? 2;
  // MBC2 built-in 512×4-bit RAM even when RAM size code is 0
  let ramSizeBytes = RAM_BYTES[ramSizeCode] ?? 0;
  if ((cartType === 0x05 || cartType === 0x06) && ramSizeBytes === 0) {
    ramSizeBytes = 512;
  }
  const ramBanks =
    cartType === 0x05 || cartType === 0x06
      ? 1
      : ramSizeBytes === 0
        ? 0
        : Math.max(1, Math.floor(ramSizeBytes / 0x2000));
  return {
    title,
    cartType,
    romSizeCode,
    ramSizeCode,
    romBanks,
    ramBanks,
    romSizeBytes: romBanks * 0x4000,
    ramSizeBytes,
  };
}
