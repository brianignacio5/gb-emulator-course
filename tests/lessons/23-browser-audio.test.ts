import { describe, expect, it } from 'vitest';
import { createAudioPump } from '@emu/ui/audio.js';
import { Apu } from '@emu/apu/apu.js';

describe('lesson 23 — browser audio helper', () => {
  it('createAudioPump returns resume and pump', () => {
    const apu = new Apu();
    // Avoid constructing AudioContext in node — only check export shape with a stub drain
    // Reference impl creates AudioContext lazily on resume/pump.
    const pump = createAudioPump(() => apu.drainSamples());
    expect(typeof pump.resume).toBe('function');
    expect(typeof pump.pump).toBe('function');
  });
});
