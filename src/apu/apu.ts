import type { u8, u16 } from '../types.js';

/** Lessons 20–22 */
export class Apu {
  readonly sampleRate = 44100;
  leftBuffer: number[] = [];
  rightBuffer: number[] = [];

  read(_addr: u16): u8 {
    throw new Error('TODO: lesson-20');
  }

  write(_addr: u16, _value: u8): void {
    throw new Error('TODO: lesson-20');
  }

  step(_cycles: number): void {
    throw new Error('TODO: lesson-20');
  }

  mixSample(): { left: number; right: number } {
    throw new Error('TODO: lesson-20');
  }

  drainSamples(): { left: Float32Array; right: Float32Array } {
    throw new Error('TODO: lesson-23');
  }
}
