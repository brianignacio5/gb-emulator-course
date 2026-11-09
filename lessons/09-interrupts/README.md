# Lesson 09: Interrupts

`InterruptController` stores which interrupts have been requested and which of those the program has enabled. It does not run by itself. Nothing in this class fetches an opcode or moves `PC`. `Cpu.step` is the only place an interrupt becomes a jump, and only when `Cpu.ime` is set.

`IE` and `IF` are the two hardware registers. `IME` is a separate master switch that lives on the CPU. `DI`, `EI`, and `RETI` change that switch. Lesson 07 left `RETI` unimplemented because `IME` belongs here.

Pan Docs: https://gbdev.io/pandocs/Interrupts.html

Timings below are T-cycles, four times the M-cycle counts on Pan Docs.

## `IE`, `IF`, and `IME`

The class is `InterruptController` in `src/interrupts/interrupts.ts`.

| Field | Register | Role |
| --- | --- | --- |
| `ie` | `IE` (`0xFFFF`) | Enable mask. A bit here allows that source to be taken. |
| `ifFlag` | `IF` (`0xFF0F`) | Request latch. Hardware, or a test, sets a bit here. Servicing clears it. |
| `Cpu.ime` | `IME` | Master enable. `step` reads this field, not `InterruptController.ime`. |

`getIe`, `setIe`, `getIf`, and `setIf` are already implemented. This lesson fills `request`, `pending`, and `acknowledge`.

Only bits 0–4 are real sources. Bits 5–7 of `IF` read as 1 on the DMG and are not interrupts, so every check masks with `& 0x1f`.

| Bit | Constant | Source | Vector |
| --- | --- | --- | --- |
| 0 | `INT_VBLANK` | VBlank | `0x40` |
| 1 | `INT_STAT` | LCD | `0x48` |
| 2 | `INT_TIMER` | Timer | `0x50` |
| 3 | `INT_SERIAL` | Serial | `0x58` |
| 4 | `INT_JOYPAD` | Joypad | `0x60` |

Lowest bit wins. VBlank beats LCD, then Timer, Serial, and Joypad.

## `request`, `pending`, `acknowledge`

`request(bit)` sets that bit in `IF`. The PPU, timer, and joypad call this in later lessons when their event happens. This lesson's tests call it directly. A request sits in `IF` until something acknowledges it. `request` does not look at `IE` or `IME`, and it does not jump.

`pending()` answers "what should be serviced?" It looks at `IE & IF & 0x1f` and returns the lowest set bit as `{ bit, vector }`. No bit set means `null`. It does not look at `IME`, and it does not clear `IF`. With `IE` equal to `0x1F`, a requested Timer and a requested VBlank return VBlank and `0x40`.

`acknowledge(bit)` clears that one bit in `IF`. The other request bits stay, so the next `pending()` call can return the next source.

## When `Cpu.step` runs them

The controller never calls into the CPU. At the top of `Cpu.step`, before `fetch8`, the CPU asks the controller and maybe skips the opcode at `PC`.

1. Finish a delayed `EI`. If `imePending` is set, set `Cpu.ime` and clear `imePending`. Then, if `eiDelay` is set, clear it and set `imePending`. `IME` stays clear for the whole step that consumes `eiDelay`, so the instruction after `EI` still runs with interrupts disabled. The step after that sets `IME` before the service check, so a latched interrupt can run then.
2. If `Cpu.ime` is set, call `pending()`. On a result, clear `halt`, service, and return 20. Do not fetch. Service clears `Cpu.ime`, calls `acknowledge(bit)`, pushes the current `PC` with `push16` (the same stack order as `CALL` and `RST`), and sets `PC` to `vector`. That pushed `PC` is the instruction that did not run. One bit is acknowledged. A lower-priority request stays in `IF`, and `IME` is clear, so it waits for the handler to return with `RETI` or `EI`.
3. If `halt` is still set and `IME` is clear, but `IE & IF & 0x1f` is nonzero, clear `halt` and fall through to `fetch8`. The interrupt is not taken. `PC` does not change to a vector. This is how `HALT` wakes while interrupts are disabled. If nothing is latched, return 4 and do not fetch. The HALT bug stays unimplemented, as lesson 07 said.
4. Otherwise fetch and execute.

No service happens when `IME` is clear, or when `IE` does not enable the requested bit. In both cases the opcode at `PC` runs.

The lesson test places `NOP` (`0x00`) at `0x0100` with `SP` at `0xFFFE`. Servicing VBlank returns 20, sets `PC` to `0x0040`, leaves `SP` at `0xFFFC`, and writes `0x0100` little-endian at `0xFFFC`. `IME` is clear afterward, and `pending()` is `null` when that was the only enabled request.

## `DI`, `EI`, `RETI`

`DI` (`0xF3`) clears `Cpu.ime`, `eiDelay`, and `imePending`, and returns 4. `PC` advances by 1. A following `step` still does not service, because `IME` is clear and the delayed enable was cancelled.

`EI` (`0xFB`) sets `eiDelay` only. It returns 4 and does not set `IME` yet. The next opcode still runs with interrupts disabled. The step after that one can service.

`RETI` (`0xD9`) is the same pop as `RET` (`0xC9`): `PC = pop16()`. It then sets `Cpu.ime` immediately and returns 16. It does not use `eiDelay` or `imePending`. If an interrupt is already pending and enabled, the next `step` services it instead of executing the instruction at the popped `PC`.

## Files to edit

- `src/interrupts/interrupts.ts`
- `src/cpu/cpu.ts`
