import { Bus } from './memory/bus.js';
import { createCartridge, type Cartridge } from './cartridge/index.js';
import { Cpu } from './cpu/cpu.js';
import { Ppu } from './ppu/ppu.js';
import { Timer } from './timer/timer.js';
import { Joypad } from './joypad/joypad.js';
import { Apu } from './apu/apu.js';
import { InterruptController } from './interrupts/interrupts.js';

/** Wire components as you unlock later lessons. */
export class Emulator {
  bus = new Bus();
  interrupts = new InterruptController();
  timer = new Timer();
  joypad = new Joypad();
  apu = new Apu();
  ppu: Ppu;
  cpu: Cpu;
  cartridge: Cartridge | null = null;

  constructor() {
    this.ppu = new Ppu(this.bus);
    this.cpu = new Cpu(this.bus, this.interrupts);
  }

  loadRom(_rom: Uint8Array): void {
    throw new Error('TODO: implement loadRom (lesson 03+)');
  }

  stepInstruction(): number {
    throw new Error('TODO: implement stepInstruction');
  }

  stepFrame(): void {
    throw new Error('TODO: lesson-17');
  }

  getFramebuffer(): Uint8Array {
    return this.ppu.framebuffer;
  }

  getSaveRam(): Uint8Array | null {
    return this.cartridge?.saveRam ?? null;
  }
}
