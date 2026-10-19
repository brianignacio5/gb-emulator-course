import type { Memory, u8, u16 } from '../types.js';

export interface CartridgeLike {
  read(addr: u16): u8;
  write(addr: u16, value: u8): void;
}

export interface IoHandlers {
  readJoypad?(): u8;
  writeJoypad?(value: u8): void;
  readTimer?(addr: u16): u8;
  writeTimer?(addr: u16, value: u8): void;
  readPpu?(addr: u16): u8;
  writePpu?(addr: u16, value: u8): void;
  readApu?(addr: u16): u8;
  writeApu?(addr: u16, value: u8): void;
  onDma?(sourcePage: u8): void;
}

/** Implement routing in lesson 02. */
export class Bus implements Memory {
  vram = new Uint8Array(0x2000);
  wram = new Uint8Array(0x2000);
  oam = new Uint8Array(0xa0);
  hram = new Uint8Array(0x7f);
  io = new Uint8Array(0x80);
  ie = 0; // Interrupt Enable Register 04-Joypad 03-Serial 02-Timer 01-LCD 00- VBlack
  ifFlag = 0xe1; // Interrupt Flag Register 04-Joypad 03-Serial 02-Timer 01-LCD 00- VBlack
  cartridge: CartridgeLike | null = null;
  handlers: IoHandlers = {};

  read(_addr: u16): u8 {
    const addr = _addr & 0xFFFF;
    if (addr < 0x8000) { // Cartridge
      return this.cartridge?.read(addr) ?? 0;
    } else if (addr < 0xA000) { // VRAM
      return this.vram[addr - 0x8000];
    } else if (addr < 0xC000) { // Cartridge
      return this.cartridge?.read(addr) ?? 0;
    } else if (addr < 0xE000) { // WRAM
      return this.wram[addr - 0xC000];
    } else if (addr < 0xFE00) { // WRAM
      return this.wram[addr - 0xE000];
    } else if (addr < 0xFEA0) { // OAM
      return this.oam[addr - 0xFE00];
    } else if (addr < 0xFF00) {
      return 0xFF;
    } else if (addr < 0xFF80) { // I/O
      return this.io[addr - 0xFF00];
    } else if (addr < 0xFFFF) { // HRAM
      return this.hram[addr - 0xFF80];
    } else if (addr === 0xFFFF) { // IE
      return this.ie;
    }
    return 0;
  }

  write(_addr: u16, _value: u8): void {
    const addr = _addr & 0xFFFF;
    if (addr < 0x8000) {
      return;
    } else if (addr < 0xA000) { // VRAM
      this.vram[addr - 0x8000] = _value;
    } else if (addr < 0xC000) { // Cartridge
      return;
    } else if (addr < 0xE000) { // WRAM
      this.wram[addr - 0xC000] = _value;
    } else if (addr < 0xFE00) { // Echo of WRAM
      this.wram[addr - 0xE000] = _value;
    } else if (addr < 0xFEA0) { // OAM
      this.oam[addr - 0xFE00] = _value;
    } else if (addr < 0xFF00) { // Unusable
      return;
    } else if (addr < 0xFF80) { // I/O
      this.io[addr - 0xFF00] = _value;
    } else if (addr < 0xFFFF) { // HRAM
      this.hram[addr - 0xFF80] = _value;
    } else if (addr === 0xFFFF) { // IE
      this.ie = _value & 0x1F;
    }
  }
}
