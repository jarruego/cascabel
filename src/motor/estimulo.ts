/**
 * Qué suena en un estímulo de «elección», dicho como una lista de eventos en el tiempo.
 *
 * Hasta el 2026-09-10 un estímulo solo podía ser un fichero de audio o un texto. Eso deja
 * fuera casi todo el lenguaje musical: un intervalo son dos notas, un dictado de figuras son
 * cuatro clics con duraciones, «forte» y «piano» son la misma nota a dos volúmenes, y un vals
 * se distingue de una marcha por dónde cae el acento. Nada de eso necesita un fichero: se
 * describe en el JSON y se toca con lo que ya hay —el sampler, el clic y el kit de
 * percusión—, que es lo que hace que escribir cuarenta actividades de lenguaje sea escribir
 * cuarenta JSON y no cuarenta grabaciones.
 *
 * Este fichero es puro: convierte la descripción en instantes y no toca el audio. Lo que
 * suena está en `sonarEstimulo.ts`, y esto se prueba sin altavoz.
 */

export interface Estimulo {
  /** Fichero de audio, relativo a `/audio/`. */
  audio?: string;
  /** Un caso escrito, como clave de i18n. Lo usan las actividades de ética. */
  texto?: string;
  /** Notas en notación científica, una detrás de otra. La cadena vacía es un silencio. */
  notas?: string[];
  /** Pulsos que dura cada nota. Por defecto, uno. */
  duraciones?: number[];
  /** De 0 a 1. Es la dinámica: `piano` es 0,25 y `forte` es 1. */
  volumen?: number;
  /** Volumen nota a nota, para un crescendo o un diminuendo. Manda sobre `volumen`. */
  volumenes?: number[];
  /** Ligado (cada nota dura hasta la siguiente) o picado (cada nota, un instante). */
  articulacion?: 'legato' | 'staccato';
  /**
   * Duraciones en pulsos, marcadas con el clic. Es lo que hace sonar una figura. Un número
   * negativo es un silencio de esa duración: `[1, -1, 1, 1]` es negra, silencio, negra, negra.
   */
  ritmo?: number[];
  /** Índices del ritmo que llevan acento: es lo que distingue un dos por cuatro de un tres. */
  acentos?: number[];
  /**
   * Golpes del kit de percusión, uno por celda: `bombo`, `caja`, `charles`... Varios en la
   * misma celda van con `+` («bombo+charles»), y la celda vacía es un silencio.
   */
  patron?: string[];
  /** Pulsos que dura cada celda del patrón. Por defecto, uno; medio para corcheas. */
  celda?: number;
  /** Pulsos por minuto. Si no se dice, el de la actividad. */
  tempo?: number;
  respuesta: string;
}

export type Evento =
  | { en: number; tipo: 'nota'; nota: string; duracion: number; volumen: number }
  | { en: number; tipo: 'clic'; acentuado: boolean }
  | { en: number; tipo: 'golpe'; golpe: string; acentuado: boolean };

/** Lo que dura un picado, en segundos: lo justo para que se oiga el ataque y nada más. */
const STACCATO_S = 0.12;

/** ¿Hay algo que oír? Un caso escrito no suena, y entonces no hay botón de repetir. */
export function suena(e: Estimulo): boolean {
  return Boolean(e.audio || e.notas?.length || e.ritmo?.length || e.patron?.length);
}

/**
 * Los eventos del estímulo, en segundos desde el principio.
 *
 * Un mismo estímulo puede llevar notas y ritmo a la vez —una melodía con su pulso debajo—
 * y entonces se suman. Lo que no se mezcla es el fichero de audio: si hay `audio`, lo demás
 * se ignora, porque un fichero ya es el sonido entero.
 */
export function eventosDe(e: Estimulo, tempoPorDefecto = 84): Evento[] {
  const bpm = e.tempo ?? tempoPorDefecto;
  const pulso = 60 / bpm;
  const eventos: Evento[] = [];

  if (e.notas?.length) {
    const volumen = e.volumen ?? 0.85;
    let t = 0;
    e.notas.forEach((nota, i) => {
      const pulsos = e.duraciones?.[i] ?? 1;
      const hueco = pulsos * pulso;
      // Ligado: la nota dura casi hasta la siguiente. Picado: un instante. Sin decir nada,
      // un poco menos que el hueco, que es como suena una nota suelta y sin intención.
      const duracion =
        e.articulacion === 'staccato'
          ? STACCATO_S
          : e.articulacion === 'legato'
            ? hueco * 0.98
            : hueco * 0.8;
      if (nota) {
        eventos.push({ en: t, tipo: 'nota', nota, duracion, volumen: e.volumenes?.[i] ?? volumen });
      }
      t += hueco;
    });
  }

  if (e.ritmo?.length) {
    const acentos = new Set(e.acentos ?? []);
    let t = 0;
    e.ritmo.forEach((pulsos, i) => {
      if (pulsos > 0) eventos.push({ en: t, tipo: 'clic', acentuado: acentos.has(i) });
      t += Math.abs(pulsos) * pulso;
    });
  }

  if (e.patron?.length) {
    const celda = (e.celda ?? 1) * pulso;
    const acentos = new Set(e.acentos ?? []);
    e.patron.forEach((contenido, i) => {
      for (const golpe of contenido.split('+').map((g) => g.trim()).filter(Boolean)) {
        eventos.push({ en: i * celda, tipo: 'golpe', golpe, acentuado: acentos.has(i) });
      }
    });
  }

  return eventos.sort((a, b) => a.en - b.en);
}

/** Cuándo termina de sonar, en segundos. Sirve para saber cuándo se puede volver a pulsar. */
export function duracionDe(e: Estimulo, tempoPorDefecto = 84): number {
  const bpm = e.tempo ?? tempoPorDefecto;
  const pulso = 60 / bpm;
  const notas = (e.notas ?? []).reduce((s, _, i) => s + (e.duraciones?.[i] ?? 1), 0) * pulso;
  const ritmo = (e.ritmo ?? []).reduce((s, p) => s + Math.abs(p), 0) * pulso;
  const patron = (e.patron?.length ?? 0) * (e.celda ?? 1) * pulso;
  return Math.max(notas, ritmo, patron);
}
