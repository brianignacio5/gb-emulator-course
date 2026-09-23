export type SampleDrain = () => { left: Float32Array; right: Float32Array };

/** Lesson 23 — lazy AudioContext pump; safe when AudioContext is undefined (Node). */
export function createAudioPump(drain: SampleDrain): {
  resume(): void;
  pump(): void;
} {
  let ctx: AudioContext | null = null;
  let nextTime = 0;

  function ensureContext(): AudioContext | null {
    if (typeof AudioContext === 'undefined' && typeof (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === 'undefined') {
      return null;
    }
    if (!ctx) {
      const Ctor =
        typeof AudioContext !== 'undefined'
          ? AudioContext
          : (globalThis as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor({ sampleRate: 44100 });
      nextTime = ctx.currentTime;
    }
    return ctx;
  }

  return {
    resume(): void {
      const c = ensureContext();
      void c?.resume();
    },
    pump(): void {
      const c = ensureContext();
      if (!c) return;
      const { left, right } = drain();
      if (left.length === 0) return;
      const buffer = c.createBuffer(2, left.length, c.sampleRate);
      buffer.copyToChannel(left, 0);
      buffer.copyToChannel(right.length === left.length ? right : left, 1);
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(c.destination);
      const start = Math.max(c.currentTime, nextTime);
      src.start(start);
      nextTime = start + buffer.duration;
    },
  };
}
