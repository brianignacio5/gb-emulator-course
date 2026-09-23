# Lesson 09: Interrupts

When `IME` is set, pending bits in `IF` masked by `IE` vector to `0x40/48/50/58/60`. Priority is VBlank → LCD → Timer → Serial → Joypad.

Pan Docs: https://gbdev.io/pandocs/Interrupts.html

## Files to edit

- `src/interrupts/interrupts.ts`
- `src/cpu/cpu.ts`
