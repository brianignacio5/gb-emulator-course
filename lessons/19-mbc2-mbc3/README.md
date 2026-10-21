# Lesson 19: MBC2 & MBC3

MBC2 has 512×4-bit built-in RAM. MBC3 adds ROM/RAM banking plus RTC registers (`0x08–0x0C`) — keep RTC simple for this course.

In `createCartridge`, map `0x05`–`0x06` to `Mbc2Cartridge` (`header.romBanks`) and `0x0F`–`0x13` to `Mbc3Cartridge` (`header.romBanks` and `header.ramSizeBytes`).

Pan Docs: https://gbdev.io/pandocs/MBC2.html · https://gbdev.io/pandocs/MBC3.html

## Files to edit

- `src/cartridge/mbc2.ts`
- `src/cartridge/mbc3.ts`
- `src/cartridge/index.ts`
