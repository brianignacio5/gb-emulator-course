# Lesson 03: Cartridge header

Parse the header at `0x0100–0x014F` and map a ROM-only cartridge.

`createCartridge` reads `header.cartType` and returns `RomOnlyCartridge` for ROM-only types `0x00`, `0x08`, and `0x09`. Unknown types fall back to ROM-only for now. Lessons 18 and 19 add MBC branches to the same function.

Pan Docs: https://gbdev.io/pandocs/The_Cartridge_Header.html

## Files to edit

- `src/cartridge/header.ts`
- `src/cartridge/romOnly.ts`
- `src/cartridge/index.ts`
