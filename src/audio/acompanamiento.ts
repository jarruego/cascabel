import { obtenerContexto } from './AudioEngine';
import { Sampler } from './sampler';
import { muestrasDe } from './instrumentos';
import { Percusion, type Golpe } from './percusion';

/**
 * Acompañamiento en bucle: lo que suena **debajo** de lo que toca el niño.
 *
 * **Por qué existe.** Una escala pentatónica tiene una propiedad que ninguna otra: sobre un
 * acompañamiento adecuado no hay nota que suene mal. Eso convierte «improvisa» —que a los
 * nueve años puede dar bastante vergüenza— en algo que sale a la primera. Es el mecanismo de
 * todo el método Orff, y sin el acompañamiento no funciona: cinco notas sueltas no suenan a
 * música, suenan a cinco notas.
 *
 * También es lo que un maestro sin piano no tiene. Ocho compases en bucle para que la clase
 * cante encima resuelven media sesión.
 *
 * **Cómo suena, y por qué así.**
 *
 *  - **Bordón** (*bourdon*): la tónica y la quinta a la vez, sostenidas, repitiéndose cada
 *    compás. Es el acompañamiento de Orff por excelencia y tiene una razón técnica, no de
 *    estilo: al no llevar tercera **no dice si es mayor o menor**, y por eso no choca con
 *    ninguna nota de la pentatónica. Un acorde completo sí chocaría.
 *  - **Percusión**: un patrón de golpes por compás, para que haya pulso sin tener que
 *    contarlo.
 *
 * **El planificador es el de siempre** (`CLAUDE.md` §7): un `setInterval` de 25 ms mira
 * cien milisegundos hacia delante y programa con `currentTime`. Nunca se usa `setInterval`
 * para decidir *cuándo suena* algo, solo para decidir cuándo mirar.
 */

export interface Patron {
  /** Pulsos por minuto. */
  tempo: number;
  /** Pulsos que dura una vuelta del bucle. */
  pulsosPorVuelta: number;
  /** Fundamental del bordón, en notación científica. Sin ella no hay bordón. */
  bordon?: string;
  /** Timbre del bordón. */
  instrumento?: string;
  /** Golpes de percusión: qué instrumento y en qué pulso de la vuelta. */
  percusion?: Array<{ golpe: Golpe; pulso: number }>;
}

const LOOKAHEAD_MS = 25;
const PROGRAMAR_S = 0.1;

/** Semitonos de la quinta justa. Es la única distancia que hace falta para un bordón. */
const QUINTA = 7;

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Sube una nota científica un número de semitonos. Devuelve notación científica. */
export function transponer(nota: string, semitonos: number): string {
  const m = /^([A-G]#?)(-?\d+)$/.exec(nota);
  if (!m) return nota;
  const midi = NOTAS.indexOf(m[1]!) + (Number(m[2]) + 1) * 12 + semitonos;
  const octava = Math.floor(midi / 12) - 1;
  return `${NOTAS[((midi % 12) + 12) % 12]}${octava}`;
}

/**
 * Los instantes de una vuelta del bucle, en segundos desde su comienzo.
 *
 * Se saca aparte del reproductor para poder comprobarlo con un test: es la parte que se
 * puede equivocar en silencio, porque un bordón que entra medio pulso tarde no da error,
 * solo suena mal.
 */
export function instantesDe(patron: Patron): { bordon: number[]; percusion: number[] } {
  const porPulso = 60 / patron.tempo;
  return {
    // Un bordón por vuelta: entra en el primer pulso y dura hasta el siguiente.
    bordon: patron.bordon ? [0] : [],
    percusion: (patron.percusion ?? []).map((p) => p.pulso * porPulso),
  };
}

export class Acompanamiento {
  private temporizador: number | null = null;
  private sampler: Sampler | null = null;
  private percusion: Percusion | null = null;
  private siguienteVuelta = 0;
  private vuelta = 0;
  /** Semitonos de transporte, para cambiar de tonalidad sin tocar el patrón. */
  private transporte = 0;

  constructor(private patron: Patron) {}

  get enMarcha(): boolean {
    return this.temporizador !== null;
  }

  transportar(semitonos: number): void {
    this.transporte = semitonos;
  }

  async cargar(): Promise<void> {
    if (this.patron.bordon && !this.sampler) {
      const s = new Sampler(muestrasDe(this.patron.instrumento ?? 'marimba'));
      await s.cargar();
      this.sampler = s;
    }
    const golpes = [...new Set((this.patron.percusion ?? []).map((p) => p.golpe))];
    if (golpes.length && !this.percusion) {
      const p = new Percusion(golpes);
      await p.cargar();
      this.percusion = p;
    }
  }

  arrancar(): void {
    if (this.enMarcha) return;
    this.vuelta = 0;
    this.siguienteVuelta = obtenerContexto().currentTime + 0.15;
    this.planificar();
  }

  parar(): void {
    if (this.temporizador !== null) window.clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private planificar = (): void => {
    const ctx = obtenerContexto();
    const porPulso = 60 / this.patron.tempo;
    const duracionVuelta = this.patron.pulsosPorVuelta * porPulso;

    while (this.siguienteVuelta < ctx.currentTime + PROGRAMAR_S) {
      const inicio = this.siguienteVuelta;

      if (this.patron.bordon && this.sampler) {
        const fundamental = transponer(this.patron.bordon, this.transporte);
        // Tónica y quinta a la vez, sonando toda la vuelta. Sin tercera: es lo que hace
        // que ninguna nota de la pentatónica pueda chocar.
        this.sampler.tocar(fundamental, inicio, duracionVuelta, 0.5);
        this.sampler.tocar(transponer(fundamental, QUINTA), inicio, duracionVuelta, 0.42);
      }

      for (const g of this.patron.percusion ?? []) {
        this.percusion?.golpear(g.golpe, inicio + g.pulso * porPulso, 0.7);
      }

      this.siguienteVuelta += duracionVuelta;
      this.vuelta += 1;
    }

    this.temporizador = window.setTimeout(this.planificar, LOOKAHEAD_MS);
  };
}
