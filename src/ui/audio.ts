export type SampleDrain = () => { left: Float32Array; right: Float32Array };

/** Lesson 23 */
export function createAudioPump(_drain: SampleDrain): {
  resume(): void;
  pump(): void;
} {
  throw new Error('TODO: lesson-23 implement createAudioPump');
}
