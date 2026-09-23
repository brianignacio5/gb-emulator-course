import { describe, expect, it } from 'vitest';
import { applyPalette, decodeTile, decodeTileRow } from '@emu/ppu/tiles.js';

describe('lesson 13 — tiles & palette', () => {
  it('decodes a tile row', () => {
    // low=0b10000000 high=0b10000000 → leftmost pixel color 3
    expect(decodeTileRow(0x80, 0x80)).toEqual([3, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('decodes a full tile (16 bytes)', () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0xff;
    bytes[1] = 0x00; // row0 all color 1
    const tile = decodeTile(bytes);
    expect(tile[0]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('applies BGP palette', () => {
    // BGP = 0b11100100 → idx0→0,1→1,2→2,3→3
    expect(applyPalette(0, 0xe4)).toBe(0);
    expect(applyPalette(1, 0xe4)).toBe(1);
    expect(applyPalette(2, 0xe4)).toBe(2);
    expect(applyPalette(3, 0xe4)).toBe(3);
  });
});
