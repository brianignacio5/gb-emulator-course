# Lesson 09: Interrupts

When `IME` is set, pending bits in `IF` masked by `IE` vector to `0x40/48/50/58/60`. Priority is VBlank → LCD → Timer → Serial → Joypad.

`RETI` (`0xD9`) is the same pop as `RET`, then it sets `IME` immediately and returns 16 T-cycles. Lesson 07 leaves it unimplemented because `IME` belongs here. `DI` (`0xF3`) clears `IME` and returns 4. `EI` (`0xFB`) returns 4 and sets `IME` after the following instruction, so that next opcode still runs with interrupts disabled. `RETI` does not wait.

Pan Docs: https://gbdev.io/pandocs/Interrupts.html

## Files to edit

- `src/interrupts/interrupts.ts`
- `src/cpu/cpu.ts`
