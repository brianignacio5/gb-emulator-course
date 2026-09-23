# Lesson 16: Sprites & OAM DMA

Writing `0xFF46` triggers a copy of `0xA0` bytes from `value<<8` into OAM. Draw up to 10 sprites per line.

Pan Docs: https://gbdev.io/pandocs/OAM.html

## Files to edit

- `src/ppu/ppu.ts`
