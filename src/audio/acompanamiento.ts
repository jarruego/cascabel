import { obtenerContexto } from './AudioEngine';
import { Sampler } from './sampler';
import { samplerPara } from './instrumentos';
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

export interface Vuelta {
  /** Segundos, desde el comienzo de la vuelta, en que entra el bordón. */
  bordon: number[];
  percusion: Array<{ golpe: Golpe; segundos: number }>;
  /** Lo que dura la vuelta entera, en segundos. */
  duracion: number;
}

/**
 * Una vuelta del bucle, en segundos desde su comienzo.
 *
 * **La usa el planificador de aquí abajo**, y eso es lo que hace que valga la pena
 * probarla. La primera versión calculaba los instantes dos veces —una en esta función,
 * para el test, y otra dentro de `planificar()`— y eso no es un test: es una segunda
 * implementación que va por su cuenta y que puede estar de acuerdo consigo misma mientras
 * lo que suena está mal.
 *
 * Es la parte que se equivoca **en silencio**: un bordón que entra medio pulso tarde no da
 * ningún error, solo suena mal, y quien lo oiga pensará que la actividad es así.
 */
export function instantesDeVuelta(patron: Patron): Vuelta {
  const porPulso = 60 / patron.tempo;
  return {
    // Un bordón por vuelta: entra en el primer pulso y dura toda la vuelta. Uno por pulso
    // lo convertiría en un ostinato, que es otra cosa y tapa lo que toca el niño.
    bordon: patron.bordon ? [0] : [],
    percusion: (patron.percusion ?? []).map((p) => ({
      golpe: p.golpe,
      segundos: p.pulso * porPulso,
    })),
    duracion: patron.pulsosPorVuelta * porPulso,
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
      const s = samplerPara(this.patron.instrumento ?? 'marimba');
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
    // Los instantes salen de `instantesDeVuelta`, la misma función que prueba el test. Es
    // la única forma de que el test diga algo sobre lo que de verdad suena.
    const vuelta = instantesDeVuelta(this.patron);

    while (this.siguienteVuelta < ctx.currentTime + PROGRAMAR_S) {
      const inicio = this.siguienteVuelta;

      if (this.patron.bordon && this.sampler) {
        const fundamental = transponer(this.patron.bordon, this.transporte);
        for (const s of vuelta.bordon) {
          // Tónica y quinta a la vez, sonando toda la vuelta. Sin tercera: es lo que hace
          // que ninguna nota de la pentatónica pueda chocar.
          this.sampler.tocar(fundamental, inicio + s, vuelta.duracion, 0.5);
          this.sampler.tocar(transponer(fundamental, QUINTA), inicio + s, vuelta.duracion, 0.42);
        }
      }

      for (const g of vuelta.percusion) {
        this.percusion?.golpear(g.golpe, inicio + g.segundos, 0.7);
      }

      this.siguienteVuelta += vuelta.duracion;
      this.vuelta += 1;
    }

    this.temporizador = window.setTimeout(this.planificar, LOOKAHEAD_MS);
  };
}
