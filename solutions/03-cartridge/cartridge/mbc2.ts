import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/**
 * MBC2 mapper: 16 ROM banks max, built-in 512×4-bit RAM.
 */
export class Mbc2Cartridge implements CartridgeLike {
  private ramEnable = false;
  private romBank = 1;
  private readonly rom: Uint8Array;
  private readonly romBanks: number;
  private readonly ram = new Uint8Array(512);

  constructor(rom: Uint8Array, romBanks: number) {
    this.rom = rom;
    this.romBanks = Math.min(16, Math.max(2, romBanks));
  }

  get saveRam(): Uint8Array {
    return this.ram;
  }

  read(addr: u16): u8 {
    if (addr <= 0x3fff) {
      return this.rom[addr] ?? 0xff;
    }
    if (addr <= 0x7fff) {
      const bank = (this.romBank || 1) % this.romBanks;
      return this.rom[bank * 0x4000 + (addr - 0x4000)] ?? 0xff;
    }
    if (addr >= 0xa000 && addr <= 0xa1ff) {
      if (!this.ramEnable) return 0xff;
      return (this.ram[addr - 0xa000]! & 0x0f) | 0xf0;
    }
    if (addr >= 0xa200 && addr <= 0xbfff) {
      if (!this.ramEnable) return 0xff;
      const i = (addr - 0xa000) & 0x1ff;
      return (this.ram[i]! & 0x0f) | 0xf0;
    }
    return 0xff;
  }

  write(addr: u16, value: u8): void {
    if (addr <= 0x3fff) {
      if ((addr & 0x0100) === 0) {
        this.ramEnable = (value & 0x0f) === 0x0a;
      } else {
        this.romBank = value & 0x0f;
        if (this.romBank === 0) this.romBank = 1;
      }
      return;
    }
    if (addr >= 0xa000 && addr <= 0xa1ff) {
      if (!this.ramEnable) return;
      this.ram[addr - 0xa000] = value & 0x0f;
      return;
    }
    if (addr >= 0xa200 && addr <= 0xbfff) {
      if (!this.ramEnable) return;
      this.ram[(addr - 0xa000) & 0x1ff] = value & 0x0f;
    }
  }
}
