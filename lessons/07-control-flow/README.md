# Lesson 07: Control flow

Jumps, calls, returns, and `RST` change `PC`. `CALL`, `RST`, and `RET` also change `SP`, through the `push16` and `pop16` helpers from lesson 05. `HALT` and `STOP` change how the next fetch works. None of these instructions write `F`.

The fields are the ones from lesson 05: `x`, `y`, `z`, `p`, and `q`. Pan Docs draws the same rows: [CPU Instruction Set](https://gbdev.io/pandocs/CPU_Instruction_Set.html). Lesson 05 filled the load and stack rows. Lesson 06 filled the arithmetic rows. This lesson fills the control-flow rows, plus `STOP` (`0x10`), which sits in block 0 beside `NOP` and `JR`.

`RETI` (`0xD9`), `DI` (`0xF3`), `EI` (`0xFB`), and clearing `halt` when an interrupt runs are lesson 09. Opcode `0xCB` is lesson 08.

Timings below are T-cycles, four times the M-cycle counts on Pan Docs.

## Condition codes

`JR`, `JP`, `CALL`, and `RET` share one condition. `cc` is a two-bit number:

| `cc` | Name | Taken when |
| --- | --- | --- |
| 0 | `NZ` | `Z` is clear |
| 1 | `Z` | `Z` is set |
| 2 | `NC` | `C` is clear |
| 3 | `C` | `C` is set |

For `RET`, `JP`, and `CALL`, `cc` is `y`, and only `y` of 0–3 is a condition. For `JR`, those two bits sit in bits 4–3, so `cc` is `y - 4` and `y` itself is 4–7.

A taken conditional jump writes `PC`. A not-taken one leaves `PC` at the byte after the operand. `F` stays as it was either way.

## `STOP`

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |

Block 0, `z === 0`, `y === 2`. The opcode is `0x10`. It is two bytes. `fetch8` reads the second byte and discards it. Programs write `0x00` there.

On hardware, `STOP` turns the SoC clock off until a button press. This lesson does not model that low-power state. Skipping the extra byte is the whole job: the following instruction must be the next opcode, and the padding byte must not be fetched as one.

`STOP` returns 4 T-cycles. `PC` advances by 2. `A`, `BC`, `DE`, `HL`, `SP`, `F`, `ime`, and `halt` stay as they were. It writes no memory.

The lesson test places `0x10 0x00` at `0x0100`. After one `step()`, `PC` is `0x0102` and the return value is `4`.

The rest of this `z === 0` column is already assigned:

| `y` | Instruction | Opcode | Lesson |
| --- | --- | --- | --- |
| 0 | `NOP` | `0x00` | 04 |
| 1 | `LD (imm16), SP` | `0x08` | 05 |
| 2 | `STOP` | `0x10` | 07 |
| 3 | `JR imm8` | `0x18` | 07 |
| 4–7 | `JR cc, imm8` | `0x20`, `0x28`, `0x30`, `0x38` | 07 |

## `JR`

Block 0, `z === 0`. The operand is one signed byte, read with `fetch8`.

| Instruction | `y` | Opcode | When |
| --- | --- | --- | --- |
| `JR imm8` | 3 | `0x18` | always |
| `JR NZ, imm8` | 4 | `0x20` | `cc` 0 |
| `JR Z, imm8` | 5 | `0x28` | `cc` 1 |
| `JR NC, imm8` | 6 | `0x30` | `cc` 2 |
| `JR C, imm8` | 7 | `0x38` | `cc` 3 |

`0x18` is always taken and takes 12 T-cycles. Each conditional `JR` still reads the offset. Taken is 12. Not taken is 8.

The byte is signed the same way lesson 06 signs `ADD SP, imm8`: `0x00`–`0x7F` are positive, `0x80`–`0xFF` mean `imm8 - 256`. Add that offset to `PC` after the fetch, and wrap at 16 bits. The fetch has already moved `PC` past the operand, so the offset is relative to the next instruction.

The lesson test runs `0x18 0x02` at `0x0100`. The fetch leaves `PC` at `0x0102`, the offset is `+2`, and `PC` finishes at `0x0104`. `JR NZ` (`0x20`) with `Z` clear and the same offset also lands on `0x0104`.

## `JP`

`JP imm16` is the single opcode `0xC3`. `fetch16` reads a little-endian absolute address and `PC` becomes that address. 16 T-cycles.

The lesson test runs `0xC3 0x00 0x02`. `PC` becomes `0x0200`.

Conditional `JP` is `x === 3 && z === 2 && y <= 3`. Always `fetch16`. Taken is 16 T-cycles. Not taken is 12, and `PC` stays just past the operand. The higher `y` values of `z === 2` are `LD (C), A`, `LD (imm16), A`, `LD A, (C)`, and `LD A, (imm16)` from lesson 05.

| Instruction | Opcode |
| --- | --- |
| `JP NZ, imm16` | `0xC2` |
| `JP Z, imm16` | `0xCA` |
| `JP NC, imm16` | `0xD2` |
| `JP C, imm16` | `0xDA` |

The lesson test runs each of these to `0x0200`. Taken returns 16 and sets `PC` to `0x0200`. Not taken returns 12 and leaves `PC` at `0x0103`, the byte after the operand. `F` and `SP` stay as they were.

`JP HL` is the single opcode `0xE9`. `PC` becomes `HL`. 4 T-cycles. It does not read the byte at `HL`, and `HL` stays as it was. `0xE9` shares `z === 1` with `POP` from lesson 05 (`q === 0`). `JP HL` is `q === 1` and `p === 2`. The same `q === 1` column also holds `RET` (`0xC9`), `RETI` (`0xD9`, lesson 09), and `LD SP, HL` (`0xF9`, lesson 05).

`0xC3` is `z === 3` and `y === 0`. The other `z === 3` opcodes in block 3 are `0xCB` (lesson 08), `DI` (`0xF3`), and `EI` (`0xFB`) (lesson 09), plus the illegal opcodes. Only `y === 0` of that column is `JP`.

## `CALL` and `RET`

`CALL imm16` is the single opcode `0xCD`. `fetch16` runs first, so the word pushed is the address of the instruction after the call. `push16` writes that address, then `PC` becomes the target. 24 T-cycles.

`0xCD` shares `z === 5` with `PUSH` from lesson 05. `PUSH` is `q === 0`. This encoding is `q === 1` and `p === 0`. The other `q === 1` values of `z === 5` are illegal opcodes.

Conditional `CALL` is `x === 3 && z === 4 && y <= 3`. Always `fetch16`. Taken is 24 T-cycles and pushes. Not taken is 12 and does not push.

| Instruction | Opcode |
| --- | --- |
| `CALL NZ, imm16` | `0xC4` |
| `CALL Z, imm16` | `0xCC` |
| `CALL NC, imm16` | `0xD4` |
| `CALL C, imm16` | `0xDC` |

`RET` is the single opcode `0xC9`. `PC` becomes `pop16()`. 16 T-cycles.

Conditional `RET` is `x === 3 && z === 0 && y <= 3`. Taken is 20 T-cycles and pops. Not taken is 8 and does not pop. The other `z === 0` rows in block 3 stay what lessons 05 and 06 assigned them: `LDH (imm8), A` (`0xE0`), `ADD SP, imm8` (`0xE8`), `LDH A, (imm8)` (`0xF0`), and `LD HL, SP+imm8` (`0xF8`).

| Instruction | Opcode |
| --- | --- |
| `RET NZ` | `0xC0` |
| `RET Z` | `0xC8` |
| `RET NC` | `0xD0` |
| `RET C` | `0xD8` |

The lesson test places `CALL 0x0150` (`0xCD 0x50 0x01`) at `0x0100` and `RET` (`0xC9`) at `0x0150`. The call pushes `0x0103`. After the return, `PC` is `0x0103`.

## `RST`

Block 3, `z === 7`. `y` picks the vector. Push `PC` (it already points at the next instruction), then set `PC` to `y * 8`. 16 T-cycles.

| `y` | Opcode | Vector |
| --- | --- | --- |
| 0 | `0xC7` | `0x0000` |
| 1 | `0xCF` | `0x0008` |
| 2 | `0xD7` | `0x0010` |
| 3 | `0xDF` | `0x0018` |
| 4 | `0xE7` | `0x0020` |
| 5 | `0xEF` | `0x0028` |
| 6 | `0xF7` | `0x0030` |
| 7 | `0xFF` | `0x0038` |

The lesson test runs each of these with `SP = 0xFFFE`. The opcode is one byte at `0x0100`, so the pushed return address is `0x0101`: low byte at `0xFFFC`, high byte at `0xFFFD`, and `SP` becomes `0xFFFC`. `PC` becomes `y * 8`. The step returns 16. `F` stays as it was.

## `HALT`

`0x76` sits in block 1, where `LD r8, r8` lives. `y === 6` and `z === 6` would be `LD (HL), (HL)`. That encoding is `HALT`. Lesson 05 left it unimplemented.

Set `halt` and return 4 T-cycles. `PC` has already advanced past `0x76`. At the top of `step()`, before `fetch8`, a set `halt` returns 4 and does not fetch. Lesson 09 clears `halt` when an interrupt runs.

The lesson test places `0x76 0x00` at `0x0100`. The first `step()` returns 4, sets `halt`, and leaves `PC` at `0x0101`. The second `step()` returns 4 again and leaves `PC` at `0x0101`, so the following `NOP` is not fetched. `F` and `SP` stay as they were.

Pan Docs describes a HALT bug: with `IME` clear and an interrupt pending, the next opcode is read twice. Leave that bug for later. This lesson only sets the flag.

## Flags

`STOP`, `JR`, `JP`, `CALL`, `RET`, `RST`, and `HALT` leave `F` alone. `A`, `BC`, `DE`, and `HL` stay as they were. `CALL`, `RST`, and a taken `RET` are the ones that change `SP`.

## Files to edit

- `src/cpu/cpu.ts`

Compare with `solutions/07-control-flow/` or `solutions/complete/cpu/cpu.ts`.
