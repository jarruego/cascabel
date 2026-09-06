/**
 * Grabar lo que se toca, y volver a tocarlo.
 *
 * **No se graba audio: se graban los gestos.** Cada nota que se toca deja anotado *qué* fue
 * y *cuándo*, y reproducir es volver a tocar esa lista con el mismo instrumento. La
 * pregunta del autor era si se podía hacer sin complicarse, y la respuesta es que así es
 * más sencillo *y* mejor por cuatro razones:
 *
 *  - **No hay `MediaRecorder` ni micrófono**, así que no hay permiso que pedir, ni riesgo de
 *    grabar la voz de un niño, ni las implicaciones que `docs/08-LEGAL.md` asocia a eso. La
 *    regla 2 del proyecto sigue intacta sin tener que pensarla.
 *  - **Pesa nada.** Una improvisación de un minuto son unas decenas de objetos con dos
 *    números; un WAV del mismo minuto son diez megas.
 *  - **Se reproduce limpio**, sin el ruido de la clase ni el micrófono del portátil por
 *    encima. Lo que suena es lo que el niño tocó, no lo que había en el aula.
 *  - **Se puede transformar.** Al ser notas y no ondas, una grabación se puede volver a
 *    tocar más lenta, más aguda o con otro instrumento sin degradarse. Un audio no.
 *
 * Lo que NO puede hacer, y conviene saberlo: no captura nada que no pase por aquí. Si un
 * niño canta encima mientras toca, eso no se graba. Para eso haría falta audio de verdad, y
 * es una decisión con consecuencias legales que está en el catálogo como C2-13.
 */

export interface EventoTocado {
  /** Notación científica, p. ej. «C4». */
  nota: string;
  /** Milisegundos desde el comienzo de la grabación. */
  ms: number;
  /** Duración en segundos, si el gesto la tenía. */
  duracion?: number;
}

export interface Grabacion {
  eventos: EventoTocado[];
  /** Duración total en milisegundos, incluida la cola de la última nota. */
  duracionMs: number;
}

/** Cola tras la última nota, para que la reproducción no acabe en seco. */
const COLA_MS = 600;

export class GrabadorDeEventos {
  private eventos: EventoTocado[] = [];
  private inicio: number | null = null;

  /** ¿Está grabando ahora mismo? */
  get grabando(): boolean {
    return this.inicio !== null;
  }

  get vacia(): boolean {
    return this.eventos.length === 0;
  }

  /**
   * Empieza a grabar.
   *
   * **El reloj no arranca aquí: arranca con la primera nota.** Si empezara ahora, todo el
   * rato que el niño tarda en decidirse quedaría grabado como silencio inicial, y al
   * reproducir habría que esperarlo otra vez. Es el mismo criterio que en las actividades
   * de ritmo: el primer gesto fija el origen.
   */
  empezar(): void {
    this.eventos = [];
    this.inicio = null;
  }

  /** Anota una nota tocada. Sin efecto si no se está grabando. */
  anotar(nota: string, ahoraMs: number, duracion?: number): void {
    if (this.eventos.length === 0) this.inicio = ahoraMs;
    if (this.inicio === null) return;
    this.eventos.push({ nota, ms: ahoraMs - this.inicio, duracion });
  }

  /** Cierra la grabación y la devuelve. */
  terminar(): Grabacion {
    const eventos = this.eventos;
    this.inicio = null;
    const ultimo = eventos[eventos.length - 1];
    return {
      eventos,
      duracionMs: ultimo ? ultimo.ms + COLA_MS : 0,
    };
  }
}

/**
 * Programa una grabación para que suene desde un instante dado.
 *
 * Se programa **todo de golpe contra el reloj del `AudioContext`**, no con `setTimeout` por
 * nota: el planificador de audio garantiza el instante y `setTimeout` no, y en una
 * reproducción de treinta notas la diferencia se oye como un ritmo que cojea.
 *
 * @param tocar función que suena una nota en un instante del `AudioContext`, en segundos
 * @param desdeSegundos instante del `AudioContext` en que empieza la reproducción
 * @param velocidad 1 es el tempo original; 0,5 la mitad de rápido
 */
export function reproducir(
  grabacion: Grabacion,
  tocar: (nota: string, cuandoSegundos: number, duracion?: number) => void,
  desdeSegundos: number,
  velocidad = 1,
): void {
  const factor = velocidad > 0 ? velocidad : 1;
  for (const e of grabacion.eventos) {
    tocar(e.nota, desdeSegundos + e.ms / 1000 / factor, e.duracion);
  }
}

/**
 * Traslada una grabación en semitonos.
 *
 * Existe porque es prácticamente gratis y abre una actividad entera: tocar algo y oírlo más
 * agudo o más grave es la forma más directa de entender qué es transportar. Con audio
 * grabado esto costaría un procesado; con notas es una suma.
 */
export function transportar(grabacion: Grabacion, semitonos: number): Grabacion {
  const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const mover = (nota: string): string => {
    const m = /^([A-G]#?)(-?\d)$/.exec(nota);
    if (!m) return nota;
    const midi = (Number(m[2]) + 1) * 12 + NOTAS.indexOf(m[1]!) + semitonos;
    return `${NOTAS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  };
  return {
    ...grabacion,
    eventos: grabacion.eventos.map((e) => ({ ...e, nota: mover(e.nota) })),
  };
}
