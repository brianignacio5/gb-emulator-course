# Lesson 08: CB prefix

Opcode `0xCB` is a prefix. The opcode fetch reads `0xCB`, then `fetch8` reads a second byte. That byte selects a rotate, a shift, `SWAP`, `BIT`, `SET`, or `RES`. The fields are the ones from lesson 05: `x`, `y`, and `z`. `z` is the `r8` operand. Index 6 is the byte at `(HL)`, so `getR` and `setR` already cover it.

`0xCB` sits in block 3, `z === 3`, `y === 1`. `JP imm16` (`0xC3`) is `y === 0` of that column and is already implemented. `DI` (`0xF3`, `y === 6`) and `EI` (`0xFB`, `y === 7`) are lesson 09. The other `y` values of `z === 3` are illegal opcodes.

Pan Docs draws the second byte as its own table on the same page: [CPU Instruction Set](https://gbdev.io/pandocs/CPU_Instruction_Set.html).

Timings below are T-cycles, four times the M-cycle counts on Pan Docs. Both fetches advance `PC`, so every CB instruction is two bytes.

## The second byte

```
7 6 5 4 3 2 1 0
x x y y y z z z
```

| Field | Bits | Role |
| --- | --- | --- |
| `x` | 7–6 | Which group |
| `y` | 5–3 | Which operation, or the bit number |
| `z` | 2–0 | The `r8` operand |

| `x` | Group |
| --- | --- |
| 0 | Rotates, shifts, and `SWAP`. `y` picks which one |
| 1 | `BIT y, r8` |
| 2 | `RES y, r8` |
| 3 | `SET y, r8` |

A register operand takes 8 T-cycles. `(HL)` takes 12 for `BIT`, because that instruction only reads. Every other `(HL)` form reads the byte, changes it, and writes it back, so those take 16.

## Rotates, shifts, and `SWAP`

`x === 0`. `y` picks the operation. Write the result back with `setR`.

| `y` | Instruction | Second byte for `B` | What moves |
| --- | --- | --- | --- |
| 0 | `RLC` | `0x00` | Bit 7 lands in bit 0 and in `C` |
| 1 | `RRC` | `0x08` | Bit 0 lands in bit 7 and in `C` |
| 2 | `RL` | `0x10` | Bit 7 lands in `C`, and the old `C` lands in bit 0 |
| 3 | `RR` | `0x18` | Bit 0 lands in `C`, and the old `C` lands in bit 7 |
| 4 | `SLA` | `0x20` | Shift left. Bit 0 becomes 0. Bit 7 lands in `C` |
| 5 | `SRA` | `0x28` | Shift right. Bit 7 stays. Bit 0 lands in `C` |
| 6 | `SWAP` | `0x30` | Exchange the high and low nibbles |
| 7 | `SRL` | `0x38` | Shift right. Bit 7 becomes 0. Bit 0 lands in `C` |

The table lists the second byte. The program byte before it is `0xCB`. `RLC B` is `0xCB 0x00`. `RLC A` is `0xCB 0x07`, and `RLC (HL)` is `0xCB 0x06`. The same `z` offset applies to the other rows: `SWAP A` is `0xCB 0x37` (`y === 6`, `z === 7`).

`RL` and `RR` read the old `C` before writing the flags. `RLC` and `RRC` rotate the byte through itself. `SLA` is the left shift with a 0 filling bit 0. `SRA` keeps bit 7, so the sign stays. `SRL` fills bit 7 with 0.

Those seven clear `N` and `H`. `C` is the bit that shifted out. `Z` is set when the result byte is 0, including a result of `0x00`. Lesson 06's `RLCA`, `RRCA`, `RLA`, and `RRA` clear `Z` even when the result is 0, and they only touch `A`. The CB forms set `Z` from the result and take any `r8`.

`SWAP` exchanges the nibbles: `((v & 0x0F) << 4) | (v >> 4)`. It sets `Z` when the result is 0 and clears `N`, `H`, and `C`.

The lesson test runs `RLC B` (`0xCB 0x00`) with `B = 0x80`. Bit 7 was set, so `B` becomes `0x01` and `C` is set. The result is not 0, so `Z` is clear. The test checks `B` and `C`.

It also runs `SWAP A` (`0xCB 0x37`) with `A = 0x1F`. The nibbles exchange and `A` becomes `0xF1`.

## `BIT`

`x === 1`. `y` is the bit number, 0 through 7. Read the operand and do not write it back.

`Z` is set when that bit is 0. `N` clears. `H` sets. `C` stays as it was.

`BIT 7, B` is `0xCB 0x78`: `x === 1`, `y === 7`, `z === 0`. After the `RLC B` above, `B` is `0x01`. Bit 7 of that byte is 0, so `Z` is set. The lesson test checks that flag.

## `RES` and `SET`

`RES` is `x === 2`. `SET` is `x === 3`. `y` is the bit number. `RES` clears that bit (`v & ~(1 << y)`). `SET` sets it (`v | (1 << y)`). The result is written with `setR`. Neither writes `F`.

| Instruction | Second byte | Bits |
| --- | --- | --- |
| `RES 0, A` | `0x87` | `x === 2`, `y === 0`, `z === 7` |
| `SET 0, A` | `0xC7` | `x === 3`, `y === 0`, `z === 7` |

The lesson test runs these after `SWAP A`, so `A` is `0xF1`. `SET 0, A` leaves bit 0 set. `RES 0, A` clears it. The test checks that low bit: 1 after `SET`, 0 after `RES`. The other bits stay.

## Flags

| Instruction | `Z` | `N` | `H` | `C` | Operand |
| --- | --- | --- | --- | --- | --- |
| `RLC`, `RRC`, `RL`, `RR`, `SLA`, `SRA`, `SRL` | Result is 0 | 0 | 0 | Bit shifted out | Written |
| `SWAP` | Result is 0 | 0 | 0 | 0 | Written |
| `BIT` | Tested bit is 0 | 0 | 1 | Unchanged | Unchanged |
| `RES`, `SET` | Unchanged | Unchanged | Unchanged | Unchanged | Written |

## Files to edit

- `src/cpu/cpu.ts`

Compare with `solutions/08-cb-prefix/` or `solutions/complete/cpu/cpu.ts`.
