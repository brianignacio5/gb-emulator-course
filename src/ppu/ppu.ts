import type { Memory, u8, u16 } from '../types.js';
import { applyPalette,decodeTileRow } from './tiles.js';

const MODE_HBLANK = 0;
const MODE_VBLANK = 1;
const MODE_OAM = 2;
const MODE_TRANSFER = 3;

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
  dots = 0;
  mode = MODE_OAM;

  constructor(private _mem: Memory) {}

  read(_addr: u16): u8 {
    switch (_addr) {
      case 0xff40: return this.lcdc;
      case 0xff41: return this.stat;
      case 0xff42: return this.scy;
      case 0xff43: return this.scx;
      case 0xff44: return this.ly;
      case 0xff45: return this.lyc;
      case 0xff47: return this.bgp;
      case 0xff48: return this.obp0;
      case 0xff49: return this.obp1;
      case 0xff4a: return this.wy;
      case 0xff4b: return this.wx;
    }
    return 0;
  }

  write(_addr: u16, _value: u8): void {
    switch (_addr) {
      case 0xff40: this.lcdc = _value; break;
      case 0xff41: this.stat = _value; break;
      case 0xff42: this.scy = _value; break;
      case 0xff43: this.scx = _value; break;
      case 0xff44: this.ly = _value; break;
      case 0xff45: this.lyc = _value; break;
      case 0xff47: this.bgp = _value; break;
      case 0xff48: this.obp0 = _value; break;
      case 0xff49: this.obp1 = _value; break;
      case 0xff4a: this.wy = _value; break;
      case 0xff4b: this.wx = _value; break;
    }
  }

  step(_cycles: number): void {
    if ((this.lcdc & 0x80) === 0) return;

    for (let i = 0; i < _cycles; i++) {
      this.dots++;
      this.updateMode();
    }
  }

  private updateMode(): void {
    if (this.dots < 80) {
      this.mode = MODE_OAM;
    } else if (this.dots < 80 + 172) {
      this.mode = MODE_TRANSFER;
    } else {
      if (this.mode !== MODE_HBLANK) {
        this.renderScanline();
      }
      this.mode = MODE_HBLANK;
    }
  }

  private renderScanline(): void {
    const mapBaseAddress = this.lcdc & 0x08 ? 0x9c00 : 0x9800;
    const signed = (this.lcdc & 0x10) === 0;
    for (let x = 0; x < 160; x++) {
      const bgX = (this.scx + x) & 0xff;
      const bgY = (this.scy + this.ly) & 0xff;
      const tileX = bgX >> 3;
      const col =bgX & 0x7;
      const tileY = bgY >> 3;
      const row = bgY & 0x7;
      const mapAddress = mapBaseAddress + (tileY * 32) + tileX;
      const tileDataBaseAddress = (this.lcdc & 0x10) !== 0 ? 0x8000 : 0x8800;
      let tileIndex = this._mem.read(mapAddress);
      if (signed) {
        tileIndex = tileIndex < 128 ? tileIndex : tileIndex - 256;
      }
      const tileDataAddress = tileDataBaseAddress + (tileIndex * 16) + row * 2;
      const tile = decodeTileRow(this._mem.read(tileDataAddress), this._mem.read(tileDataAddress + 1))[col]!;
      const palette = applyPalette(tile, this.bgp);
      this.framebuffer[this.ly * 160 + x] = palette;
    }
  }

  doDma(_sourcePage: u8, _bus: Memory): void {
    throw new Error('TODO: lesson-16 implement OAM DMA');
  }
}
