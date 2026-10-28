# Task — Lesson 05

1. In `execute`, split the opcode into `x` (bits 7–6), `y` (bits 5–3), `z` (bits 2–0), `p` (bits 5–4), and `q` (bit 3). Use the `r8`, `r16`, and `r16stk` index tables in the README.
2. Block 1 (`x === 1`): `LD r8, r8`, copying source `z` to destination `y`. Return 4 T-cycles, or 8 when either index is 6 (`(HL)`). Skip `0x76` (`HALT`).
3. Block 0 (`x === 0`): `LD r8, imm8` (`z === 6`) reads the next byte through `PC`. Return 8 T-cycles, or 12 when the destination is `(HL)`. `LD r16, imm16` (`q === 0 && z === 1`) reads the next word through `PC`; pair 3 is `SP`; return 12.
4. Block 0 memory loads: `LD (r16mem), A` and `LD A, (r16mem)` (`z === 2`, `q` selects the direction). `HL+` / `HL-` update `HL` after the access. `LD (imm16), SP` is `0x08`.
5. Block 3 (`x === 3`): `POP r16stk` is `q === 0 && z === 1` and reads `SP` (12 T-cycles). `PUSH r16stk` is `q === 0 && z === 5` and writes `SP` (16 T-cycles). Pair 3 is `AF`. The same `q` and `z` as step 3 with `x === 0` is the immediate load; here the pointer is `SP`.
6. Block 3 loads that stay off the flags: `LDH (imm8), A`, `LDH A, (imm8)`, `LD (C), A`, `LD A, (C)`, `LD (imm16), A`, `LD A, (imm16)`, and `LD SP, HL`.
7. Run `npm run test:lesson -- 05`
