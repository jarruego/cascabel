import { obtenerContexto } from './AudioEngine';
import { cargarBinario } from '@/datos/cargar';

/**
 * Reproductor de percusión.
 *
 * **No es el `Sampler`, y no puede serlo.** El `Sampler` interpola alturas con
 * `playbackRate`: dada una nota, busca la muestra más cercana y la estira. Un bombo no tiene
 * altura que interpolar —o suena el bombo, o suena otra cosa—, y estirarlo lo convertiría en
 * un bombo más grande o más pequeño, que es un instrumento distinto. Aquí cada golpe es su
 * propia muestra y no hay nada que transponer.
 *
 * **Round robin, y esto se oye.** Cada instrumento trae dos grabaciones del mismo golpe y se
 * van alternando. Un redoble con la misma muestra repetida suena a máquina de escribir,
 * porque en la realidad no hay dos golpes idénticos jamás. Con dos alterna lo justo para
 * sonar a alguien golpeando, y es la diferencia entre una percusión que se escucha y una que
 * cansa a los diez segundos.
 */

/** Los diez del kit. Son los que hay en un aula de Primaria, no los de una batería de rock. */
export const KIT = [
  'bombo',
  'caja',
  'tom',
  'bongo',
  'charles',
  'plato',
  'pandereta',
  'claves',
  'cajachina',
  'triangulo',
] as const;

export type Golpe = (typeof KIT)[number];

/** Cuántas grabaciones distintas hay de cada golpe. */
const REPETICIONES = 2;

export class Percusion {
  private buffers = new Map<string, AudioBuffer[]>();
  private turno = new Map<string, number>();
  private salida: GainNode | null = null;

  /**
   * @param golpes qué instrumentos cargar. Se cargan solo los que la actividad use: el kit
   *        entero son trescientos kilobytes y una actividad de dos sonidos no debe pagarlos.
   */
  constructor(private golpes: readonly Golpe[] = KIT) {}

  async cargar(): Promise<void> {
    const ctx = obtenerContexto();
    this.salida = ctx.createGain();
    this.salida.gain.value = 0.85;
    this.salida.connect(ctx.destination);

    await Promise.all(
      this.golpes.map(async (nombre) => {
        const versiones: AudioBuffer[] = [];
        for (let i = 1; i <= REPETICIONES; i++) {
          try {
            const datos = await cargarBinario(`/audio/muestras/percusion/${nombre}-${i}.opus`);
            versiones.push(await ctx.decodeAudioData(datos));
          } catch {
            // Si falta una repetición se sigue con la otra: perder el round robin es peor
            // que perder el instrumento, pero perder el instrumento es peor todavía.
          }
        }
        if (versiones.length) this.buffers.set(nombre, versiones);
      }),
    );
  }

  get cargados(): Golpe[] {
    return this.golpes.filter((g) => this.buffers.has(g));
  }

  /**
   * @param cuando instante del `AudioContext`. Sin él, ahora mismo.
   *
   * Sin envolvente de caída: un golpe de percusión ya trae la suya grabada, y recortarlo
   * con una rampa lo dejaría a medias. Se deja sonar entero, que es lo que hace un
   * instrumento de verdad.
   */
  golpear(nombre: Golpe, cuando?: number, volumen = 1): void {
    const ctx = obtenerContexto();
    const versiones = this.buffers.get(nombre);
    if (!versiones?.length || !this.salida) return;

    const i = (this.turno.get(nombre) ?? 0) % versiones.length;
    this.turno.set(nombre, i + 1);

    const fuente = ctx.createBufferSource();
    fuente.buffer = versiones[i]!;
    const g = ctx.createGain();
    g.gain.value = volumen;
    fuente.connect(g).connect(this.salida);
    fuente.start(cuando ?? ctx.currentTime);
  }
}
