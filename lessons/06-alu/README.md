# Lesson 06: ALU & flags

Arithmetic and logic write `A` and the flags in `F`. `INC` and `DEC` update one register, and a few 16-bit adds write `HL` or `SP`. The fields are the ones from lesson 05: `x`, `y`, `z`, `p`, and `q`. One helper per operation covers the register form and the immediate form, because both forms share a flag rule.

Pan Docs draws these rows in the same four blocks: [CPU Instruction Set](https://gbdev.io/pandocs/CPU_Instruction_Set.html). Lesson 05 filled the load and stack rows. This lesson fills the arithmetic rows, including `LD HL, SP+imm8` (`0xF8`), which lesson 05 left unimplemented because it writes flags.

`JR`, calls, returns, `RST`, `HALT`, and `STOP` (`0x10`) are lesson 07. Opcode `0xCB` is lesson 08.

## Flags

`F` keeps `Z N H C` in bits 7–4. Lesson 01 defines the bits and `setFlags`.

| Flag | Bit | On an add | On a subtract |
| --- | --- | --- | --- |
| `Z` | 7 | Result is 0 | Result is 0 |
| `N` | 6 | Clear | Set |
| `H` | 5 | Carry out of bit 3 | Borrow from bit 4 |
| `C` | 4 | Carry out of bit 7 | Borrow |

`H` is the half-carry. It watches the low nibble. On an add it is set when `(a & 0x0F) + (b & 0x0F) + carryIn` exceeds `0x0F`. On a subtract it is set when `(a & 0x0F) - (b & 0x0F) - carryIn` goes below 0. `C` is that test on the whole byte: the sum exceeds `0xFF`, or the difference goes below 0.

`carryIn` is 0 for `ADD`, `SUB`, and `CP`. For `ADC` and `SBC` it is 1 when `C` was already set, and 0 otherwise. Read the old `C` before writing the flags.

`setFlags` writes all four flags. `INC r8`, `DEC r8`, `ADD HL, r16`, `CPL`, `SCF`, and `CCF` keep at least one flag, so those update the others through the `z`, `n`, `hFlag`, and `cy` setters.

Timings below are T-cycles, four times the M-cycle counts on Pan Docs.

## Block 2: `ALU A, r8`

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | operation | | | operand `r8` | | |

`x === 2`. `y` picks the operation. `z` picks the operand, using the `r8` table from lesson 05. Index 6 is the byte at `(HL)`.

| `y` | Operation | Register opcode | Immediate opcode |
| --- | --- | --- | --- |
| 0 | `ADD A` | `0x80`–`0x87` | `0xC6` |
| 1 | `ADC A` | `0x88`–`0x8F` | `0xCE` |
| 2 | `SUB A` | `0x90`–`0x97` | `0xD6` |
| 3 | `SBC A` | `0x98`–`0x9F` | `0xDE` |
| 4 | `AND A` | `0xA0`–`0xA7` | `0xE6` |
| 5 | `XOR A` | `0xA8`–`0xAF` | `0xEE` |
| 6 | `OR A` | `0xB0`–`0xB7` | `0xF6` |
| 7 | `CP A` | `0xB8`–`0xBF` | `0xFE` |

`ADD A, B` is `0x80`: operation 0, operand 0 (`B`). `ADD A, (HL)` is `0x86`. `ADD A, A` is `0x87`.

A register operand takes 4 T-cycles. `(HL)` takes 8, because the operand reads memory. The result is written to `A`. `CP` writes flags and leaves `A` as it was.

## Block 3: `ALU A, imm8`

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | operation | | | 1 | 1 | 0 |

`x === 3 && z === 6`. `y` is the same operation column as block 2. The operand is the next program byte, read with `fetch8`. Every one of these takes 8 T-cycles.

`ADD A, imm8` is `0xC6`. `AND A, imm8` is `0xE6`. The lesson test runs both.

The other `z` values in block 3 stay what lesson 05 and lesson 07 assign them: `POP`/`PUSH`, the remaining loads, and control flow.

## Flag rules for the eight operations

| Operation | `Z` | `N` | `H` | `C` | `A` |
| --- | --- | --- | --- | --- | --- |
| `ADD`, `ADC` | Result is 0 | 0 | Carry from bit 3 | Carry from bit 7 | Written |
| `SUB`, `SBC` | Result is 0 | 1 | Borrow from bit 4 | Borrow | Written |
| `CP` | Result is 0 | 1 | Borrow from bit 4 | Borrow | Unchanged |
| `AND` | Result is 0 | 0 | 1 | 0 | Written |
| `XOR`, `OR` | Result is 0 | 0 | 0 | 0 | Written |

`CP` sets flags from the subtraction and leaves `A` as it was. `AND` always sets `H`. `XOR` and `OR` clear `H` and `C`.

`LD A, 0xFF` then `ADD A, 1` (`0xC6 0x01`) sums to `0x100`. `A` becomes `0x00`, `Z` is set, `H` is set (`0xF + 1`), and `C` is set. The lesson test checks `A`, `Z`, and `C`.

`LD A, 0xF0` then `AND 0x0F` (`0xE6 0x0F`) leaves `A = 0x00` with `Z` set, `N` clear, `H` set, and `C` clear. The test checks `Z`.

## `INC r8` and `DEC r8`

| Instruction | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `INC r8` | 0 | 0 | register `r8` | | | 1 | 0 | 0 |
| `DEC r8` | 0 | 0 | register `r8` | | | 1 | 0 | 1 |

Block 0. `INC` is `z === 4`. `DEC` is `z === 5`. `y` is the `r8` register, and index 6 is `(HL)`.

A register takes 4 T-cycles. `(HL)` takes 12: read the byte, modify it, write it back. `INC (HL)` is `0x34`. `DEC (HL)` is `0x35`.

| | `Z` | `N` | `H` | `C` |
| --- | --- | --- | --- | --- |
| `INC r8` | Result is 0 | 0 | Low nibble was `0xF` | Unchanged |
| `DEC r8` | Result is 0 | 1 | Low nibble was `0` | Unchanged |

`INC B` is `0x04`. `INC C` is `0x0C`. The lesson test does `LD C, 0x0F` then `INC C` with `C` already set. `C` becomes `0x10`, `H` is set because the low nibble was `0xF`, and the carry flag stays set. `DEC` of `0x10` becomes `0x0F` and sets `H`, because the low nibble was `0`.

## 16-bit arithmetic

These share block 0 with the loads from lesson 05. `q` tells them apart. Pair 3 is `SP`, the `r16` column, the same pairing `LD r16, imm16` uses.

| Instruction | Bits 7–0 | `q`, `z` | Opcode for `BC` | T-cycles |
| --- | --- | --- | --- | --- |
| `LD r16, imm16` | `00 pp 0 001` | `q === 0`, `z === 1` | `0x01` | 12 |
| `ADD HL, r16` | `00 pp 1 001` | `q === 1`, `z === 1` | `0x09` | 8 |
| `INC r16` | `00 pp 0 011` | `q === 0`, `z === 3` | `0x03` | 8 |
| `DEC r16` | `00 pp 1 011` | `q === 1`, `z === 3` | `0x0B` | 8 |

`LD r16, imm16` is already implemented. `ADD HL, r16` adds that pair into `HL`. `0x09`, `0x19`, `0x29`, and `0x39` are `BC`, `DE`, `HL`, and `SP`.

`ADD HL, r16` leaves `Z` as it was and clears `N`. `H` is the carry out of bit 11: `(HL & 0x0FFF) + (value & 0x0FFF) > 0x0FFF`. `C` is the carry out of bit 15: the sum exceeds `0xFFFF`. The stored result is the low 16 bits.

`INC r16` and `DEC r16` wrap at 16 bits and leave `F` alone. `INC SP` is `0x33`. `DEC SP` is `0x3B`.

## `ADD SP, imm8` and `LD HL, SP+imm8`

| Instruction | Opcode | T-cycles | Writes |
| --- | --- | --- | --- |
| `ADD SP, imm8` | `0xE8` | 16 | `SP` |
| `LD HL, SP+imm8` | `0xF8` | 12 | `HL` |

Both read one byte through `PC` and add it to `SP`. The byte is a signed offset in the 16-bit result: `0x00`–`0x7F` are positive, `0x80`–`0xFF` mean `imm8 - 256`. `LD HL, SP+imm8` stores that sum in `HL` and leaves `SP` as it was.

The flags see the original unsigned byte added to the low byte of `SP`. `Z` and `N` are cleared. `H` is set when `(SP & 0x0F) + (imm8 & 0x0F)` exceeds `0x0F`. `C` is set when `(SP & 0xFF) + imm8` exceeds `0xFF`.

`SP = 0x000F` and `imm8 = 0x01` produce `0x0010`. `H` is set (`0xF + 1`) and `C` is clear (`0x0F + 0x01` still fits in a byte). The same `imm8` of `0xFF` on `SP = 0x0000` is an offset of `-1`, so the address result is `0xFFFF`, while the flag add is `0x00 + 0xFF`, which sets neither `H` nor `C`.

## Block 0, `z === 7`

| 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | which | | | 1 | 1 | 1 |

`y` picks a one-byte flag operation. Each takes 4 T-cycles.

| `y` | Instruction | Opcode | Effect |
| --- | --- | --- | --- |
| 0 | `RLCA` | `0x07` | Rotate `A` left. Bit 7 lands in bit 0 and in `C` |
| 1 | `RRCA` | `0x0F` | Rotate `A` right. Bit 0 lands in bit 7 and in `C` |
| 2 | `RLA` | `0x17` | Shift `A` left. Bit 7 lands in `C`, and the old `C` lands in bit 0 |
| 3 | `RRA` | `0x1F` | Shift `A` right. Bit 0 lands in `C`, and the old `C` lands in bit 7 |
| 4 | `DAA` | `0x27` | Decimal adjust, below |
| 5 | `CPL` | `0x2F` | `A` becomes `A xor 0xFF` |
| 6 | `SCF` | `0x37` | Set carry |
| 7 | `CCF` | `0x3F` | Flip carry |

`RLCA`, `RRCA`, `RLA`, and `RRA` clear `Z`, `N`, and `H`. `C` is the bit that rotated out. `Z` is cleared even when the result byte is 0: `RLCA` of `0x00` leaves `A = 0x00` and `Z` clear. Lesson 08's `CB` rotates set `Z` from the result byte.

`CPL` sets `N` and `H` and leaves `Z` and `C` as they were. `A = 0x3C` becomes `0xC3`.

`SCF` clears `N` and `H`, sets `C`, and leaves `Z`. `CCF` clears `N` and `H`, flips `C`, and leaves `Z`.

## `DAA`

`DAA` (`0x27`) turns the binary result of the previous add or subtract into binary-coded decimal. It looks at `A` together with `N`, `H`, and `C`. `N` says whether that previous operation was a subtract. `DAA` itself takes 4 T-cycles and leaves `N` as it was.

When `N` is clear, build an adjustment and add it to `A`:

- Include `0x06` when `H` is set or the low nibble of `A` is above 9.
- Include `0x60` when `C` is set or `A` is above `0x99`. That case also sets `C`. Otherwise `C` clears.

Read `A` for the `> 0x99` test before adding `0x06`. With `A = 0x95`, `H` set, and `C` clear, the adjustment is only `0x06`, so `A` becomes `0x9B` and `C` stays clear. Adding `0x06` first and then testing `A > 0x99` would also add `0x60`.

When `N` is set, subtract the same adjustment: `0x06` when `H` is set, `0x60` when `C` is set. `C` keeps the value it had before `DAA`.

Then clear `H`, and set `Z` when the adjusted `A` is 0.

`A = 0x45` plus `0x38` is the binary sum `0x7D`, with `H` clear (`5 + 8` fits in a nibble) and `C` clear. The low nibble `0xD` is above 9, so `DAA` adds `0x06` and `A` becomes `0x83`, which is the decimal sum 45 + 38.

## Files to edit

- `src/cpu/cpu.ts`

Compare with `solutions/06-alu/` or `solutions/complete/cpu/cpu.ts`.
