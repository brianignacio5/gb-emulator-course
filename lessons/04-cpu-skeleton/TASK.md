# Task — Lesson 04

1. In `Cpu.step()`, read the opcode at `PC` and advance `PC` by 1 (wrap at 16 bits).
2. On `NOP` (`0x00`), leave `A`, `BC`, `DE`, `HL`, `SP`, the flags, `ime`, and `halt` unchanged, and do not write memory.
3. Return `4` T-cycles for `NOP`.
4. Run `npm run test:lesson -- 04`
