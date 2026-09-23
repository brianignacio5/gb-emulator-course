/**
 * Copy channel helpers from previous APU, expose required public API.
 */
import type { u8, u16 } from '../types.js';

const DUTY_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
];

const NOISE_DIV = [8, 16, 32, 48, 64, 80, 96, 112];
const CPU_HZ = 4194304;

class Envelope {
  volume = 0;
  initial = 0;
  increase = false;
  period = 0;
  timer = 0;

  load(n2: u8): void {
    this.initial = (n2 >> 4) & 0x0f;
    this.volume = this.initial;
    this.increase = (n2 & 0x08) !== 0;
    this.period = n2 & 0x07;
    this.timer = this.period;
  }

  clock(): void {
    if (this.period === 0) return;
    if (--this.timer > 0) return;
    this.timer = this.period;
    if (this.increase && this.volume < 15) this.volume++;
    else if (!this.increase && this.volume > 0) this.volume--;
  }
}

class LengthCounter {
  length = 0;
  enabled = false;

  clock(): void {
    if (this.enabled && this.length > 0) this.length--;
  }

  active(): boolean {
    return !this.enabled || this.length > 0;
  }
}

class SquareChannel {
  enabled = false;
  dacEnabled = false;
  duty = 0;
  dutyPos = 0;
  freq = 0;
  freqTimer = 0;
  envelope = new Envelope();
  length = new LengthCounter();
  sweepPeriod = 0;
  sweepNeg = false;
  sweepShift = 0;
  sweepTimer = 0;
  sweepEnabled = false;
  shadowFreq = 0;
  hasSweep = false;

  constructor(hasSweep: boolean) {
    this.hasSweep = hasSweep;
  }

  writeNrx0(v: u8): void {
    if (!this.hasSweep) return;
    this.sweepPeriod = (v >> 4) & 0x07;
    this.sweepNeg = (v & 0x08) !== 0;
    this.sweepShift = v & 0x07;
  }

  writeNrx1(v: u8): void {
    this.duty = (v >> 6) & 0x03;
    this.length.length = 64 - (v & 0x3f);
  }

  writeNrx2(v: u8): void {
    this.envelope.load(v);
    this.dacEnabled = (v & 0xf8) !== 0;
    if (!this.dacEnabled) this.enabled = false;
  }

  writeNrx3(v: u8): void {
    this.freq = (this.freq & 0x700) | v;
  }

  writeNrx4(v: u8): void {
    this.freq = (this.freq & 0xff) | ((v & 0x07) << 8);
    this.length.enabled = (v & 0x40) !== 0;
    if (v & 0x80) this.trigger();
  }

  private trigger(): void {
    this.enabled = this.dacEnabled;
    if (this.length.length === 0) this.length.length = 64;
    this.freqTimer = (2048 - this.freq) * 4;
    this.envelope.volume = this.envelope.initial;
    this.envelope.timer = this.envelope.period || 8;
    if (this.hasSweep) {
      this.shadowFreq = this.freq;
      this.sweepTimer = this.sweepPeriod || 8;
      this.sweepEnabled = this.sweepPeriod > 0 || this.sweepShift > 0;
      if (this.sweepShift > 0) this.sweepCalc(true);
    }
  }

  private sweepCalc(writeBack: boolean): number {
    let newFreq = this.shadowFreq >> this.sweepShift;
    newFreq = this.sweepNeg ? this.shadowFreq - newFreq : this.shadowFreq + newFreq;
    if (newFreq > 2047) this.enabled = false;
    if (writeBack && this.sweepShift > 0 && newFreq <= 2047) {
      this.shadowFreq = newFreq;
      this.freq = newFreq;
    }
    return newFreq;
  }

  clockSweep(): void {
    if (!this.hasSweep || !this.sweepEnabled) return;
    if (--this.sweepTimer > 0) return;
    this.sweepTimer = this.sweepPeriod || 8;
    if (this.sweepPeriod > 0) {
      const f = this.sweepCalc(true);
      if (f <= 2047 && this.sweepShift > 0) this.sweepCalc(false);
    }
  }

