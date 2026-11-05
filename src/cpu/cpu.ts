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
  ) { }

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

    console.log(`x: ${x}, q: ${q}, z: ${z}, p: ${p}, op: ${op.toString(16)}`);

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
      } else if (op === 0x36) {
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

      if (op === 0x08) { // LD (a16), SP
        const addr = this.fetch16();
        this.write8(addr, this.regs.sp & 0xff);
        this.write8(addr + 1, this.regs.sp >> 8);
        return 20;
      }

      if (z === 1) {
        if (q === 0) {
          const v = this.fetch16();
          this.setR16(p, v, false);
          return 12;
        } else if (q === 1) {
          this.addHl(this.getR16(p, false));
          return 8;
        }
      }

      if (z === 3) {
        if (q === 0) {
          this.setR16(p, this.inc16(this.getR16(p, false)), false);
        } else if (q === 1) {
          this.setR16(p, this.dec16(this.getR16(p, false)), false);
        }
        return 8;
      }

      if (z === 4) {
        this.setR(y, this.inc8(this.getR(y)));
        return y === 6 ? 12 : 4;
      }
      if (z === 5) {
        this.setR(y, this.dec8(this.getR(y)));
        return y === 6 ? 12 : 4;
      }

      if (z === 7) {
        if (y === 0) { // RLCA
          const a = this.regs.a;
          const rlcaCarry = (a >> 7) & 1;
          this.regs.a = ((a << 1) | rlcaCarry) & 0xff;
          this.regs.setFlags(false, false, false, rlcaCarry === 1);
          return 4;
        }
        if (y === 1) {
          const a = this.regs.a;
          const rrcaCarry = a & 1;
          this.regs.a = ((a >> 1) | (rrcaCarry << 7)) & 0xff;
          this.regs.setFlags(false, false, false, rrcaCarry === 1);
          return 4;
        }
        if (y === 2) { // RLA
          const a = this.regs.a;
          const rlaCarry = (a >> 7) & 1;
          this.regs.a = ((a << 1) | (this.regs.cy ? 1 : 0)) & 0xff;
          this.regs.setFlags(false, false, false, rlaCarry === 1);
          return 4;
        }
        if (y === 3) { // RRA
          const a = this.regs.a;
          const rraCarry = a & 1;
          this.regs.a = ((a >> 1) | (this.regs.cy ? 0x80 : 0)) & 0xff;
          this.regs.setFlags(false, false, false, rraCarry === 1);
          return 4;
        }
        if (y === 4) { // DAA
          let adjust = 0;
          let c = false;
          let a = this.regs.a;
          if (this.regs.n) {
            if (this.regs.hFlag) adjust |= 0x06;
            if (this.regs.cy) adjust |= 0x60;
            a = (a - adjust) & 0xff;
            c = this.regs.cy;
          } else {
            if (this.regs.hFlag || (a & 0x0f) > 0x09) adjust |= 0x06;
            if (this.regs.cy || this.regs.a > 0x99) {
              adjust |= 0x60;
              c = true;
            }
            a = (a + adjust) & 0xff;
          }
          this.regs.a = a;
          this.regs.z = a === 0;
          this.regs.hFlag = false;
          this.regs.cy = c;
          return 4;
        }
        if (y === 5) { // CPL
          this.regs.a = ~this.regs.a & 0xff;
          this.regs.n = true;
          this.regs.hFlag = true;
          return 4;
        }
        if (y === 6) { // SCF
          this.regs.cy = true;
          this.regs.n = false;
          this.regs.hFlag = false;
          return 4;
        }
        if (y === 7) { // CCF
          this.regs.cy = !this.regs.cy;
          this.regs.n = false;
          this.regs.hFlag = false;
          return 4;
        }
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

    if (x === 2) {
      const v = this.getR(z);
      switch (y) {
        case 0: //ADD A, r8
          this.regs.a = this.add8(this.regs.a, v, false);
          break;
        case 1: //ADC A, r8
          this.regs.a = this.add8(this.regs.a, v, true);
          break;
        case 2: //SUB A, r8
          this.regs.a = this.sub8(this.regs.a, v, false);
          break;
        case 3: //SBC A, r8
          this.regs.a = this.sub8(this.regs.a, v, true);
          break;
        case 4: //AND A, r8
          this.regs.a = this.and8(this.regs.a, v);
          break;
        case 5: //XOR A, r8
          this.regs.a = this.xor8(this.regs.a, v);
          break;
        case 6: //OR A, r8
          this.regs.a = this.or8(this.regs.a, v);
          break;
        case 7: //CP A, r8
          this.cp8(this.regs.a, v);
          break;
        default:
          break;
      }
      return z === 6 ? 8 : 4;
    }

    if (x === 3) {
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
      if (op === 0xe8) { // ADD SP, imm8
        const e = this.fetch8();
        const off = e < 0x80 ? e : e - 0x100;
        const sp = this.regs.sp;
        const r = (sp + off) & 0xffff;
        this.regs.setFlags(
          false,
          false,
          ((sp & 0xf) + (off & 0xf)) > 0xf,
          ((sp & 0xff) + (off & 0xff)) > 0xff,
        );
        this.regs.sp = r;
        return 16;
      }
      if (op === 0xEA) { // LD (a16), A
        this.write8(this.fetch16(), this.regs.a);
        return 16;
      }
      if (op === 0xf2) { // LD A, (C)
        this.regs.a = this.read8(0xff00 | this.regs.c);
        return 8;
      }
      if (op === 0xF8) { // LD HL, SP+e8
        const e = this.fetch8();
        const off = e < 0x80 ? e : e - 0x100;
        const sp = this.regs.sp;
        const r = (sp + off) & 0xffff;
        this.regs.setFlags(
          false,
          false,
          ((sp & 0xf) + (off & 0xf)) > 0xf,
          ((sp & 0xff) + (off & 0xff)) > 0xff,
        );
        this.regs.hl = r;
        return 12;
      }
      if (op === 0xF9) { // LD SP, HL
        this.regs.sp = this.regs.hl;
        return 8;
      }
      if (op === 0xFA) {
        this.regs.a = this.read8(this.fetch16());
        return 16;
      }

      if (z === 6) {
        const v = this.fetch8();
        switch (y) {
          case 0: // ADD A, imm8
            this.regs.a = this.add8(this.regs.a, v, false);
            break;
          case 1: // ADC A, imm8
            this.regs.a = this.add8(this.regs.a, v, true);
            break;
          case 2: // SUB A, imm8
            this.regs.a = this.sub8(this.regs.a, v, false);
            break;
          case 3: // SBC A, imm8
            this.regs.a = this.sub8(this.regs.a, v, true);
            break;
          case 4: // AND A, imm8
            this.regs.a = this.and8(this.regs.a, v);
            break;
          case 5: // XOR A, imm8
            this.regs.a = this.xor8(this.regs.a, v);
            break;
          case 6:
            this.regs.a = this.or8(this.regs.a, v);
            break;
          case 7: // CP A, imm8
            this.cp8(this.regs.a, v);
            break;
          default:
            throw new Error(`Invalid opcode: ${op.toString(16)} x: ${x}, y: ${y}, z: ${z}`);
        }
        return 8;
      }
    }

    throw new Error(`Unknown opcode: ${op.toString(16)}`);
  }

  private getR(i: number): u8 {
    switch (i) {
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
    switch (i) {
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
    switch (i) {
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
    switch (i) {
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

  private add8(a: u8, b: u8, carry: boolean): u8 {
    const c = carry && this.regs.cy ? 1 : 0;
    const sum = a + b + c;
    const result = sum & 0xff;
    const halfCarry = ((a & 0xf) + (b & 0xf) + c) > 0xf;
    this.regs.setFlags(result === 0, false, halfCarry, sum > 0xff);
    return result & 0xff;
  }

  private sub8(a: u8, b: u8, carry: boolean): u8 {
    const c = carry && this.regs.cy ? 1 : 0;
    const subResult = a - b - c;
    const result = subResult & 0xff;
    const halfCarry = ((a & 0xf) - (b & 0xf) - c) < 0;
    this.regs.setFlags(result === 0, true, halfCarry, subResult < 0);
    return result & 0xff;
  }

  private and8(a: u8, b: u8): u8 {
    const result = a & b;
    this.regs.setFlags(result === 0, false, true, false);
    return result & 0xff;
  }

  private xor8(a: u8, b: u8): u8 {
    const result = a ^ b;
    this.regs.setFlags(result === 0, false, false, false);
    return result & 0xff;
  }

  private or8(a: u8, b: u8): u8 {
    const result = a | b;
    this.regs.setFlags(result === 0, false, false, false);
    return result & 0xff;
  }

  private cp8(a: u8, b: u8): void {
    this.sub8(a, b, false);
  }

  private inc8(a: u8): u8 {
    const result = (a + 1) & 0xff;
    this.regs.z = result === 0;
    this.regs.n = false;
    this.regs.hFlag = (a & 0xf) === 0xf;
    return result;
  }

  private dec8(a: u8): u8 {
    const dec = (a - 1) & 0xff;
    this.regs.z = dec === 0;
    this.regs.n = true;
    this.regs.hFlag = (a & 0xf) === 0;
    return dec;
  }

  private inc16(a: u16): u16 {
    return (a + 1) & 0xffff;
  }

  private dec16(a: u16): u16 {
    return (a - 1) & 0xffff;
  }

  private addHl(v: u16): void {
    const sum = this.regs.hl + v;
    this.regs.n = false;
    this.regs.hFlag = ((this.regs.hl & 0xfff) + (v & 0xfff)) > 0xfff;
    this.regs.cy = sum > 0xffff;
    this.regs.hl = sum & 0xffff;
  }

  private rlc(v: u8): u8 {
    const c = (v >> 7) & 1;
    const r = (v << 1 | c) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rrc(v: u8): u8 {
    const c = v & 1;
    const r = (v >> 1 | c << 7) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rl(v: u8): u8 {
    const c = (v >> 7) & 1;
    const r = (v << 1 | (this.regs.cy ? 0x80 : 0)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rr(v: u8): u8 {
    const c = v & 1;
    const r = ((v >> 1) | (this.regs.cy ? 0x80 : 0)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }
}

export { FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from './registers.js';
