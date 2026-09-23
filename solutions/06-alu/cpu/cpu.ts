import type { u8, u16, Memory } from '../types.js';
import { Registers, FLAG_Z, FLAG_N, FLAG_H, FLAG_C } from './registers.js';
import type { InterruptController } from '../interrupts/interrupts.js';

/**
 * Sharp SM83 CPU (Game Boy).
 * Cycle counts are T-cycles (4 × M-cycles).
 */
export class Cpu {
  regs = new Registers();
  ime = false;
  halt = false;

  private eiDelay = false;
  private imePending = false;

  constructor(
    private mem: Memory,
    private interrupts?: InterruptController,
  ) {}

  resetPostBoot(): void {
    this.regs.resetPostBoot();
    this.ime = false;
    this.halt = false;
    this.eiDelay = false;
    this.imePending = false;
  }

  /** Execute one instruction (or interrupt service). Returns T-cycles consumed. */
  step(): number {
    if (this.imePending) {
      this.ime = true;
      this.imePending = false;
    }
    if (this.eiDelay) {
      this.eiDelay = false;
      this.imePending = true;
    }

    if (this.ime && this.interrupts) {
      const pending = this.interrupts.pending();
      if (pending) {
        this.halt = false;
        return this.serviceInterrupt(pending);
      }
    }

    if (this.halt) {
      const pending =
        this.interrupts &&
        (this.interrupts.ie & this.interrupts.ifFlag & 0x1f) !== 0;
      if (!this.ime && pending) {
        this.halt = false;
      } else {
        return 4;
      }
    }

    const op = this.fetch8();
    return this.execute(op);
  }

  private serviceInterrupt(pending: { bit: number; vector: number }): number {
    this.ime = false;
    this.interrupts!.acknowledge(pending.bit);
    this.push16(this.regs.pc);
    this.regs.pc = pending.vector;
    return 20;
  }

  private fetch8(): u8 {
    const v = this.mem.read(this.regs.pc);
    this.regs.pc = (this.regs.pc + 1) & 0xffff;
    return v;
  }

  private fetch16(): u16 {
    const lo = this.fetch8();
    const hi = this.fetch8();
    return (hi << 8) | lo;
  }

  private read8(addr: u16): u8 {
    return this.mem.read(addr & 0xffff);
  }

  private write8(addr: u16, value: u8): void {
    this.mem.write(addr & 0xffff, value & 0xff);
  }

  private push16(value: u16): void {
    this.regs.sp = (this.regs.sp - 1) & 0xffff;
    this.write8(this.regs.sp, (value >> 8) & 0xff);
    this.regs.sp = (this.regs.sp - 1) & 0xffff;
    this.write8(this.regs.sp, value & 0xff);
  }

  private pop16(): u16 {
    const lo = this.read8(this.regs.sp);
    this.regs.sp = (this.regs.sp + 1) & 0xffff;
    const hi = this.read8(this.regs.sp);
    this.regs.sp = (this.regs.sp + 1) & 0xffff;
    return (hi << 8) | lo;
  }

