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
  ie = 0;
  ifFlag = 0xe1;
  cartridge: CartridgeLike | null = null;
  handlers: IoHandlers = {};

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-02 implement Bus.read');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-02 implement Bus.write');
  }
}
