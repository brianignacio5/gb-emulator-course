# Lesson 02: Memory bus

The Game Boy CPU sees one flat 16-bit address space. Your `Bus` routes each range to ROM, VRAM, WRAM, OAM, I/O, HRAM, or IE.

Pan Docs: https://gbdev.io/pandocs/Memory_Map.html

Echo RAM (`0xE000–0xFDFF`) mirrors `0xC000–0xDDFF`.

## Files to edit

- `src/memory/bus.ts`
