import { obtenerContexto } from './AudioEngine';
import { cargarBinario } from '@/datos/cargar';

/**
 * Sampler mínimo: 5-7 muestras Opus por instrumento (una por octava) y el resto
 * interpolado con playbackRate. Unos 70 KB por instrumento frente a los 4-8 MB de
 * un soundfont General MIDI, y todo cabe en la caché del service worker.
 *
 * Funciona porque los timbres que usamos (marimba, xilófono, glockenspiel, campanas)
 * toleran muy bien el pitch-shifting. Un piano estirado tres semitonos suena mal.
 */

export interface Muestra {
  nota: string; // p. ej. "C4"
  url: string;
}

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function aMidi(nota: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(nota);
  if (!m) throw new Error(`Nota no reconocida: ${nota}`);
  const indice = NOTAS.indexOf(m[1]!);
  return (Number(m[2]) + 1) * 12 + indice;
}

export class Sampler {
  private buffers = new Map<number, AudioBuffer>();
  private salida: GainNode | null = null;

  constructor(private muestras: Muestra[]) {}

  async cargar(): Promise<void> {
    const ctx = obtenerContexto();
    this.salida = ctx.createGain();
    this.salida.gain.value = 0.8;
    this.salida.connect(ctx.destination);

    await Promise.all(
      this.muestras.map(async ({ nota, url }) => {
        const datos = await cargarBinario(url);
        this.buffers.set(aMidi(nota), await ctx.decodeAudioData(datos));
      }),
    );
  }

  /** @param cuando instante del AudioContext; si se omite, suena ya. */
  tocar(nota: string, cuando?: number, duracion = 1.2, volumen = 1): void {
    const ctx = obtenerContexto();
    if (!this.salida) throw new Error('El sampler no está cargado');

    const objetivo = aMidi(nota);
    const origen = [...this.buffers.keys()].reduce((mejor, m) =>
      Math.abs(m - objetivo) < Math.abs(mejor - objetivo) ? m : mejor,
    );
    const buffer = this.buffers.get(origen);
    if (!buffer) return;

    const t = cuando ?? ctx.currentTime;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = 2 ** ((objetivo - origen) / 12);

    // Envolvente: sin el release, cortar la muestra produce un clic muy audible.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

    fuente.connect(env).connect(this.salida);
    fuente.start(t);
    fuente.stop(t + duracion + 0.05);
  }
}
