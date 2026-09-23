import type { Memory, u8, u16 } from '../types.js';

/** Lessons 14–16 */
export class Ppu {
  lcdc = 0x91;
  stat = 0x85;
  scy = 0;
  scx = 0;
  ly = 0;
  lyc = 0;
  bgp = 0xfc;
  obp0 = 0xff;
  obp1 = 0xff;
  wy = 0;
  wx = 0;
  framebuffer = new Uint8Array(160 * 144);
  onVBlank: (() => void) | null = null;
  onStat: (() => void) | null = null;

  constructor(private _mem: Memory) {}

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-14/15');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-14/15');
  }

  step(_cycles: number): void {
    throw new Error('TODO: lesson-15 implement PPU step');
  }

  doDma(_sourcePage: u8, _bus: Memory): void {
    throw new Error('TODO: lesson-16 implement OAM DMA');
  }
}
