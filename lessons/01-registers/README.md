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

## Files to edit

- `src/cpu/registers.ts`

Compare with `solutions/01-registers/` or `solutions/complete/cpu/registers.ts`.