  step(cycles: number): void {
    if (!this.enabled) return;
    let c = cycles;
    while (c > 0) {
      if (this.freqTimer <= c) {
        c -= Math.max(this.freqTimer, 1);
        this.freqTimer = (2048 - this.freq) * 4;
        this.dutyPos = (this.dutyPos + 1) & 7;
      } else {
        this.freqTimer -= c;
        c = 0;
      }
    }
  }

  sample(): number {
    if (!this.enabled || !this.dacEnabled || !this.length.active()) return 0;
    const bit = DUTY_TABLE[this.duty]![this.dutyPos]!;
    return bit ? this.envelope.volume : 0;
  }
}

class WaveChannel {
  enabled = false;
  dacEnabled = false;
  length = new LengthCounter();
  freq = 0;
  freqTimer = 0;
  position = 0;
  volumeCode = 0;
  readonly waveRam = new Uint8Array(16);

  writeNr30(v: u8): void {
    this.dacEnabled = (v & 0x80) !== 0;
    if (!this.dacEnabled) this.enabled = false;
  }
  writeNr31(v: u8): void {
    this.length.length = 256 - v;
  }
  writeNr32(v: u8): void {
    this.volumeCode = (v >> 5) & 0x03;
  }
  writeNr33(v: u8): void {
    this.freq = (this.freq & 0x700) | v;
  }
  writeNr34(v: u8): void {
    this.freq = (this.freq & 0xff) | ((v & 0x07) << 8);
    this.length.enabled = (v & 0x40) !== 0;
    if (v & 0x80) {
      this.enabled = this.dacEnabled;
      if (this.length.length === 0) this.length.length = 256;
      this.position = 0;
      this.freqTimer = (2048 - this.freq) * 2;
    }
  }

  step(cycles: number): void {
    if (!this.enabled) return;
    let c = cycles;
    while (c > 0) {
      if (this.freqTimer <= c) {
        c -= Math.max(this.freqTimer, 1);
        this.freqTimer = (2048 - this.freq) * 2;
        this.position = (this.position + 1) & 31;
      } else {
        this.freqTimer -= c;
        c = 0;
      }
    }
  }

  sample(): number {
    if (!this.enabled || !this.dacEnabled || !this.length.active()) return 0;
    if (this.volumeCode === 0) return 0;
    const byte = this.waveRam[this.position >> 1]!;
    let nibble = this.position & 1 ? byte & 0x0f : byte >> 4;
    nibble >>= this.volumeCode - 1;
    return nibble;
  }
}

class NoiseChannel {
  enabled = false;
  dacEnabled = false;
  envelope = new Envelope();
  length = new LengthCounter();
  lfsr = 0x7fff;
  wide = false;
  clockShift = 0;
  divisorCode = 0;
  timer = 0;

  writeNr41(v: u8): void {
    this.length.length = 64 - (v & 0x3f);
  }
  writeNr42(v: u8): void {
    this.envelope.load(v);
    this.dacEnabled = (v & 0xf8) !== 0;
    if (!this.dacEnabled) this.enabled = false;
  }
  writeNr43(v: u8): void {
    this.clockShift = (v >> 4) & 0x0f;
    this.wide = (v & 0x08) !== 0;
    this.divisorCode = v & 0x07;
  }
  writeNr44(v: u8): void {
    this.length.enabled = (v & 0x40) !== 0;
    if (v & 0x80) {
      this.enabled = this.dacEnabled;
      if (this.length.length === 0) this.length.length = 64;
      this.lfsr = 0x7fff;
      this.envelope.volume = this.envelope.initial;
      this.timer = NOISE_DIV[this.divisorCode]! << this.clockShift;
    }
  }

