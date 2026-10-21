# Lesson 18: MBC1

Bank ROM via writes to `0x2000–0x3FFF`, RAM enable at `0x0000–0x1FFF`, RAM bank / upper ROM bits at `0x4000–0x5FFF`, mode at `0x6000–0x7FFF`.

In `createCartridge`, map cart types `0x01`–`0x03` to `Mbc1Cartridge`, passing `header.romBanks` and `header.ramSizeBytes`.

Pan Docs: https://gbdev.io/pandocs/MBC1.html

## Files to edit

- `src/cartridge/mbc1.ts`
- `src/cartridge/index.ts`
