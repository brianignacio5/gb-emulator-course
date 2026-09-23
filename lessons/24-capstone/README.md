# Lesson 24: Capstone

Wire everything together, load real ROMs, and understand what this learning emulator simplifies.

## Accuracy notes

- **Scanline PPU**, not pixel-FIFO — enough for most DMG games; mid-scanline effects may differ from hardware.
- **MBC3 RTC** is a simple register surface, not full latch edge-case behavior.
- **Serial link** is not emulated.
- **Boot ROM** is skipped (post-boot register init).

## Saves

Use `emulator.getSaveRam()` to export battery-backed RAM. Restore by copying bytes into the cartridge `saveRam` buffer.

## Try next

1. `npm run dev` and load a ROM you legally own into `roms/`.
2. Homebrew from [gbdev](https://gbdev.io/).
3. Optional: Blargg / Mooneye suites under `fixtures/blargg/`.

## Files to edit

- `src/emulator.ts` (full wiring — see `solutions/complete/emulator.ts`)
- `src/ui/main.ts`
