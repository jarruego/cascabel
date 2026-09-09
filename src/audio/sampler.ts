import { obtenerContexto, registrarFuente, salidaMaestra } from './AudioEngine';
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

/**
 * Elige la muestra más cercana y a qué velocidad reproducirla.
 *
 * Se saca de la clase para poder probarlo sin AudioContext, que es lo que importa: si el
 * `playbackRate` está mal, todo el proyecto desafina y no lo detecta nadie hasta que un
 * niño canta encima.
 */
export function elegirMuestra(
  disponibles: number[],
  objetivo: number,
): { origen: number; velocidad: number; semitonos: number } {
  if (disponibles.length === 0) throw new Error('No hay muestras cargadas');
  const origen = disponibles.reduce((mejor, m) =>
    Math.abs(m - objetivo) < Math.abs(mejor - objetivo) ? m : mejor,
  );
  const semitonos = objetivo - origen;
  return { origen, semitonos, velocidad: 2 ** (semitonos / 12) };
}

/**
 * Muestras de marimba, de la Versilian Community Sample Library (CC0).
 *
 * Seis notas repartidas de F3 a C6, unos 64 KB en total. El resto se interpola con
 * `playbackRate`, y funciona porque la marimba es percusiva: estirarla dos o tres
 * semitonos no delata. Un piano estirado igual suena mal enseguida.
 */
export const MARIMBA: Muestra[] = [
  { nota: 'F3', url: '/audio/muestras/marimba/f3.opus' },
  { nota: 'C4', url: '/audio/muestras/marimba/c4.opus' },
  { nota: 'G4', url: '/audio/muestras/marimba/g4.opus' },
  { nota: 'B4', url: '/audio/muestras/marimba/b4.opus' },
  { nota: 'F5', url: '/audio/muestras/marimba/f5.opus' },
  { nota: 'C6', url: '/audio/muestras/marimba/c6.opus' },
];

export class Sampler {
  private buffers = new Map<number, AudioBuffer>();
  private salida: GainNode | null = null;

  constructor(private muestras: Muestra[]) {}

  async cargar(): Promise<void> {
    const ctx = obtenerContexto();
    this.salida = ctx.createGain();
    this.salida.gain.value = 0.8;
    this.salida.connect(salidaMaestra());

    await Promise.all(
      this.muestras.map(async ({ nota, url }) => {
        const datos = await cargarBinario(url);
        this.buffers.set(aMidi(nota), await ctx.decodeAudioData(datos));
      }),
    );
  }

  /** @param cuando instante del AudioContext; si se omite, suena ya. */
  /**
   * Empieza una nota y la mantiene hasta que se suelte.
   *
   * **Solo tiene sentido en instrumentos que sostienen de verdad.** Una marimba se golpea y
   * se apaga: mantenerla artificialmente suena a lo que es, a una muestra en bucle. Una
   * flauta, un violín o una voz sí sostienen, y ahí repetir el ataque suena a error porque
   * el instrumento real no hace eso. Quién puede y quién no lo declara `audio/instrumentos.ts`.
   *
   * Se hace con `loop` sobre el tramo central de la muestra, que es donde el sonido ya se ha
   * estabilizado: el ataque queda fuera del bucle —repetirlo sonaría a tartamudeo— y la
   * caída también, porque es justo lo que no queremos que pase mientras se sostiene.
   *
   * PENDIENTE DE ESCUCHA: si el punto de bucle «canta», hay que moverlo. Eso no se decide
   * mirando el código.
   *
   * @returns una función para soltar la nota. Llamarla dos veces no hace daño.
   */
  sostener(nota: string, volumen = 1): () => void {
    const ctx = obtenerContexto();
    if (!this.salida) throw new Error('El sampler no está cargado');

    const objetivo = aMidi(nota);
    const { origen, velocidad } = elegirMuestra([...this.buffers.keys()], objetivo);
    const buffer = this.buffers.get(origen);
    if (!buffer) return () => {};

    const t = ctx.currentTime;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = velocidad;
    fuente.loop = true;
    // El tramo central: del 35 % al 75 % de la muestra. Fuera queda el ataque, que
    // repetido sonaría a tartamudeo, y la caída, que es lo que no debe pasar mientras dura.
    fuente.loopStart = buffer.duration * 0.35;
    fuente.loopEnd = buffer.duration * 0.75;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + 0.02);

    fuente.connect(env).connect(this.salida);
    registrarFuente(fuente);
    fuente.start(t);

    let soltada = false;
    return () => {
      if (soltada) return;
      soltada = true;
      const ahora = ctx.currentTime;
      // Caída corta al soltar: sin ella, cortar el bucle produce un chasquido.
      env.gain.cancelScheduledValues(ahora);
      env.gain.setValueAtTime(Math.max(env.gain.value, 0.0001), ahora);
      env.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.12);
      fuente.stop(ahora + 0.2);
    };
  }

  tocar(nota: string, cuando?: number, duracion = 1.2, volumen = 1): void {
    const ctx = obtenerContexto();
    if (!this.salida) throw new Error('El sampler no está cargado');

    const objetivo = aMidi(nota);
    const { origen, velocidad } = elegirMuestra([...this.buffers.keys()], objetivo);
    const buffer = this.buffers.get(origen);
    if (!buffer) return;

    const t = cuando ?? ctx.currentTime;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = velocidad;

    // Envolvente: sin el release, cortar la muestra produce un clic muy audible.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

    fuente.connect(env).connect(this.salida);
    registrarFuente(fuente);
    fuente.start(t);
    fuente.stop(t + duracion + 0.05);
  }
}
