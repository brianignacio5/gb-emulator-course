/**
 * Browser entry: 160×144 canvas (scaled), ROM file input, rAF loop, keyboard.
 */
import { Emulator } from '../emulator.js';
import type { Button } from '../joypad/joypad.js';
import { createAudioPump } from './audio.js';

const SCALE = 4;
const COLORS = [
  [224, 248, 208],
  [136, 192, 112],
  [52, 104, 86],
  [8, 24, 32],
];

const KEY_MAP: Record<string, Button> = {
  ArrowRight: 'right',
  ArrowLeft: 'left',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyZ: 'a',
  KeyX: 'b',
  Enter: 'start',
  ShiftRight: 'select',
  KeyA: 'a',
  KeyS: 'b',
  Backspace: 'select',
};

function boot(): void {
  const canvas = document.getElementById('screen') as HTMLCanvasElement | null;
  const fileInput = document.getElementById('rom') as HTMLInputElement | null;
  if (!canvas) {
    console.error('Missing #screen canvas');
    return;
  }

  canvas.width = 160;
  canvas.height = 144;
  canvas.style.width = `${160 * SCALE}px`;
  canvas.style.height = `${144 * SCALE}px`;
  canvas.style.imageRendering = 'pixelated';

  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(160, 144);
  const emu = new Emulator();
  const audio = createAudioPump(() => emu.apu.drainSamples());
  let running = false;

  function draw(): void {
    const fb = emu.getFramebuffer();
    for (let i = 0; i < fb.length; i++) {
      const c = COLORS[fb[i]! & 3]!;
      const o = i * 4;
      image.data[o] = c[0]!;
      image.data[o + 1] = c[1]!;
      image.data[o + 2] = c[2]!;
      image.data[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }

  function frame(): void {
    if (running) {
      emu.stepFrame();
      audio.pump();
      draw();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    emu.loadRom(buf);
    audio.resume();
    running = true;
  });

  window.addEventListener('keydown', (e) => {
    const btn = KEY_MAP[e.code];
    if (!btn) return;
    e.preventDefault();
    emu.setButton(btn, true);
    audio.resume();
  });
  window.addEventListener('keyup', (e) => {
    const btn = KEY_MAP[e.code];
    if (!btn) return;
    e.preventDefault();
    emu.setButton(btn, false);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

export { boot };
