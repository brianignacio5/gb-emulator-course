# Capstone solution notes — save helpers

`emulator.ts` in this snapshot wires the core system. Add save RAM helpers along these lines:

```ts
getSaveRam(): Uint8Array | null {
  const cart = this.bus.cartridge as { getSaveRam?: () => Uint8Array | null } | undefined;
  return cart?.getSaveRam?.() ?? null;
}

loadSaveRam(data: Uint8Array): void {
  const cart = this.bus.cartridge as { loadSaveRam?: (d: Uint8Array) => void } | undefined;
  cart?.loadSaveRam?.(data);
}
```

On MBC1/MBC2/MBC3, expose the internal `ram` buffer (copy out / copy in). ROM-only carts return `null`.

UI: `<a download="game.sav">` from a Blob, plus a file input that `arrayBuffer()` → `loadSaveRam`.
