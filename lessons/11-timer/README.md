# Lesson 11: Timer & DIV

`Timer` in `src/timer/timer.ts` owns the divider and the programmable timer. It does not request an interrupt by itself. `onOverflow` is the hook later lessons use to call `request(INT_TIMER)` (bit 2, vector `0x50` from lesson 09). This lesson's tests assign that hook directly. Leave the bus hooks and `Emulator.stepInstruction` alone.

Pan Docs: https://gbdev.io/pandocs/Timer_and_Divider_Registers.html

Timings below are T-cycles, the same unit `Cpu.step` returns. One T-cycle is one tick of the internal counter.

## The 16-bit counter and `DIV`

Keep one 16-bit counter, `divCounter`. `step(cycles)` adds 1 to it for each T-cycle and wraps it with `& 0xffff`.

`DIV` (`0xFF04`) is the high byte: `(divCounter >> 8) & 0xff`. It increases every 256 T-cycles, which is 16384 Hz. Writing any value to `DIV` ignores that value and sets `divCounter` to 0. The stub already does that reset. The falling-edge side effect below is still missing.

`TIMA` (`0xFF05`) is the counter the program reads. `TMA` (`0xFF06`) is the value reloaded after `TIMA` wraps. `TAC` (`0xFF07`) chooses whether `TIMA` runs and which bit of `divCounter` clocks it.

| Field | Register | Role |
| --- | --- | --- |
| `div` | `DIV` (`0xFF04`) | High byte of `divCounter`. Any write clears the counter. |
| `tima` | `TIMA` (`0xFF05`) | Timer counter. Incremented on a falling edge. |
| `tma` | `TMA` (`0xFF06`) | Value copied into `TIMA` when it wraps. |
| `tac` | `TAC` (`0xFF07`) | Bit 2 enables the timer. Bits 1–0 select the speed. |

## Which bit clocks `TIMA`

Bits 1–0 of `TAC` select one bit of `divCounter`. `TIMA` increments when that bit falls from 1 to 0. Use the counter itself. A second divider that only counts while the timer is enabled drifts from `DIV` and misses the write edges below.

- `00` — bit 9 — falls every 1024 T-cycles — 4096 Hz
- `01` — bit 3 — falls every 16 T-cycles — 262144 Hz
- `10` — bit 5 — falls every 64 T-cycles — 65536 Hz
- `11` — bit 7 — falls every 256 T-cycles — 16384 Hz

Bit 2 of `TAC` is the enable. With that bit clear, `step` still advances `divCounter` and `DIV`, and it leaves `TIMA` alone.

## `step`

For each T-cycle, remember `divCounter`, then add 1 and mask with `& 0xffff`. If bit 2 of `TAC` is set, take the bit selected by bits 1–0. When that bit was 1 in the old counter and 0 in the new one, increment `TIMA`.

Increment is `tima = (tima + 1) & 0xff`. When that result is 0, set `tima = tma` and call `onOverflow` if it is set. Do both in the same T-cycle the increment wraps. This lesson uses that immediate reload. The DMG's 4 T-cycle wait before the reload, and a write to `TIMA` during that wait cancelling it, stay out of this lesson.

## Writes that are also falling edges

Resetting the counter or changing `TAC` can drop the selected bit from 1 to 0. That is the same edge `step` detects, so it increments `TIMA` too. The stub's `write` stores the registers and clears the counter, and it does not yet apply this edge.

Writing `DIV` sets `divCounter` to 0. If the timer is enabled and the selected bit was 1 before the clear, increment `TIMA`.

Writing `TAC` can switch the selected bit or clear the enable. Read the old `(enabled && selected bit)` before storing, then the new one after storing. If that value goes from 1 to 0, increment `TIMA`. Store `value & 0x07`. Only the low three bits are real.

## `read`

`read` returns the register for `0xFF04`–`0xFF07`. `DIV` is the getter above. `TIMA` and `TMA` return the stored bytes. `TAC` returns the stored low three bits with `| 0xf8`, because bits 3–7 read as 1. Any other address returns `0xFF`.

## Files to edit

- `src/timer/timer.ts`
