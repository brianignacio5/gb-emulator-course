# Lesson 10: CPU acceptance

The unit test runs one short program through `Cpu.step()`. The program uses a load, an add, a store, and a jump from lessons 05–07. A passing CPU needs no new code in this lesson.

## Setup

`tests/lessons/10-cpu-acceptance.test.ts` builds a 32 KiB buffer and writes ten bytes at `0x0100`. The bus cartridge reads that buffer. Cartridge writes are ignored. `resetPostBoot()` sets `PC` to `0x0100`. The test then calls `step()` four times, once for each instruction.

## The program

The bytes at `0x0100` are `3E 10 C6 20 EA 00 C0 C3 00 02`.

- `3E 10` is `LD A, 0x10` (lesson 05). `A` becomes `0x10`.
- `C6 20` is `ADD A, 0x20` (lesson 06). `A` becomes `0x30`.
- `EA 00 C0` is `LD (0xC000), A` (lesson 05). The address is little-endian. `0xC000` is the start of work RAM, so the store goes through the bus and work RAM holds `0x30`.
- `C3 00 02` is `JP 0x0200` (lesson 07). `PC` becomes `0x0200`. That address is still inside the ROM buffer. The test stops after the jump and does not run anything there.

After the fourth `step()`, the test expects `A === 0x30`, `bus.read(0xC000) === 0x30`, and `PC === 0x0200`. It does not check flags or T-cycle counts.

If a check fails, the gap is in `src/cpu/cpu.ts`. This lesson adds no new subsystem. The solution snapshot keeps the lesson 09 CPU.

## Blargg

The second test resolves `fixtures/blargg/` and checks that `existsSync` returns a boolean. The directory may be missing or empty. The test does not open a ROM.

Blargg’s `cpu_instrs` suite is optional. The combined ROM is `cpu_instrs.gb` from [retrio/gb-test-roms](https://github.com/retrio/gb-test-roms/tree/master/cpu_instrs), also packaged as [cpu_instrs.zip](https://gbdev.gg8.se/files/roms/blargg-gb-tests/cpu_instrs.zip). Place it in `fixtures/blargg/`. That path is gitignored. Lesson 24 mentions the same optional suite.

## Files to edit

- `src/cpu/cpu.ts`, only when the mini program fails
