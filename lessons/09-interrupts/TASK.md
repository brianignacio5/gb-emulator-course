# Task — Lesson 09

1. Implement `request`, `pending`, `acknowledge`.
2. Service interrupts in `Cpu.step` (20 T-cycles). Clear `halt` when an interrupt is serviced.
3. `DI` (`0xF3`) clears `IME` and returns 4. `EI` (`0xFB`) returns 4 and sets `IME` after the next instruction. `RETI` (`0xD9`) pops `PC` like `RET`, sets `IME` immediately, and returns 16.
4. Run `npm run test:lesson -- 09`