  // ---- register helpers ----

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
        return this.read8(this.regs.hl);
      case 7:
        return this.regs.a;
      default:
        return 0;
    }
  }

  private setR(i: number, v: u8): void {
    v &= 0xff;
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
    }
  }

  private getRp(i: number): u16 {
    switch (i) {
      case 0:
        return this.regs.bc;
      case 1:
        return this.regs.de;
      case 2:
        return this.regs.hl;
      case 3:
        return this.regs.sp;
      default:
        return 0;
    }
  }

  private setRp(i: number, v: u16): void {
    v &= 0xffff;
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
        this.regs.sp = v;
        break;
    }
  }

  private getRp2(i: number): u16 {
    return i === 3 ? this.regs.af : this.getRp(i);
  }

  private setRp2(i: number, v: u16): void {
    if (i === 3) this.regs.af = v;
    else this.setRp(i, v);
  }

  private cond(cc: number): boolean {
    switch (cc) {
      case 0:
        return !this.regs.z;
      case 1:
        return this.regs.z;
      case 2:
        return !this.regs.cy;
      case 3:
        return this.regs.cy;
      default:
        return false;
    }
  }

  // ---- ALU ----

  private add8(a: u8, b: u8, carry: boolean): u8 {
    const c = carry && this.regs.cy ? 1 : 0;
    const sum = a + b + c;
    const result = sum & 0xff;
    this.regs.setFlags(
      result === 0,
      false,
      ((a & 0xf) + (b & 0xf) + c) > 0xf,
      sum > 0xff,
    );
    return result;
  }

  private sub8(a: u8, b: u8, carry: boolean): u8 {
    const c = carry && this.regs.cy ? 1 : 0;
    const sum = a - b - c;
    const result = sum & 0xff;
    this.regs.setFlags(
      result === 0,
      true,
      ((a & 0xf) - (b & 0xf) - c) < 0,
      sum < 0,
    );
    return result;
  }

  private and8(a: u8, b: u8): u8 {
    const r = a & b;
    this.regs.setFlags(r === 0, false, true, false);
    return r;
  }

  private xor8(a: u8, b: u8): u8 {
    const r = a ^ b;
    this.regs.setFlags(r === 0, false, false, false);
    return r;
  }

  private or8(a: u8, b: u8): u8 {
    const r = a | b;
    this.regs.setFlags(r === 0, false, false, false);
    return r;
  }

  private cp8(a: u8, b: u8): void {
    this.sub8(a, b, false);
  }

  private inc8(v: u8): u8 {
    const r = (v + 1) & 0xff;
    this.regs.z = r === 0;
    this.regs.n = false;
    this.regs.hFlag = (v & 0xf) === 0xf;
    return r;
  }

  private dec8(v: u8): u8 {
    const r = (v - 1) & 0xff;
    this.regs.z = r === 0;
    this.regs.n = true;
    this.regs.hFlag = (v & 0xf) === 0;
    return r;
  }

  private addHl(v: u16): void {
    const hl = this.regs.hl;
    const sum = hl + v;
    this.regs.n = false;
    this.regs.hFlag = ((hl & 0xfff) + (v & 0xfff)) > 0xfff;
    this.regs.cy = sum > 0xffff;
    this.regs.hl = sum & 0xffff;
  }

  private daa(): void {
    let a = this.regs.a;
    let adjust = 0;
    let c = false;
    if (!this.regs.n) {
      if (this.regs.cy || a > 0x99) {
        adjust |= 0x60;
        c = true;
      }
      if (this.regs.hFlag || (a & 0x0f) > 0x09) adjust |= 0x06;
      a = (a + adjust) & 0xff;
    } else {
      if (this.regs.cy) adjust |= 0x60;
      if (this.regs.hFlag) adjust |= 0x06;
      a = (a - adjust) & 0xff;
      c = this.regs.cy;
    }
    this.regs.a = a;
    this.regs.z = a === 0;
    this.regs.hFlag = false;
    this.regs.cy = c;
  }

  // ---- CB helpers ----

  private rlc(v: u8): u8 {
    const c = (v >> 7) & 1;
    const r = ((v << 1) | c) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rrc(v: u8): u8 {
    const c = v & 1;
    const r = ((v >> 1) | (c << 7)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rl(v: u8): u8 {
    const c = (v >> 7) & 1;
    const r = ((v << 1) | (this.regs.cy ? 1 : 0)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private rr(v: u8): u8 {
    const c = v & 1;
    const r = ((v >> 1) | (this.regs.cy ? 0x80 : 0)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private sla(v: u8): u8 {
    const c = (v >> 7) & 1;
    const r = (v << 1) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private sra(v: u8): u8 {
    const c = v & 1;
    const r = ((v >> 1) | (v & 0x80)) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private srl(v: u8): u8 {
    const c = v & 1;
    const r = (v >> 1) & 0xff;
    this.regs.setFlags(r === 0, false, false, c === 1);
    return r;
  }

  private swap(v: u8): u8 {
    const r = ((v & 0x0f) << 4) | ((v & 0xf0) >> 4);
    this.regs.setFlags(r === 0, false, false, false);
    return r;
  }

  private bit(b: number, v: u8): void {
    this.regs.z = ((v >> b) & 1) === 0;
    this.regs.n = false;
    this.regs.hFlag = true;
  }

  private executeCb(op: u8): number {
    const x = (op >> 6) & 3;
    const y = (op >> 3) & 7;
    const z = op & 7;
    const isHl = z === 6;
    const cycles = isHl ? (x === 1 ? 12 : 16) : 8;

    const v = this.getR(z);
    if (x === 0) {
      let r: u8;
      switch (y) {
        case 0:
          r = this.rlc(v);
          break;
        case 1:
          r = this.rrc(v);
          break;
        case 2:
          r = this.rl(v);
          break;
        case 3:
          r = this.rr(v);
          break;
        case 4:
          r = this.sla(v);
          break;
        case 5:
          r = this.sra(v);
          break;
        case 6:
          r = this.swap(v);
          break;
        default:
          r = this.srl(v);
          break;
      }
      this.setR(z, r);
    } else if (x === 1) {
      this.bit(y, v);
    } else if (x === 2) {
      this.setR(z, v & ~(1 << y));
    } else {
      this.setR(z, v | (1 << y));
    }
    return cycles;
  }

  private execute(op: u8): number {
    // NOP
    if (op === 0x00) return 4;

    // LD r,r' / ALU r / etc via decoding groups
    const x = (op >> 6) & 3;
    const y = (op >> 3) & 7;
    const z = op & 7;
    const p = (y >> 1) & 3;
    const q = y & 1;

    // Block 0
    if (x === 0) {
      // Relative jumps
      if (op === 0x18) {
        const e = this.fetch8();
        const off = e < 0x80 ? e : e - 0x100;
        this.regs.pc = (this.regs.pc + off) & 0xffff;
        return 12;
      }
      if (op === 0x20 || op === 0x28 || op === 0x30 || op === 0x38) {
        const e = this.fetch8();
        const cc = (op >> 3) & 3;
        if (this.cond(cc)) {
          const off = e < 0x80 ? e : e - 0x100;
          this.regs.pc = (this.regs.pc + off) & 0xffff;
          return 12;
        }
        return 8;
      }

      // LD (rr),A / LD A,(rr)
      if (op === 0x02) {
        this.write8(this.regs.bc, this.regs.a);
        return 8;
      }
      if (op === 0x12) {
        this.write8(this.regs.de, this.regs.a);
        return 8;
      }
      if (op === 0x0a) {
        this.regs.a = this.read8(this.regs.bc);
        return 8;
      }
      if (op === 0x1a) {
        this.regs.a = this.read8(this.regs.de);
        return 8;
      }
      if (op === 0x22) {
        this.write8(this.regs.hl, this.regs.a);
        this.regs.hl = (this.regs.hl + 1) & 0xffff;
        return 8;
      }
      if (op === 0x32) {
        this.write8(this.regs.hl, this.regs.a);
        this.regs.hl = (this.regs.hl - 1) & 0xffff;
        return 8;
      }
      if (op === 0x2a) {
        this.regs.a = this.read8(this.regs.hl);
        this.regs.hl = (this.regs.hl + 1) & 0xffff;
        return 8;
      }
      if (op === 0x3a) {
        this.regs.a = this.read8(this.regs.hl);
        this.regs.hl = (this.regs.hl - 1) & 0xffff;
        return 8;
      }

      // INC/DEC r
      if (z === 4) {
        this.setR(y, this.inc8(this.getR(y)));
        return y === 6 ? 12 : 4;
      }
      if (z === 5) {
        this.setR(y, this.dec8(this.getR(y)));
        return y === 6 ? 12 : 4;
      }
      // LD r,d8
      if (z === 6) {
        this.setR(y, this.fetch8());
        return y === 6 ? 12 : 8;
      }

      // INC/DEC/ADD HL / LD rp
      if (z === 1 && q === 0) {
        this.setRp(p, this.fetch16());
        return 12;
      }
      if (z === 1 && q === 1) {
        this.addHl(this.getRp(p));
        return 8;
      }
      if (z === 3 && q === 0) {
        this.setRp(p, (this.getRp(p) + 1) & 0xffff);
        return 8;
      }
      if (z === 3 && q === 1) {
        this.setRp(p, (this.getRp(p) - 1) & 0xffff);
        return 8;
      }

      // RLCA/RRCA/RLA/RRA
      if (op === 0x07) {
        const a = this.regs.a;
        const c = (a >> 7) & 1;
        this.regs.a = ((a << 1) | c) & 0xff;
        this.regs.setFlags(false, false, false, c === 1);
        return 4;
      }
      if (op === 0x0f) {
        const a = this.regs.a;
        const c = a & 1;
        this.regs.a = ((a >> 1) | (c << 7)) & 0xff;
        this.regs.setFlags(false, false, false, c === 1);
        return 4;
      }
      if (op === 0x17) {
        const a = this.regs.a;
        const c = (a >> 7) & 1;
        this.regs.a = ((a << 1) | (this.regs.cy ? 1 : 0)) & 0xff;
        this.regs.setFlags(false, false, false, c === 1);
        return 4;
      }
      if (op === 0x1f) {
        const a = this.regs.a;
        const c = a & 1;
        this.regs.a = ((a >> 1) | (this.regs.cy ? 0x80 : 0)) & 0xff;
        this.regs.setFlags(false, false, false, c === 1);
        return 4;
      }

      if (op === 0x27) {
        this.daa();
        return 4;
      }
      if (op === 0x2f) {
        this.regs.a ^= 0xff;
        this.regs.n = true;
        this.regs.hFlag = true;
        return 4;
      }
      if (op === 0x37) {
        this.regs.n = false;
        this.regs.hFlag = false;
        this.regs.cy = true;
        return 4;
      }
      if (op === 0x3f) {
        this.regs.n = false;
        this.regs.hFlag = false;
        this.regs.cy = !this.regs.cy;
        return 4;
      }

      // LD (a16),SP
      if (op === 0x08) {
        const a = this.fetch16();
        this.write8(a, this.regs.sp & 0xff);
        this.write8((a + 1) & 0xffff, (this.regs.sp >> 8) & 0xff);
        return 20;
      }

      // STOP
      if (op === 0x10) {
        this.fetch8(); // unused byte
        return 4;
      }
    }

    // Block 1: LD r,r' (except HALT)
    if (x === 1) {
      if (op === 0x76) {
        this.halt = true;
        return 4;
      }
      this.setR(y, this.getR(z));
      return y === 6 || z === 6 ? 8 : 4;
    }

    // Block 2: ALU A,r
    if (x === 2) {
      const v = this.getR(z);
      switch (y) {
        case 0:
          this.regs.a = this.add8(this.regs.a, v, false);
          break;
        case 1:
          this.regs.a = this.add8(this.regs.a, v, true);
          break;
        case 2:
          this.regs.a = this.sub8(this.regs.a, v, false);
          break;
        case 3:
          this.regs.a = this.sub8(this.regs.a, v, true);
          break;
        case 4:
          this.regs.a = this.and8(this.regs.a, v);
          break;
        case 5:
          this.regs.a = this.xor8(this.regs.a, v);
          break;
        case 6:
          this.regs.a = this.or8(this.regs.a, v);
          break;
        case 7:
          this.cp8(this.regs.a, v);
          break;
      }
      return z === 6 ? 8 : 4;
    }

    // Block 3
    if (x === 3) {
      // RET cc
      if (z === 0 && y <= 3) {
        if (this.cond(y)) {
          this.regs.pc = this.pop16();
          return 20;
        }
        return 8;
      }
      // LD (FF00+n),A / ADD SP,e / LD HL,SP+e / LD A,(FF00+n)
      if (op === 0xe0) {
        this.write8(0xff00 | this.fetch8(), this.regs.a);
        return 12;
      }
      if (op === 0xf0) {
        this.regs.a = this.read8(0xff00 | this.fetch8());
        return 12;
      }
      if (op === 0xe2) {
        this.write8(0xff00 | this.regs.c, this.regs.a);
        return 8;
      }
      if (op === 0xf2) {
        this.regs.a = this.read8(0xff00 | this.regs.c);
        return 8;
      }
      if (op === 0xe8) {
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
      if (op === 0xf8) {
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
      if (op === 0xf9) {
        this.regs.sp = this.regs.hl;
        return 8;
      }
      if (op === 0xea) {
        this.write8(this.fetch16(), this.regs.a);
        return 16;
      }
      if (op === 0xfa) {
        this.regs.a = this.read8(this.fetch16());
        return 16;
      }

      // POP rp2
      if (z === 1 && q === 0) {
        this.setRp2(p, this.pop16());
        return 12;
      }
      // PUSH rp2
      if (z === 5 && q === 0) {
        // encoding: 11pp0101 → actually C5=push bc, D5, E5, F5
      }
      if (op === 0xc5 || op === 0xd5 || op === 0xe5 || op === 0xf5) {
        this.push16(this.getRp2((op >> 4) & 3));
        return 16;
      }

      // RET / RETI / JP HL
      if (op === 0xc9) {
        this.regs.pc = this.pop16();
        return 16;
      }
      if (op === 0xd9) {
        this.regs.pc = this.pop16();
        this.ime = true;
        return 16;
      }
      if (op === 0xe9) {
        this.regs.pc = this.regs.hl;
        return 4;
      }

      // JP cc / JP
      if (op === 0xc3) {
        this.regs.pc = this.fetch16();
        return 16;
      }
      if (op === 0xc2 || op === 0xca || op === 0xd2 || op === 0xda) {
        const addr = this.fetch16();
        if (this.cond((op >> 3) & 3)) {
          this.regs.pc = addr;
          return 16;
        }
        return 12;
      }

      // CALL cc / CALL
      if (op === 0xcd) {
        const addr = this.fetch16();
        this.push16(this.regs.pc);
        this.regs.pc = addr;
        return 24;
      }
      if (op === 0xc4 || op === 0xcc || op === 0xd4 || op === 0xdc) {
        const addr = this.fetch16();
        if (this.cond((op >> 3) & 3)) {
          this.push16(this.regs.pc);
          this.regs.pc = addr;
          return 24;
        }
        return 12;
      }

      // ALU A,d8
      if (z === 6) {
        const v = this.fetch8();
        switch (y) {
          case 0:
            this.regs.a = this.add8(this.regs.a, v, false);
            break;
          case 1:
            this.regs.a = this.add8(this.regs.a, v, true);
            break;
          case 2:
            this.regs.a = this.sub8(this.regs.a, v, false);
            break;
          case 3:
            this.regs.a = this.sub8(this.regs.a, v, true);
            break;
          case 4:
            this.regs.a = this.and8(this.regs.a, v);
            break;
          case 5:
            this.regs.a = this.xor8(this.regs.a, v);
            break;
          case 6:
            this.regs.a = this.or8(this.regs.a, v);
            break;
          case 7:
            this.cp8(this.regs.a, v);
            break;
        }
        return 8;
      }

      // RST
      if (z === 7) {
        this.push16(this.regs.pc);
        this.regs.pc = y * 8;
        return 16;
      }

      // DI / EI / CB
      if (op === 0xf3) {
        this.ime = false;
        this.eiDelay = false;
        this.imePending = false;
        return 4;
      }
      if (op === 0xfb) {
        this.eiDelay = true;
        return 4;
      }
      if (op === 0xcb) {
        return this.executeCb(this.fetch8());
      }
    }

    // Illegal / unused on DMG (D3, DB, DD, E3, E4, EB, EC, ED, F4, FC, FD)
    console.warn(`Unimplemented opcode 0x${op.toString(16)}`);
    return 4;
  }
}

export { FLAG_Z, FLAG_N, FLAG_H, FLAG_C };
