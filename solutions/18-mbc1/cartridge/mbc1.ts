import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/**
 * MBC1 mapper: ROM banking + optional RAM banking, mode 0/1.
 */
export class Mbc1Cartridge implements CartridgeLike {
  private ramEnable = false;
  private romBankLower = 1;
  private bankUpper = 0;
  private mode = 0;
  private readonly rom: Uint8Array;
  private readonly ram: Uint8Array;
  private readonly romBanks: number;
  private readonly ramBanks: number;

  constructor(rom: Uint8Array, romBanks: number, ramSizeBytes: number) {
    this.rom = rom;
    this.romBanks = Math.max(2, romBanks);
    this.ramBanks = ramSizeBytes > 0 ? Math.max(1, Math.ceil(ramSizeBytes / 0x2000)) : 0;
    this.ram = new Uint8Array(Math.max(ramSizeBytes, this.ramBanks * 0x2000));
  }

  get saveRam(): Uint8Array {
    return this.ram;
  }

  private romBank(): number {
    let bank = this.romBankLower & 0x1f;
    if (bank === 0) bank = 1;
    if (this.mode === 0) {
      bank |= (this.bankUpper & 0x03) << 5;
    }
    return bank % this.romBanks;
  }

  private bank0(): number {
    if (this.mode === 1) {
      return ((this.bankUpper & 0x03) << 5) % this.romBanks;
    }
    return 0;
  }

  private ramBank(): number {
    if (this.mode === 1 && this.ramBanks > 1) {
      return (this.bankUpper & 0x03) % this.ramBanks;
    }
    return 0;
  }

  read(addr: u16): u8 {
    if (addr <= 0x3fff) {
      const base = this.bank0() * 0x4000;
      return this.rom[base + addr] ?? 0xff;
    }
    if (addr <= 0x7fff) {
      const base = this.romBank() * 0x4000;
      return this.rom[base + (addr - 0x4000)] ?? 0xff;
    }
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnable || this.ramBanks === 0) return 0xff;
      const offset = this.ramBank() * 0x2000 + (addr - 0xa000);
      return this.ram[offset] ?? 0xff;
    }
    return 0xff;
  }

  write(addr: u16, value: u8): void {
    if (addr <= 0x1fff) {
      this.ramEnable = (value & 0x0f) === 0x0a;
      return;
    }
    if (addr <= 0x3fff) {
      this.romBankLower = value & 0x1f;
      return;
    }
    if (addr <= 0x5fff) {
      this.bankUpper = value & 0x03;
      return;
    }
    if (addr <= 0x7fff) {
      this.mode = value & 0x01;
      return;
    }
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnable || this.ramBanks === 0) return;
      const offset = this.ramBank() * 0x2000 + (addr - 0xa000);
      if (offset < this.ram.length) this.ram[offset] = value & 0xff;
    }
  }
}