  step(cycles: number): void {
    if (!this.enabled) return;
    let c = cycles;
    while (c > 0) {
      if (this.timer <= c) {
        c -= Math.max(this.timer, 1);
        this.timer = NOISE_DIV[this.divisorCode]! << this.clockShift;
        const xor = (this.lfsr & 1) ^ ((this.lfsr >> 1) & 1);
        this.lfsr = (this.lfsr >> 1) | (xor << 14);
        if (this.wide) {
          this.lfsr = (this.lfsr & ~0x40) | (xor << 6);
        }
      } else {
        this.timer -= c;
        c = 0;
      }
    }
  }

  sample(): number {
    if (!this.enabled || !this.dacEnabled || !this.length.active()) return 0;
    return this.lfsr & 1 ? 0 : this.envelope.volume;
  }
}

/** DMG APU: NR50/51/52 + CH1–4, stereo mix + sample buffers. */
export class Apu {
  readonly sampleRate = 44100;
  leftBuffer: number[] = [];
  rightBuffer: number[] = [];

  private powered = false;
  private nr50: u8 = 0;
  private nr51: u8 = 0;

  private readonly ch1 = new SquareChannel(true);
  private readonly ch2 = new SquareChannel(false);
  private readonly ch3 = new WaveChannel();
  private readonly ch4 = new NoiseChannel();

  private frameSeq = 0;
  private frameCycles = 0;
  private readonly framePeriod = 8192;
  private sampleAcc = 0;
  private readonly regs = new Uint8Array(0x30);

  read(addr: u16): u8 {
    const i = addr - 0xff10;
    if (addr === 0xff26) {
      let v = this.powered ? 0x80 : 0;
      if (this.ch1.enabled) v |= 1;
      if (this.ch2.enabled) v |= 2;
      if (this.ch3.enabled) v |= 4;
      if (this.ch4.enabled) v |= 8;
      return v | 0x70;
    }
    if (addr === 0xff24) return this.nr50;
    if (addr === 0xff25) return this.nr51;
    if (addr >= 0xff30 && addr <= 0xff3f) {
      return this.ch3.waveRam[addr - 0xff30]!;
    }
    const masks = [
      0x80, 0x3f, 0x00, 0xff, 0xbf, 0xff, 0x3f, 0x00, 0xff, 0xbf, 0x7f, 0xff, 0x9f, 0xff, 0xbf, 0xff,
      0xff, 0x00, 0xff, 0xbf, 0x00, 0x00, 0x70,
    ];
    if (i >= 0 && i < masks.length) {
      return (this.regs[i]! | masks[i]!) & 0xff;
    }
    return 0xff;
  }

  write(addr: u16, value: u8): void {
    value &= 0xff;
    if (addr === 0xff26) {
      const on = (value & 0x80) !== 0;
      if (!on) {
        for (let a = 0xff10; a <= 0xff25; a++) this.writePowered(a, 0);
        this.powered = false;
      } else if (!this.powered) {
        this.powered = true;
        this.frameSeq = 0;
      }
      return;
    }
    if (!this.powered && addr !== 0xff26) return;
    this.writePowered(addr, value);
  }

