import type { u8 } from '../types.js';

/** Decode one tile row from two bit-plane bytes → 8 color indices (0–3). */
export function decodeTileRow(low: u8, high: u8): u8[] {
  const out: u8[] = [];
  for (let x = 0; x < 8; x++) {
    const bit = 7 - x;
    const l = (low >> bit) & 1;
    const h = (high >> bit) & 1;
    out.push((h << 1) | l);
  }
  return out;
}

/** Decode a 16-byte Game Boy tile into an 8×8 color-index grid. */
export function decodeTile(bytes: Uint8Array | number[]): u8[][] {
  const rows: u8[][] = [];
  for (let y = 0; y < 8; y++) {
    rows.push(decodeTileRow(bytes[y * 2] ?? 0, bytes[y * 2 + 1] ?? 0));
  }
  return rows;
}

/** Apply BGP/OBP palette: maps color index → shade 0–3. */
export function applyPalette(colorIndex: u8, palette: u8): u8 {
  return (palette >> (colorIndex * 2)) & 0x03;
}
