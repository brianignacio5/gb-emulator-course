# Task — Lesson 03

1. Implement `parseCartridgeHeader` (title, cart type, ROM/RAM sizes).
2. Implement `RomOnlyCartridge.read` for `0x0000–0x7FFF`.
3. In `createCartridge`, map cart types `0x00`, `0x08`, and `0x09` to `RomOnlyCartridge`. Fall back to ROM-only for other types until later lessons.
4. Run `npm run test:lesson -- 03`
