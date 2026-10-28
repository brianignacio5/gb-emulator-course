import type { Memory, u8 } from '../types.js';
import { Registers } from './registers.js';
import type { InterruptController } from '../interrupts/interrupts.js';

/** Implement opcode groups across lessons 04–09. */
export class Cpu {
  regs = new Registers();
  ime = false;
  halt = false;
  mCycles = 4;

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
    const op = this.fetch8();
    return this.execute(op);
  }

  private fetch8(): u8 {
    const v = this._mem.read(this.regs.pc);
    this.regs.pc = (this.regs.pc + 1) & 0xffff;
    return v;
  }

  private execute(op: u8): number {
    switch (op) {
      case 0x00:
        return this.nop();
      default:
        throw new Error(`Unknown opcode: ${op}`);
    }
  }

  private nop(): number {
    return this.mCycles;
  }
}

export { FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from './registers.js';
