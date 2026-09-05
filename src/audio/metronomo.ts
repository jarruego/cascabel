import { obtenerContexto } from './AudioEngine';

/**
 * Metrónomo con lookahead scheduling (patrón «A Tale of Two Clocks»).
 *
 * setInterval NUNCA sirve para tiempo musical: el hilo principal sufre jitter de
 * decenas de milisegundos y el navegador lo estrangula a 1 Hz en segundo plano.
 * Aquí un temporizador barato e impreciso PROGRAMA, y el reloj de audio EJECUTA.
 *
 * Lo visual va aparte, en una cola que consume requestAnimationFrame: si animas
 * dentro del planificador, el destello se ve 100 ms antes de oírse el clic.
 */

const LOOKAHEAD_MS = 25;
const PROGRAMAR_S = 0.1;

export interface PulsoProgramado {
  pulso: number;
  tiempo: number; // en segundos del AudioContext
  acentuado: boolean;
}

export class Metronomo {
  private idTemporizador: number | null = null;
  private siguienteTiempo = 0;
  private pulso = 0;
  private cola: PulsoProgramado[] = [];

  constructor(
    private bpm = 72,
    private pulsosPorCompas = 2,
    private conSonido = true,
  ) {}

  get enMarcha(): boolean {
    return this.idTemporizador !== null;
  }

  arrancar(): void {
    if (this.enMarcha) return;
    const ctx = obtenerContexto();
    this.pulso = 0;
    this.cola = [];
    this.siguienteTiempo = ctx.currentTime + 0.1;
    this.planificar();
  }

  parar(): void {
    if (this.idTemporizador !== null) {
      clearTimeout(this.idTemporizador);
      this.idTemporizador = null;
    }
    this.cola = [];
  }

  cambiarTempo(bpm: number): void {
    this.bpm = Math.max(40, Math.min(180, bpm));
  }

  /** Pulsos ya programados cuyo instante coincide con «ahora». Consúmelo desde rAF. */
  pulsosParaPintar(ahora = obtenerContexto().currentTime): PulsoProgramado[] {
    const listos: PulsoProgramado[] = [];
    while (this.cola.length && this.cola[0]!.tiempo <= ahora) {
      listos.push(this.cola.shift()!);
    }
    return listos;
  }

  /** Instante previsto del siguiente pulso: es la referencia de la evaluación rítmica. */
  proximoPulso(): number {
    return this.siguienteTiempo;
  }

  private planificar = (): void => {
    const ctx = obtenerContexto();
    while (this.siguienteTiempo < ctx.currentTime + PROGRAMAR_S) {
      const acentuado = this.pulso % this.pulsosPorCompas === 0;
      if (this.conSonido) this.clic(this.siguienteTiempo, acentuado);
      this.cola.push({ pulso: this.pulso, tiempo: this.siguienteTiempo, acentuado });
      this.siguienteTiempo += 60 / this.bpm;
      this.pulso += 1;
    }
    this.idTemporizador = window.setTimeout(this.planificar, LOOKAHEAD_MS);
  };

  /** Un oscilador pesa cero y no hay que descargarlo: mejor que una muestra para el clic. */
  private clic(tiempo: number, acentuado: boolean): void {
    const ctx = obtenerContexto();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = acentuado ? 1000 : 800;
    gain.gain.setValueAtTime(0.001, tiempo);
    gain.gain.exponentialRampToValueAtTime(acentuado ? 0.35 : 0.2, tiempo + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, tiempo + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(tiempo);
    osc.stop(tiempo + 0.04);
  }
}
