# Game Boy Emulator Course (TypeScript)

Build a **DMG (original Game Boy)** emulator from scratch in TypeScript — one lesson at a time, with unit tests for every milestone.

Hardware reference: [Pan Docs](https://gbdev.io/pandocs/Specifications.html)

## How to study

1. Open `lessons/NN-*/README.md` and read the theory.
2. Complete the checklist in `TASK.md`.
3. Implement the stubs under `src/`.
4. Run that lesson’s tests:

```bash
npm install
npm run test:lesson -- 01
```

5. Stuck? Compare with `solutions/NN-*/` or peek at the full reference tree in `solutions/complete/`.
6. From lesson 17 onward: `npm run dev` for the canvas UI.

**Verify the reference solutions (maintainers):**

```bash
npm run test:solutions
```

## Course map

| # | Lesson | Focus | Pan Docs |
|---|--------|-------|----------|
| 00 | [Project setup](lessons/00-setup/README.md) | Tooling & layout | — |
| 01 | [Registers & flags](lessons/01-registers/README.md) | AF/BC/DE/HL, ZNHC | [Registers](https://gbdev.io/pandocs/CPU_Registers_and_Flags.html) |
| 02 | [Memory bus](lessons/02-memory-bus/README.md) | 64 KiB map, Echo RAM | [Memory Map](https://gbdev.io/pandocs/Memory_Map.html) |
| 03 | [Cartridge header](lessons/03-cartridge/README.md) | ROM load, ROM-only | [Header](https://gbdev.io/pandocs/The_Cartridge_Header.html) |
| 04 | [CPU skeleton](lessons/04-cpu-skeleton/README.md) | fetch/decode/execute, NOP | [CPU](https://gbdev.io/pandocs/CPU_Instruction_Set.html) |
| 05 | [Loads & stack](lessons/05-loads-stack/README.md) | LD, PUSH/POP | same |
| 06 | [ALU & flags](lessons/06-alu/README.md) | ADD/SUB/AND/…, DAA | same |
| 07 | [Control flow](lessons/07-control-flow/README.md) | JP/JR/CALL/RET/RST | same |
| 08 | [CB prefix](lessons/08-cb-prefix/README.md) | rotates, BIT/SET/RES | same |
| 09 | [Interrupts](lessons/09-interrupts/README.md) | IME, IE, IF | [Interrupts](https://gbdev.io/pandocs/Interrupts.html) |
| 10 | [CPU acceptance](lessons/10-cpu-acceptance/README.md) | opcode suite / Blargg hook | — |
| 11 | [Timer & DIV](lessons/11-timer/README.md) | DIV/TIMA/TMA/TAC | [Timer](https://gbdev.io/pandocs/Timer_and_Divider_Registers.html) |
| 12 | [Joypad](lessons/12-joypad/README.md) | P1 matrix | [Joypad](https://gbdev.io/pandocs/Joypad_Input.html) |
| 13 | [Tiles & framebuffer](lessons/13-tiles/README.md) | 2bpp decode | [Tile Data](https://gbdev.io/pandocs/Tile_Data.html) |
| 14 | [BG & scroll](lessons/14-background/README.md) | LCDC, SCX/SCY, BGP | [LCDC](https://gbdev.io/pandocs/LCDC.html) |
| 15 | [PPU timing](lessons/15-ppu-timing/README.md) | modes, LY, STAT | [STAT](https://gbdev.io/pandocs/STAT.html) |
| 16 | [Sprites & DMA](lessons/16-sprites-dma/README.md) | OAM, DMA | [OAM](https://gbdev.io/pandocs/OAM.html) |
| 17 | [Canvas UI](lessons/17-ui/README.md) | Vite, rAF, keyboard | — |
| 18 | [MBC1](lessons/18-mbc1/README.md) | ROM/RAM banking | [MBC1](https://gbdev.io/pandocs/MBC1.html) |
| 19 | [MBC2 & MBC3](lessons/19-mbc2-mbc3/README.md) | more mappers | [MBC2](https://gbdev.io/pandocs/MBC2.html), [MBC3](https://gbdev.io/pandocs/MBC3.html) |
| 20 | [APU mixer](lessons/20-apu-mixer/README.md) | NR50–52, sequencer | [Audio](https://gbdev.io/pandocs/Audio_Overview.html) |
| 21 | [Square channels](lessons/21-apu-square/README.md) | CH1/CH2 | [Channel 1](https://gbdev.io/pandocs/Audio_Registers.html) |
| 22 | [Wave & noise](lessons/22-apu-wave-noise/README.md) | CH3/CH4 | same |
| 23 | [Browser audio](lessons/23-browser-audio/README.md) | AudioContext | — |
| 24 | [Capstone](lessons/24-capstone/README.md) | saves, accuracy notes | — |

## Architecture

```text
Cartridge → Bus ← CPU
              ↑
    Timer / PPU / APU / Joypad / IE·IF
              ↓
         Canvas + Audio (browser)
```

CPU `step()` returns **T-cycles**; peripherals advance by that amount.

## Layout

- `src/` — **your** code (stubs to fill in)
- `lessons/` — theory + tasks
- `tests/lessons/` — Vitest suites
- `solutions/` — per-lesson snapshots + `complete/` full reference
- `roms/` — drop your own `.gb` files here (gitignored)
- `fixtures/` — tiny synthetic test data (optional Blargg ROMs go in `fixtures/blargg/`, which stays gitignored)

## Scope choices

- Target: **DMG only** (not CGB)
- PPU: **scanline**, not pixel-FIFO
- Boot ROM: skipped; post-boot register init
- APU: functional channels (not bit-perfect)
- MBC3 RTC: simple register surface
