import type { Memory, u8, u16 } from '../types.js';
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

  private fetch16(): u16 {
    const lo = this.fetch8();
    const hi = this.fetch8();
    return (hi << 8) | lo;
  }
  
  private pop16(): u16 {
    const lo = this.read8(this.regs.sp);
    this.regs.sp = (this.regs.sp + 1) & 0xffff;
    const hi = this.read8(this.regs.sp);
    this.regs.sp = (this.regs.sp + 1) & 0xffff;
    return (hi << 8) | lo;
  }

  private push16(value: u16) {
    this.regs.sp = (this.regs.sp - 1) & 0xffff;
    this.write8(this.regs.sp, (value >> 8) & 0xff);
    this.regs.sp = (this.regs.sp - 1) & 0xffff;
    this.write8(this.regs.sp, value & 0xff);
  }

  private execute(op: u8): number {

    if (op === 0x00) {
      return this.nop();
    }

    // op is 8 bits, 2 bit
    const x = (op >> 6) & 3; // OP group bits
    const y = (op >> 3) & 7; // Destination bits
    const z = op & 7; // Source bits
    const p = (y >> 1) & 3; // Register Pairs (BC, DE, HL, SP) or AF for push pop
    const q = y & 1; // Which of two pair instructions sharing z

    if (x === 0) {

      if (op === 0x02) { // LD (BC), A
        this.write8(this.regs.bc, this.regs.a);
        return 8;
      } else if (op === 0x12) { // LD (DE), A
        this.write8(this.regs.de, this.regs.a);
        return 8;
      } else if (op === 0x22) { // LD (HL+), A
        this.write8(this.regs.hl, this.regs.a);
        this.regs.hl = (this.regs.hl + 1) & 0xffff;
        return 8;
      } else if (op === 0x32) { // LD (HL-), A
        this.write8(this.regs.hl, this.regs.a);
        this.regs.hl = (this.regs.hl - 1) & 0xffff;
        return 8;
      } else if (op === 0x06) { // LD B, d8
        this.regs.b = this.fetch8();
        return 8;
      } else if (op === 0x16) { // LD D, d8
        this.regs.d = this.fetch8();
        return 8;
      } else if (op === 0x26) { // LD H, d8
        this.regs.h = this.fetch8();
        return 8;
      } else if ( op === 0x36) {
        this.write8(this.regs.hl, this.fetch8());
        return 12;
      } else if (op === 0x0A) { // LD A, (BC)
        this.regs.a = this.read8(this.regs.bc);
        return 8;
      } else if (op === 0x1A) { // LD A, (DE)
        this.regs.a = this.read8(this.regs.de);
        return 8;
      }
      else if (op === 0x2A) { // LD A, (HL+)
        this.regs.a = this.read8(this.regs.hl);
        this.regs.hl = (this.regs.hl + 1) & 0xffff;
        return 8;
      } else if (op === 0x3A) { // LD A, (HL-)
        this.regs.a = this.read8(this.regs.hl);
        this.regs.hl = (this.regs.hl - 1) & 0xffff;
        return 8;
      } else if (op === 0x0E) { // LD C, d8
        this.regs.c = this.fetch8();
        return 8;
      } else if (op === 0x1E) { // LD E, d8
        this.regs.e = this.fetch8();
        return 8;
      } else if (op === 0x2E) { // LD L, d8
        this.regs.l = this.fetch8();
        return 8;
      } else if (op === 0x3E) { // LD A, d8
        this.regs.a = this.fetch8();
        return 8;
      }
    }

    if (x === 1) {
      if (op === 0x76) {
        // HALT
        return 4;
      } else {
        // LD r8, r8 0 1 dest(r8), src(r8)
        this.setR(y, this.getR(z));
        return y === 6 || z === 6 ? 8 : 4;
      }
    }

    if (x === 3) {
      console.log(`x: ${x}, q: ${q}, z: ${z}, p: ${p}, op: ${op.toString(16)}`);
      if (q === 0 && z === 1) {
        this.setR16(p, this.pop16(), true);
        return 12;
      }
      if (q === 0 && z === 5) {
        if (op === 0xc5 || op === 0xd5 || op === 0xe5 || op === 0xf5) {
          this.push16(this.getR16(p, true));
          return 16;
        }
      }
      if (op === 0xe0) { // LD (a16), A
        this.write8(0xff00 | this.fetch8(), this.regs.a);
        return 12;
      }
      if (op === 0xf0) { // LD A, (a16)
        this.regs.a = this.read8(0xff00 | this.fetch8());
        return 12;
      }
      if (op === 0xe2) { // LD (C), A
        this.write8(0xff00 | this.regs.c, this.regs.a);
        return 8;
      }
      if (op === 0xf2) { // LD A, (C)
        this.regs.a = this.read8(0xff00 | this.regs.c);
        return 8;
      }
      if (op === 0xEA) { // LD (a16), A
        this.write8(this.fetch16(), this.regs.a);
        return 16;
      }
      if (op === 0xFA) {
        this.regs.a = this.read8(this.fetch16());
        return 16;
      }
    }

    throw new Error(`Unknown opcode: ${op.toString(16)}`);
  }

  private getR(i: number): u8 {
    switch(i) {
      case 0:
        return this.regs.b;
      case 1:
        return this.regs.c;
      case 2:
        return this.regs.d;
      case 3:
        return this.regs.e;
      case 4:
        return this.regs.h;
      case 5:
        return this.regs.l;
      case 6:
        return this._mem.read(this.regs.hl);
      case 7:
        return this.regs.a;
      default:
        throw new Error(`Invalid register index: ${i}`);
    }
  }

  private setR(i: number, v: u8): void {
    switch(i) {
      case 0:
        this.regs.b = v;
        break;
      case 1:
        this.regs.c = v;
        break;
      case 2:
        this.regs.d = v;
        break;
      case 3:
        this.regs.e = v;
        break;
      case 4:
        this.regs.h = v;
        break;
      case 5:
        this.regs.l = v;
        break;
      case 6:
        this.write8(this.regs.hl, v);
        break;
      case 7:
        this.regs.a = v;
        break;
      default:
        throw new Error(`Invalid register index: ${i}`);
    }
  }
  
  // Get register pair for r16
  private getR16(i: number, isStk: boolean): u16 {
    switch(i) {
      case 0:
        return this.regs.bc;
      case 1:
        return this.regs.de;
      case 2:
        return this.regs.hl;  
      case 3:
        return isStk ? this.regs.af : this.regs.sp;
      default:
        throw new Error(`Invalid register index: ${i}`);
    }
  }

  private setR16(i: number, v: u16, isStk: boolean): void {
    switch(i) {
      case 0:
        this.regs.bc = v;
        break;
      case 1:
        this.regs.de = v;
        break;
      case 2:
        this.regs.hl = v;
        break;
      case 3:
        if (isStk) {
          this.regs.af = v;
        } else {
          this.regs.sp = v;
        }
        break;
      default:
        throw new Error(`Invalid register index: ${i}`);
    }
  }

  private write8(addr: number, v: u8): void {
    this._mem.write(addr & 0xffff, v & 0xff);
  }

  private read8(addr: number): u8 {
    return this._mem.read(addr & 0xffff);
  }

  private nop(): number {
    return this.mCycles;
  }
}

export { FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from './registers.js';