  private writePowered(addr: u16, value: u8): void {
    const i = addr - 0xff10;
    if (i >= 0 && i < this.regs.length) this.regs[i] = value;

    switch (addr) {
      case 0xff10:
        this.ch1.writeNrx0(value);
        break;
      case 0xff11:
        this.ch1.writeNrx1(value);
        break;
      case 0xff12:
        this.ch1.writeNrx2(value);
        break;
      case 0xff13:
        this.ch1.writeNrx3(value);
        break;
      case 0xff14:
        this.ch1.writeNrx4(value);
        break;
      case 0xff16:
        this.ch2.writeNrx1(value);
        break;
      case 0xff17:
        this.ch2.writeNrx2(value);
        break;
      case 0xff18:
        this.ch2.writeNrx3(value);
        break;
      case 0xff19:
        this.ch2.writeNrx4(value);
        break;
      case 0xff1a:
        this.ch3.writeNr30(value);
        break;
      case 0xff1b:
        this.ch3.writeNr31(value);
        break;
      case 0xff1c:
        this.ch3.writeNr32(value);
        break;
      case 0xff1d:
        this.ch3.writeNr33(value);
        break;
      case 0xff1e:
        this.ch3.writeNr34(value);
        break;
      case 0xff20:
        this.ch4.writeNr41(value);
        break;
      case 0xff21:
        this.ch4.writeNr42(value);
        break;
      case 0xff22:
        this.ch4.writeNr43(value);
        break;
      case 0xff23:
        this.ch4.writeNr44(value);
        break;
      case 0xff24:
        this.nr50 = value;
        break;
      case 0xff25:
        this.nr51 = value;
        break;
      default:
        if (addr >= 0xff30 && addr <= 0xff3f) {
          this.ch3.waveRam[addr - 0xff30] = value;
        }
    }
  }

  step(cycles: number): void {
    if (!this.powered) {
      this.sampleAcc += cycles;
      return;
    }

    const cyclesPerSample = CPU_HZ / this.sampleRate;
    let remaining = cycles;
    while (remaining > 0) {
      const untilSample = Math.ceil(cyclesPerSample - this.sampleAcc);
      const chunk = Math.min(remaining, Math.max(untilSample, 1));
      this.advance(chunk);
      remaining -= chunk;
      this.sampleAcc += chunk;
      while (this.sampleAcc >= cyclesPerSample) {
        this.sampleAcc -= cyclesPerSample;
        const s = this.mixSample();
        this.leftBuffer.push(s.left);
        this.rightBuffer.push(s.right);
      }
    }
  }

  private advance(cycles: number): void {
    this.ch1.step(cycles);
    this.ch2.step(cycles);
    this.ch3.step(cycles);
    this.ch4.step(cycles);

    this.frameCycles += cycles;
    while (this.frameCycles >= this.framePeriod) {
      this.frameCycles -= this.framePeriod;
      this.clockFrameSequencer();
    }
  }

  private clockFrameSequencer(): void {
    const step = this.frameSeq++ & 7;
    if (step === 0 || step === 2 || step === 4 || step === 6) {
      this.ch1.length.clock();
      this.ch2.length.clock();
      this.ch3.length.clock();
      this.ch4.length.clock();
      if (!this.ch1.length.active()) this.ch1.enabled = false;
      if (!this.ch2.length.active()) this.ch2.enabled = false;
      if (!this.ch3.length.active()) this.ch3.enabled = false;
      if (!this.ch4.length.active()) this.ch4.enabled = false;
    }
    if (step === 2 || step === 6) this.ch1.clockSweep();
    if (step === 7) {
      this.ch1.envelope.clock();
      this.ch2.envelope.clock();
      this.ch4.envelope.clock();
    }
  }

  mixSample(): { left: number; right: number } {
    if (!this.powered) return { left: 0, right: 0 };
    const s = [this.ch1.sample(), this.ch2.sample(), this.ch3.sample(), this.ch4.sample()];
    let left = 0;
    let right = 0;
    for (let i = 0; i < 4; i++) {
      if (this.nr51 & (1 << i)) right += s[i]!;
      if (this.nr51 & (1 << (i + 4))) left += s[i]!;
    }
    const volL = ((this.nr50 >> 4) & 7) + 1;
    const volR = (this.nr50 & 7) + 1;
    return { left: (left * volL) / 480, right: (right * volR) / 480 };
  }

  drainSamples(): { left: Float32Array; right: Float32Array } {
    const left = Float32Array.from(this.leftBuffer);
    const right = Float32Array.from(this.rightBuffer);
    this.leftBuffer = [];
    this.rightBuffer = [];
    return { left, right };
  }
}
