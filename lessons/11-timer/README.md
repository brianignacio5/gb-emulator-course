# Lesson 11: Timer & DIV

`DIV` is the high byte of an internal 16-bit counter. `TIMA` increments on falling edges of a bit selected by `TAC`; overflow reloads `TMA` and requests interrupt bit 2.

Pan Docs: https://gbdev.io/pandocs/Timer_and_Divider_Registers.html

## Files to edit

- `src/timer/timer.ts`
