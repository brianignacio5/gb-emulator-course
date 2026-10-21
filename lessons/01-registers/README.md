# Lesson 01: Registers & flags

The SM83 CPU exposes eight 8-bit registers that pair into 16-bit views: `AF`, `BC`, `DE`, `HL`, plus `SP` and `PC`.

Pan Docs: https://gbdev.io/pandocs/CPU_Registers_and_Flags.html

## Flags in F

Only the high nibble is used: `Z N H C` = bits `7 6 5 4`. The low nibble must always read as `0`.

```ts
// A=0x12, F=0xB0 → AF=0x12B0
r.a = 0x12;
r.f = 0xb0;
console.log(r.af.toString(16)); // 12b0
```

## DMG post-boot state

DMG (Dot Matrix Game) is the original Game Boy. On power-on, a 256-byte boot ROM at `0x0000` scrolls the Nintendo logo, checks the cartridge header, then unmaps itself and jumps to the game. This course skips that ROM. `resetPostBoot()` installs the register state the DMG boot ROM leaves behind:

| Register | Value | Meaning |
| --- | --- | --- |
| `AF` | `0x01B0` | `A = 0x01` marks a DMG. `F = 0xB0` is Z, H, and C set, N clear |
| `BC` | `0x0013` | leftover from the boot ROM |
| `DE` | `0x00D8` | leftover from the boot ROM |
| `HL` | `0x014D` | leftover from the boot ROM |
| `SP` | `0xFFFE` | initial stack, just below IE at `0xFFFF` |
| `PC` | `0x0100` | cartridge entry point |

`PC` and `SP` decide where execution and the stack start. `A = 0x01` is how software tells this is a DMG (a Game Boy Color boot leaves `A = 0x11`). `BC`, `DE`, and `HL` have no separate job; some games still read them.

Pan Docs: https://gbdev.io/pandocs/Power_Up_Sequence.html

## Files to edit

- `src/cpu/registers.ts`

Compare with `solutions/01-registers/` or `solutions/complete/cpu/registers.ts`.
