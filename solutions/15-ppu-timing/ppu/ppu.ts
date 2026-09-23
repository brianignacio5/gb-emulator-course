import type { Memory, u8, u16 } from '../types.js';
import { decodeTileRow } from './tiles.js';

const DOTS_PER_LINE = 456;
const LINES_PER_FRAME = 154;
const VISIBLE_LINES = 144;
const SCREEN_W = 160;
const SCREEN_H = 144;

const MODE_HBLANK = 0;
const MODE_VBLANK = 1;
const MODE_OAM = 2;
const MODE_TRANSFER = 3;

/**
 * Scanline PPU with background + basic sprites.
 * Uses mem.read for VRAM/tile maps (bus address space).
 */
export class Ppu {
  lcdc: u8 = 0x91;
  stat: u8 = 0x85;
  scy: u8 = 0;
  scx: u8 = 0;
  ly: u8 = 0;
  lyc: u8 = 0;
  bgp: u8 = 0xfc;
  obp0: u8 = 0xff;
  obp1: u8 = 0xff;
  wy: u8 = 0;
  wx: u8 = 0;
  framebuffer = new Uint8Array(SCREEN_W * SCREEN_H);
  onVBlank: (() => void) | null = null;
  onStat: (() => void) | null = null;

  private dots = 0;
  private mode = MODE_OAM;
  private windowLine = 0;
  private statIrqLine = false;

  constructor(private mem: Memory) {}

  read(addr: u16): u8 {
    switch (addr & 0xffff) {
      case 0xff40:
        return this.lcdc;
      case 0xff41:
        return 0x80 | (this.stat & 0x78) | (this.ly === this.lyc ? 0x04 : 0) | (this.mode & 3);
      case 0xff42:
        return this.scy;
      case 0xff43:
        return this.scx;
      case 0xff44:
        return this.ly;
      case 0xff45:
        return this.lyc;
      case 0xff47:
        return this.bgp;
      case 0xff48:
        return this.obp0;
      case 0xff49:
        return this.obp1;
      case 0xff4a:
        return this.wy;
      case 0xff4b:
        return this.wx;
      default:
        return 0xff;
    }
  }

  write(addr: u16, value: u8): void {
    value &= 0xff;
    switch (addr & 0xffff) {
      case 0xff40: {
        const wasOn = (this.lcdc & 0x80) !== 0;
        this.lcdc = value;
        if (wasOn && (value & 0x80) === 0) {
          this.ly = 0;
          this.dots = 0;
          this.mode = MODE_HBLANK;
        }
        break;
      }
      case 0xff41:
        this.stat = (this.stat & 0x07) | (value & 0x78);
        break;
      case 0xff42:
        this.scy = value;
        break;
      case 0xff43:
        this.scx = value;
        break;
      case 0xff44:
        break;
      case 0xff45:
        this.lyc = value;
        this.checkStatIrq();
        break;
      case 0xff47:
        this.bgp = value;
        break;
      case 0xff48:
        this.obp0 = value;
        break;
      case 0xff49:
        this.obp1 = value;
        break;
      case 0xff4a:
        this.wy = value;
        break;
      case 0xff4b:
        this.wx = value;
        break;
    }
  }

  doDma(sourcePage: u8, bus: Memory): void {
    const src = (sourcePage & 0xff) << 8;
    for (let i = 0; i < 0xa0; i++) {
      bus.write(0xfe00 + i, bus.read((src + i) & 0xffff));
    }
  }

  step(cycles: number): void {
    if ((this.lcdc & 0x80) === 0) return;

    for (let i = 0; i < cycles; i++) {
      this.dots++;
      this.updateMode();
      if (this.dots >= DOTS_PER_LINE) {
        this.dots -= DOTS_PER_LINE;
        this.endOfLine();
      }
    }
  }

  private updateMode(): void {
    if (this.ly >= VISIBLE_LINES) {
      this.setMode(MODE_VBLANK);
      return;
    }
    if (this.dots < 80) {
      this.setMode(MODE_OAM);
    } else if (this.dots < 80 + 172) {
      this.setMode(MODE_TRANSFER);
    } else {
      if (this.mode !== MODE_HBLANK) {
        this.renderScanline();
      }
      this.setMode(MODE_HBLANK);
    }
  }

