import type { u8, u16 } from '../types.js';
import type { CartridgeLike } from '../memory/bus.js';

/**
 * MBC3: ROM/RAM banking + RTC register stubs.
 */
export class Mbc3Cartridge implements CartridgeLike {
  private ramEnable = false;
  private romBank = 1;
  private ramBank = 0;
  private readonly rom: Uint8Array;
  private readonly ram: Uint8Array;
  private readonly romBanks: number;
  private readonly ramBanks: number;

  private rtc = [0, 0, 0, 0, 0];
  private latchedRtc = [0, 0, 0, 0, 0];
  private latchClock = 0;

  constructor(rom: Uint8Array, romBanks: number, ramSizeBytes: number) {
    this.rom = rom;
    this.romBanks = Math.max(2, romBanks);
    this.ramBanks = ramSizeBytes > 0 ? Math.max(1, Math.ceil(ramSizeBytes / 0x2000)) : 0;
    this.ram = new Uint8Array(Math.max(ramSizeBytes, this.ramBanks * 0x2000));
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
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnable) return 0xff;
      if (this.ramBank >= 0x08 && this.ramBank <= 0x0c) {
        // Direct RTC access when not relying on latch for tests
        return this.rtc[this.ramBank - 0x08]! & 0xff;
      }
      if (this.ramBanks === 0) return 0xff;
      const bank = this.ramBank % this.ramBanks;
      return this.ram[bank * 0x2000 + (addr - 0xa000)] ?? 0xff;
    }
    return 0xff;
  }

  write(addr: u16, value: u8): void {
    if (addr <= 0x1fff) {
      this.ramEnable = (value & 0x0f) === 0x0a;
      return;
    }
    if (addr <= 0x3fff) {
      this.romBank = value & 0x7f;
      if (this.romBank === 0) this.romBank = 1;
      return;
    }
    if (addr <= 0x5fff) {
      this.ramBank = value;
      return;
    }
    if (addr <= 0x7fff) {
      if (this.latchClock === 0 && (value & 1) === 1) {
        this.latchedRtc = this.rtc.slice();
      }
      this.latchClock = value & 1;
      return;
    }
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnable) return;
      if (this.ramBank >= 0x08 && this.ramBank <= 0x0c) {
        this.rtc[this.ramBank - 0x08] = value & 0xff;
        return;
      }
      if (this.ramBanks === 0) return;
      const bank = this.ramBank % this.ramBanks;
      this.ram[bank * 0x2000 + (addr - 0xa000)] = value & 0xff;
    }
  }
}
