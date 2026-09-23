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

/** System bus — routes the SM83 16-bit address space. */
export class Bus implements Memory {
  vram = new Uint8Array(0x2000);
  wram = new Uint8Array(0x2000);
  oam = new Uint8Array(0xa0);
  hram = new Uint8Array(0x7f);
  io = new Uint8Array(0x80);
  ie = 0;
  ifFlag = 0xe1;
  cartridge: CartridgeLike | null = null;
  handlers: IoHandlers = {};

  read(addr: u16): u8 {
    addr &= 0xffff;

    if (addr <= 0x7fff) {
      return this.cartridge?.read(addr) ?? 0xff;
    }
    if (addr <= 0x9fff) {
      return this.vram[addr - 0x8000]!;
    }
    if (addr <= 0xbfff) {
      return this.cartridge?.read(addr) ?? 0xff;
    }
    if (addr <= 0xdfff) {
      return this.wram[addr - 0xc000]!;
    }
    if (addr <= 0xfdff) {
      return this.wram[addr - 0xe000]!;
    }
    if (addr <= 0xfe9f) {
      return this.oam[addr - 0xfe00]!;
    }
    if (addr <= 0xfeff) {
      return 0xff;
    }
    if (addr <= 0xff7f) {
      return this.readIo(addr);
    }
    if (addr <= 0xfffe) {
      return this.hram[addr - 0xff80]!;
    }
    return this.ie;
  }

  write(addr: u16, value: u8): void {
    addr &= 0xffff;
    value &= 0xff;

    if (addr <= 0x7fff) {
      this.cartridge?.write(addr, value);
      return;
    }
    if (addr <= 0x9fff) {
      this.vram[addr - 0x8000] = value;
      return;
    }
    if (addr <= 0xbfff) {
      this.cartridge?.write(addr, value);
      return;
    }
    if (addr <= 0xdfff) {
      this.wram[addr - 0xc000] = value;
      return;
    }
    if (addr <= 0xfdff) {
      this.wram[addr - 0xe000] = value;
      return;
    }
    if (addr <= 0xfe9f) {
      this.oam[addr - 0xfe00] = value;
      return;
    }
    if (addr <= 0xfeff) {
      return;
    }
    if (addr <= 0xff7f) {
      this.writeIo(addr, value);
      return;
    }
    if (addr <= 0xfffe) {
      this.hram[addr - 0xff80] = value;
      return;
    }
    this.ie = value;
  }

  private readIo(addr: u16): u8 {
    const off = addr - 0xff00;
    const h = this.handlers;

    if (addr === 0xff00) {
      return h.readJoypad?.() ?? this.io[0]!;
    }
    if (addr >= 0xff04 && addr <= 0xff07) {
      return h.readTimer?.(addr) ?? this.io[off]!;
    }
    if (addr === 0xff0f) {
      return (this.ifFlag & 0x1f) | 0xe0;
    }
    if (addr >= 0xff10 && addr <= 0xff3f) {
      return h.readApu?.(addr) ?? this.io[off]!;
    }
    if (addr >= 0xff40 && addr <= 0xff4b) {
      return h.readPpu?.(addr) ?? this.io[off]!;
    }
    return this.io[off]!;
  }

  private writeIo(addr: u16, value: u8): void {
    const off = addr - 0xff00;
    this.io[off] = value;
    const h = this.handlers;

    if (addr === 0xff00) {
      h.writeJoypad?.(value);
      return;
    }
    if (addr >= 0xff04 && addr <= 0xff07) {
      h.writeTimer?.(addr, value);
      return;
    }
    if (addr === 0xff0f) {
      this.ifFlag = value & 0x1f;
      return;
    }
    if (addr >= 0xff10 && addr <= 0xff3f) {
      h.writeApu?.(addr, value);
      return;
    }
    if (addr === 0xff46) {
      h.onDma?.(value);
      return;
    }
    if (addr >= 0xff40 && addr <= 0xff4b) {
      h.writePpu?.(addr, value);
    }
  }
}