  private setMode(mode: number): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.checkStatIrq();
  }

  private endOfLine(): void {
    if (this.ly < VISIBLE_LINES && this.mode !== MODE_HBLANK) {
      this.renderScanline();
    }

    this.ly++;
    if (this.ly === VISIBLE_LINES) {
      this.setMode(MODE_VBLANK);
      this.onVBlank?.();
      this.checkStatIrq();
    }
    if (this.ly >= LINES_PER_FRAME) {
      this.ly = 0;
      this.windowLine = 0;
      this.setMode(MODE_OAM);
    }
    this.checkStatIrq();
  }

  private checkStatIrq(): void {
    const lycEq = this.ly === this.lyc;
    let fire = false;
    if ((this.stat & 0x40) && lycEq) fire = true;
    if ((this.stat & 0x20) && this.mode === MODE_OAM) fire = true;
    if ((this.stat & 0x10) && this.mode === MODE_VBLANK) fire = true;
    if ((this.stat & 0x08) && this.mode === MODE_HBLANK) fire = true;

    if (fire && !this.statIrqLine) {
      this.onStat?.();
    }
    this.statIrqLine = fire;
  }

  private mapColor(palette: u8, index: u8): u8 {
    return (palette >> (index * 2)) & 0x03;
  }

  private vram(addr: u16): u8 {
    return this.mem.read(addr & 0xffff);
  }

  private tilePixel(tileIndex: number, row: number, col: number, signed: boolean, base: number): u8 {
    let idx = tileIndex;
    if (signed) {
      idx = tileIndex < 128 ? tileIndex : tileIndex - 256;
    }
    const addr = signed
      ? 0x9000 + idx * 16 + row * 2
      : base + idx * 16 + row * 2;
    const lo = this.vram(addr);
    const hi = this.vram(addr + 1);
    return decodeTileRow(lo, hi)[col]!;
  }

  private renderScanline(): void {
    if (this.ly >= VISIBLE_LINES) return;
    const line = this.ly;
    const rowBg = new Uint8Array(SCREEN_W);
    const rowPri = new Uint8Array(SCREEN_W);

    if (this.lcdc & 0x01) {
      const mapBase = this.lcdc & 0x08 ? 0x9c00 : 0x9800;
      const signed = (this.lcdc & 0x10) === 0;
      const tileBase = signed ? 0x9000 : 0x8000;
      const y = (this.scy + line) & 0xff;
      const tileY = y >> 3;
      const row = y & 7;

      for (let x = 0; x < SCREEN_W; x++) {
        const lx = (this.scx + x) & 0xff;
        const tileX = lx >> 3;
        const col = lx & 7;
        const mapAddr = mapBase + tileY * 32 + tileX;
        const tileIndex = this.vram(mapAddr);
        const color = this.tilePixel(tileIndex, row, col, signed, tileBase);
        rowBg[x] = this.mapColor(this.bgp, color);
        rowPri[x] = color === 0 ? 1 : 0;
      }
    } else {
      rowBg.fill(0);
      rowPri.fill(1);
    }

    if ((this.lcdc & 0x20) !== 0 && (this.lcdc & 0x01) !== 0 && line >= this.wy && this.wx <= 166) {
      const mapBase = this.lcdc & 0x40 ? 0x9c00 : 0x9800;
      const signed = (this.lcdc & 0x10) === 0;
      const tileBase = signed ? 0x9000 : 0x8000;
      const wx = this.wx - 7;
      let rendered = false;
      const y = this.windowLine;
      const tileY = y >> 3;
      const row = y & 7;

      for (let x = Math.max(0, wx); x < SCREEN_W; x++) {
        const lx = x - wx;
        if (lx < 0) continue;
        rendered = true;
        const tileX = lx >> 3;
        const col = lx & 7;
        const mapAddr = mapBase + tileY * 32 + tileX;
        const tileIndex = this.vram(mapAddr);
        const color = this.tilePixel(tileIndex, row, col, signed, tileBase);
        rowBg[x] = this.mapColor(this.bgp, color);
        rowPri[x] = color === 0 ? 1 : 0;
      }
      if (rendered) this.windowLine++;
    }

    if (this.lcdc & 0x02) {
      const tall = (this.lcdc & 0x04) !== 0;
      const height = tall ? 16 : 8;
      const sprites: { x: number; y: number; tile: number; attr: number }[] = [];

      for (let i = 0; i < 40; i++) {
        const base = 0xfe00 + i * 4;
        const oy = this.mem.read(base) - 16;
        const ox = this.mem.read(base + 1) - 8;
        const tile = this.mem.read(base + 2);
        const attr = this.mem.read(base + 3);
        if (line < oy || line >= oy + height) continue;
        sprites.push({ x: ox, y: oy, tile, attr });
        if (sprites.length >= 10) break;
      }
      sprites.sort((a, b) => b.x - a.x);

      for (const sp of sprites) {
        const pal = sp.attr & 0x10 ? this.obp1 : this.obp0;
        const flipX = (sp.attr & 0x20) !== 0;
        const flipY = (sp.attr & 0x40) !== 0;
        const behind = (sp.attr & 0x80) !== 0;
        let row = line - sp.y;
        if (flipY) row = height - 1 - row;
        let tileIndex = sp.tile;
        if (tall) {
          tileIndex &= 0xfe;
          if (row >= 8) {
            tileIndex |= 1;
            row -= 8;
          }
        }
        const addr = 0x8000 + tileIndex * 16 + row * 2;
        const lo = this.vram(addr);
        const hi = this.vram(addr + 1);
        const pixels = decodeTileRow(lo, hi);

        for (let col = 0; col < 8; col++) {
          const px = sp.x + (flipX ? 7 - col : col);
          if (px < 0 || px >= SCREEN_W) continue;
          const color = pixels[col]!;
          if (color === 0) continue;
          if (behind && rowPri[px] === 0) continue;
          rowBg[px] = this.mapColor(pal, color);
          rowPri[px] = 0;
        }
      }
    }

    this.framebuffer.set(rowBg, line * SCREEN_W);
  }
}
