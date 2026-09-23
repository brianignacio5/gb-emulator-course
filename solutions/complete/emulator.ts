import { Bus } from './memory/bus.js';
import { createCartridge, type Cartridge } from './cartridge/index.js';
import { Cpu } from './cpu/cpu.js';
import { Ppu } from './ppu/ppu.js';
import { Timer } from './timer/timer.js';
import { Joypad, type Button } from './joypad/joypad.js';
import { Apu } from './apu/apu.js';
import { InterruptController, INT_VBLANK, INT_STAT, INT_TIMER, INT_JOYPAD } from './interrupts/interrupts.js';

const CYCLES_PER_FRAME = 70224;

/** Full DMG emulator wired to the course test API. */
export class Emulator {
  bus = new Bus();
  interrupts = new InterruptController();
  timer = new Timer();
  joypad = new Joypad();
  apu = new Apu();
  ppu: Ppu;
  cpu: Cpu;
  cartridge: Cartridge | null = null;

  private cyclesThisFrame = 0;

  constructor() {
    this.ppu = new Ppu(this.bus);
    this.cpu = new Cpu(this.bus, this.interrupts);

    this.timer.onOverflow = () => this.interrupts.request(INT_TIMER);
    this.joypad.onInterrupt = () => this.interrupts.request(INT_JOYPAD);
    this.ppu.onVBlank = () => this.interrupts.request(INT_VBLANK);
    this.ppu.onStat = () => this.interrupts.request(INT_STAT);

    this.bus.handlers = {
      readJoypad: () => this.joypad.readP1(),
      writeJoypad: (v) => this.joypad.writeP1(v),
      readTimer: (a) => this.timer.read(a),
      writeTimer: (a, v) => this.timer.write(a, v),
      readPpu: (a) => this.ppu.read(a),
      writePpu: (a, v) => this.ppu.write(a, v),
      readApu: (a) => this.apu.read(a),
      writeApu: (a, v) => this.apu.write(a, v),
      onDma: (page) => this.ppu.doDma(page, this.bus),
    };
  }

  private pullIeIfFromBus(): void {
    this.interrupts.ie = this.bus.ie;
    this.interrupts.ifFlag = this.bus.ifFlag & 0x1f;
  }

  private pushIeIfToBus(): void {
    this.bus.ie = this.interrupts.ie;
    this.bus.ifFlag = this.interrupts.ifFlag;
  }

  loadRom(rom: Uint8Array): void {
    this.cartridge = createCartridge(rom);
    this.bus.cartridge = this.cartridge;
    this.cpu.resetPostBoot();
    this.cpu.ime = false;
    this.interrupts.ie = 0;
    this.interrupts.ifFlag = 0x01;
    this.pushIeIfToBus();
    this.cyclesThisFrame = 0;
    this.ppu.lcdc = 0x91;
    this.ppu.stat = 0x85;
    this.ppu.bgp = 0xfc;
  }

  stepInstruction(): number {
    this.pullIeIfFromBus();
    const cycles = this.cpu.step();
    this.timer.step(cycles);
    this.ppu.step(cycles);
    this.apu.step(cycles);
    this.pushIeIfToBus();
    this.cyclesThisFrame += cycles;
    return cycles;
  }

  stepFrame(): void {
    const target = CYCLES_PER_FRAME;
    while (this.cyclesThisFrame < target) {
      this.stepInstruction();
    }
    this.cyclesThisFrame -= target;
  }

  getFramebuffer(): Uint8Array {
    return this.ppu.framebuffer;
  }

  getSaveRam(): Uint8Array | null {
    return this.cartridge?.saveRam ?? null;
  }

  setButton(button: Button, down: boolean): void {
    this.joypad.setButton(button, down);
  }
}

export type { Button };
