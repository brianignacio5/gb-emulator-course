import type { u8 } from '../types.js';

/** Lesson 13 */
export function decodeTileRow(_low: u8, _high: u8): u8[] {
  let row: u8[] = [];
  for (let i = 7; i >= 0; i--) {
    let lowBit = (_low >> i) & 0x01;
    let highBit = (_high >> i) & 0x01;
    row.push((highBit << 1) | lowBit);
  }
  return row;
}

export function decodeTile(_bytes: Uint8Array | number[]): u8[][] {
  const tile: u8[][] = [];
  for (let i = 0; i < _bytes.length; i += 2) {
    tile.push(decodeTileRow(_bytes[i], _bytes[i + 1]));
  }
  return tile;
}

export function applyPalette(_colorIndex: u8, _palette: u8): u8 {
  return (_palette >> (_colorIndex * 2)) & 0x03;
}
