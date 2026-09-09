import { obtenerContexto, registrarFuente, salidaMaestra } from './AudioEngine';
import { cargarBinario } from '@/datos/cargar';

/**
 * Los cuatro sonidos de la percusión corporal.
 *
 * **El orden es el que es y no es arbitrario.** De pitos a pies es a la vez el orden de
 * altura del **sonido** —de más agudo a más grave— y el de altura en el **cuerpo** —de las
 * manos arriba a los pies en el suelo—. Las dos escalas coinciden, y esa coincidencia es lo
 * que hace que un niño entienda el dibujo sin que se lo expliquen.
 *
 * **Lo que suena aquí es una señal, no un instrumento.** El sonido de verdad lo hace el niño
 * con su cuerpo; el altavoz solo dice cuál toca y cuándo, como un director. Por eso se acepta
 * que tres de los cuatro estén sintetizados —ver `tools/muestras-cuerpo.py`— cuando para la
 * voz no se aceptó: allí el sonido **era** lo que había que reconocer.
 *
 * **Y la notación es nuestra.** El método BAPNE® está registrado y tiene copyright, así que
 * su notación, su terminología y sus secuencias no se copian. Los cuatro sonidos sí son de
 * todos: están en el Orff-Schulwerk desde los años treinta y en cualquier patio desde antes.
 */

export const ZONAS = ['pitos', 'palmas', 'muslos', 'pies'] as const;
export type Zona = (typeof ZONAS)[number];

/** Grabaciones distintas del mismo golpe, para que un patrón repetido no suene a máquina. */
const REPETICIONES = 2;

export class SonidosDelCuerpo {
  private buffers = new Map<Zona, AudioBuffer[]>();
  private turno = new Map<Zona, number>();
  private salida: GainNode | null = null;

  async cargar(): Promise<void> {
    const ctx = obtenerContexto();
    this.salida = ctx.createGain();
    // Más bajo que un instrumento: esto acompaña a lo que hace el niño, no compite con ello.
    this.salida.gain.value = 0.7;
    this.salida.connect(salidaMaestra());

    await Promise.all(
      ZONAS.map(async (zona) => {
        const versiones: AudioBuffer[] = [];
        for (let i = 1; i <= REPETICIONES; i++) {
          try {
            const datos = await cargarBinario(`/audio/muestras/cuerpo/${zona}-${i}.opus`);
            versiones.push(await ctx.decodeAudioData(datos));
          } catch {
            // Perder una repetición es perder el round robin; perder la zona sería peor.
          }
        }
        if (versiones.length) this.buffers.set(zona, versiones);
      }),
    );
  }

  golpear(zona: Zona, cuando?: number): void {
    const ctx = obtenerContexto();
    const versiones = this.buffers.get(zona);
    if (!versiones?.length || !this.salida) return;

    const i = (this.turno.get(zona) ?? 0) % versiones.length;
    this.turno.set(zona, i + 1);

    const fuente = ctx.createBufferSource();
    fuente.buffer = versiones[i]!;
    fuente.connect(this.salida);
    registrarFuente(fuente);
    fuente.start(cuando ?? ctx.currentTime);
  }
}
