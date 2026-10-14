# Lesson 00: Project setup

Install dependencies, learn the folder layout, and run your first test.

## Commands

```bash
npm install
npm run test:lesson -- 00
npm run test:solutions   # verify reference implementation
npm run dev              # canvas UI (from lesson 17)
```

## Layout

- `src/` — stubs you implement
- `lessons/` — theory + tasks
- `tests/lessons/` — Vitest suites
- `solutions/complete/` — full reference emulator
- `solutions/NN-*/` — per-lesson snapshots
- `roms/` — your `.gb` files (gitignored)
- `fixtures/` — tiny synthetic test data (optional Blargg ROMs go in `fixtures/blargg/`, which stays gitignored)

## Files to edit

None yet — confirm the project runs.
