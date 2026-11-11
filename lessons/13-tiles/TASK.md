# Task — Lesson 13

1. `decodeTileRow(low, high)` returns eight color indices. Walk the bits from bit 7 down to bit 0. Bit 7 is the leftmost pixel, at index 0. The low byte supplies bit 0 of the color and the high byte supplies bit 1: `(highBit << 1) | lowBit`. `decodeTileRow(0x80, 0x80)` is `[3, 0, 0, 0, 0, 0, 0, 0]`.
2. `decodeTile(bytes)` returns eight rows. Row `y` is `decodeTileRow` of byte `y * 2` (low) and byte `y * 2 + 1` (high). The 16-byte test tile is `0xFF`, `0x00`, then zeros. Its row 0 is `[1, 1, 1, 1, 1, 1, 1, 1]`.
3. `applyPalette(colorIndex, palette)` returns the shade in the two bits at `colorIndex * 2`: `(palette >> (colorIndex * 2)) & 0x03`. BGP, OBP0, and OBP1 share this packing. For `0xE4`, indices 0, 1, 2, and 3 return 0, 1, 2, and 3. For `0x1B`, those indices return 3, 2, 1, and 0.
4. Run `npm run test:lesson -- 13`. Edit `src/ppu/tiles.ts`. Leave `Ppu` and the bus alone.
