import type { Memory, u8 } from '../types.js';
import { Registers } from './registers.js';
import type { InterruptController } from '../interrupts/interrupts.js';

/** Implement opcode groups across lessons 04–09. */
export class Cpu {
  regs = new Registers();
  ime = false;
  halt = false;

  constructor(
    private _mem: Memory,
    private _interrupts?: InterruptController,
  ) {}

  resetPostBoot(): void {
    this.regs.resetPostBoot();
    this.ime = false;
    this.halt = false;
  }

  /** Returns T-cycles. Lesson 04: NOP at least. */
  step(): number {
    throw new Error('TODO: lesson-04 implement Cpu.step');
  }
}

export { FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from './registers.js';
