# Lesson 05: Loads & stack

Loads copy a byte or a word between registers and memory. `PUSH` and `POP` do that copy through the stack. The SM83 encodes each family as one bit pattern, with the register number sitting in fixed bits of the opcode. Decode those fields once and the whole family falls out. A 256-way switch hides the pattern.

Pan Docs draws the same layout as four blocks: [CPU Instruction Set](https://gbdev.io/pandocs/CPU_Instruction_Set.html). The solution names the fields `x`, `y`, `z`, `p`, and `q`.

## Opcode fields

```
7 6 5 4 3 2 1 0
x x y y y z z z
    p p q
```

| Field | Bits | Range | Role |
| --- | --- | --- | --- |
| `x` | 7–6 | 0–3 | Which block |
| `y` | 5–3 | 0–7 | Usually the `r8` destination |
| `z` | 2–0 | 0–7 | Usually the `r8` source, or which instruction shape this is inside the block |
| `p` | 5–4 | 0–3 | Register pair. This is `y` with its low bit dropped |
| `q` | 3 | 0–1 | Which of the two pair instructions share this `z` |

`p` and `q` matter when the operand is a pair (`r16`, `r16stk`, `r16mem`). An 8-bit `r8` operand uses the full 3-bit `y` or `z`.

## Placeholders

Pan Docs uses these names for the numbers packed into `y`, `z`, and `p`.

| Index | `r8` (`y` or `z`) | `r16` (`p`) | `r16stk` (`p`) | `r16mem` (`p`) |
| --- | --- | --- | --- | --- |
| 0 | `B` | `BC` | `BC` | `BC` |
| 1 | `C` | `DE` | `DE` | `DE` |
| 2 | `D` | `HL` | `HL` | `HL+` |
| 3 | `E` | `SP` | `AF` | `HL-` |
| 4 | `H` | | | |
| 5 | `L` | | | |
| 6 | `(HL)` | | | |
| 7 | `A` | | | |

`r16` pair 3 is `SP`. `r16stk` pair 3 is `AF`, which is why `PUSH`/`POP` and `LD r16,imm16` disagree on that index. `r8` index 6 is the byte at address `HL`, so that operand reads or writes memory.

`imm8` is the next byte in the program, read through `PC`. `imm16` is the next two bytes, little-endian, also through `PC`. The stack uses `SP` instead, so a pop is a different helper from `fetch16` even though both assemble a word as `(hi << 8) | lo`.

## The four blocks

Bits 7–6 select the block. This lesson uses the load and stack rows. `INC`/`DEC` and the ALU are lesson 06. Jumps, calls, and `HALT` are lesson 07.

| `x` | Block | What lives here |
| --- | --- | --- |
| 0 | `00……` | 8-bit and 16-bit loads, plus `INC`/`DEC`, `JR`, and the `A` rotates |
| 1 | `01……` | `LD r8, r8` only |
| 2 | `10……` | ALU on `A` (lesson 06) |
| 3 | `11……` | `PUSH`/`POP`, a few more loads, then control flow and ALU immediates |

## Block 1: `LD r8, r8`

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 1 | destination `r8` | | | source `r8` | | |

`x === 1`. Copy `getR(z)` into `setR(y)`.

`LD B, C` is `0x41` = `01 000 001`: destination 0 (`B`), source 1 (`C`). `LD (HL), A` is `0x77` = `01 110 111`: destination 6 (`(HL)`), source 7 (`A`). `LD A, (HL)` is `0x7E`.

Timings in this lesson are T-cycles, four times the M-cycle counts on Pan Docs. A register-to-register copy takes 4 T-cycles. Either side being `(HL)` takes 8, because that side touches memory.

`0x76` = `01 110 110` would be `LD (HL), (HL)`. That encoding is `HALT`. Leave it for lesson 07.

## Block 0 loads

`z` picks the shape. `y` or `p` picks the register.

`LD r8, imm8` is `z === 6`:

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | destination `r8` | | | 1 | 1 | 0 |

`LD B, 0x42` is `0x06` followed by the byte `0x42`. Fetch that byte with `PC`. 8 T-cycles, or 12 when the destination is `(HL)`.

`LD r16, imm16` is `q === 0 && z === 1`:

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | destination `r16` | | 0 | 0 | 0 | 1 |

`0x01`, `0x11`, `0x21`, `0x31` load `BC`, `DE`, `HL`, `SP`. The word comes from `PC` (`fetch16`). 12 T-cycles. Pair 3 here is `SP`.

`LD (r16mem), A` and `LD A, (r16mem)` share `z === 2`. `q === 0` stores `A`, `q === 1` loads `A`, and `p` selects `BC`, `DE`, `HL+`, or `HL-`:

| Instruction | Bits 7–0 | Opcode for `BC` |
| --- | --- | --- |
| `LD (r16mem), A` | `00 pp 0 010` | `0x02` |
| `LD A, (r16mem)` | `00 pp 1 010` | `0x0A` |

Each takes 8 T-cycles. `HL+` and `HL-` adjust `HL` after the memory access. `LD (HL+), A` is `0x22`. `LD A, (HL-)` is `0x3A`.

`LD (imm16), SP` is the single opcode `0x08`. It writes `SP` to the absolute address that follows and takes 20 T-cycles.

## Block 3: `PUSH` and `POP`

| Instruction | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POP r16stk` | 1 | 1 | register | | 0 | 0 | 0 | 1 |
| `PUSH r16stk` | 1 | 1 | register | | 0 | 1 | 0 | 1 |

`POP` is `q === 0 && z === 1` (12 T-cycles). `PUSH` is `q === 0 && z === 5` (16 T-cycles). Pair 3 is `AF`: `0xC1`/`0xC5` are `BC`, then `DE`, `HL`, and `AF` at `0xF1`/`0xF5`.

Those `POP` bits match `LD r16, imm16` except the block is `x === 3`. The word comes from `SP`. `PUSH` decrements `SP`, writes the high byte, decrements `SP` again, and writes the low byte. `POP` reads the low byte, increments `SP`, reads the high byte, and increments `SP` again.

In the lesson test, `PUSH BC` with `BC = 0x1234` and `SP = 0xFFFE` leaves:

```
PC → 0x0104: C1      POP BC
     0x0105: 00      following program byte

SP → 0xFFFC: 34      low byte
     0xFFFD: 12      high byte
```

`pop16` reads `0xFFFC` and returns `0x1234`. `fetch16` would read `0x0105` and return `0x0000`.

## Other loads in block 3

These are the remaining load rows. `imm8` and `imm16` still come from `PC`. `0xFF00` is the start of I/O space.

| Instruction | Opcode | T-cycles | Address |
| --- | --- | --- | --- |
| `LDH (imm8), A` | `0xE0` | 12 | `0xFF00 + imm8` |
| `LDH A, (imm8)` | `0xF0` | 12 | `0xFF00 + imm8` |
| `LD (C), A` | `0xE2` | 8 | `0xFF00 + C` |
| `LD A, (C)` | `0xF2` | 8 | `0xFF00 + C` |
| `LD (imm16), A` | `0xEA` | 16 | absolute `imm16` |
| `LD A, (imm16)` | `0xFA` | 16 | absolute `imm16` |
| `LD SP, HL` | `0xF9` | 8 | register copy |

`LD HL, SP+imm8` (`0xF8`) is in the same table and does write flags. Lesson 06 owns flag rules; this lesson can leave `0xF8` unimplemented.

## Flags

Loads, `PUSH`, and `POP` of `BC`/`DE`/`HL` leave `F` alone. `POP AF` loads `F` from the stacked low byte. The `AF` setter already forces the low nibble of `F` to 0.

## Files to edit

- `src/cpu/cpu.ts`

Compare with `solutions/05-loads-stack/` or `solutions/complete/cpu/cpu.ts`.
