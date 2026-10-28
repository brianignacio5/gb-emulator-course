# Lesson 04: CPU skeleton

`Cpu.step()` runs one instruction and reports how long it took. The rest of the emulator will later advance the timer, PPU, and APU by that amount.

After `resetPostBoot()`, `PC` is `0x0100`, the cartridge entry point. Each call to `step()` does three things: fetch the opcode, execute it, and return the T-cycle count.

## Fetch the opcode

The opcode is the byte in memory at `PC`. Read it through `Memory.read`. On a real boot that address sits in the cartridge ROM.

Fetching consumes the byte, so `PC` becomes `PC + 1`, wrapping at 16 bits (`0xFFFF` goes to `0x0000`). Later instructions use the same fetch to pull extra operand bytes that follow the opcode. `NOP` has no operand, so this lesson reads exactly one byte.

## Execute

Decode that byte and apply the instruction. This lesson handles opcode `0x00` only.

Fetch and execute can live inline inside `step()`, or in private helpers. The test only calls `step()`.

## Return T-cycles

`step()` returns how many T-cycles the instruction used. A T-cycle is one tick of the CPU clock (about 4.19 MHz). Pan Docs lists timing in M-cycles, and one M-cycle is four T-cycles. Each instruction has its own count.

## NOP

`NOP` (`0x00`) is "no operation". Games use it to waste a little time or to pad alignment. It takes 1 M-cycle, so `step()` returns `4`.

The only state update is the `PC` advance from the fetch. These stay as they were:

| State | After `NOP` |
| --- | --- |
| `A`, `BC`, `DE`, `HL`, `SP` | unchanged |
| `F` and the flags `Z`, `N`, `H`, `C` | unchanged |
| `ime`, `halt` | unchanged |
| memory | no write |

The lesson test places `0x00` at `0x0100`. After one `step()`, `PC` is `0x0101` and the return value is `4`.

## Scope

Edit only `step()` in `src/cpu/cpu.ts`. Lessons 05–09 add the other opcodes, `HALT`, interrupts, and the `CB` prefix to this same method. An opcode other than `NOP` can stay unimplemented here.

Pan Docs: https://gbdev.io/pandocs/CPU_Instruction_Set.html

## Files to edit

- `src/cpu/cpu.ts`

Compare with `solutions/04-cpu-skeleton/` or `solutions/complete/cpu/cpu.ts`.
