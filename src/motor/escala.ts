import { aMidi } from '@/audio/sampler';

/**
 * Tonos y semitonos, y cómo se construye una escala.
 *
 * **La idea que hay que enseñar, y por qué cuesta.** Una escala mayor no es «siete notas
 * seguidas»: es un **patrón de distancias** —tono, tono, semitono, tono, tono, tono,
 * semitono— que suena igual empiece donde empiece. Un niño que solo ha tocado teclas blancas
 * cree que do-re-mi-fa son cuatro pasos iguales, y no lo son: mi-fa es la mitad que los
 * otros. Eso no se ve en el pentagrama, donde las cuatro notas están igual de separadas.
 * **Se ve en el piano**, porque entre mi y fa no hay tecla negra.
 *
 * De ahí que esta actividad enlace las dos cosas: el pentagrama dice cómo se escribe y el
 * teclado dice cuánto mide. Ninguno de los dos lo explica solo.
 */

/** Distancias de la escala mayor, en semitonos. Es el patrón, y es lo que se aprende. */
export const MAYOR = [2, 2, 1, 2, 2, 2, 1] as const;

/** Y la menor natural, que cambia dónde caen los semitonos y por eso suena distinta. */
export const MENOR = [2, 1, 2, 2, 1, 2, 2] as const;

export type Distancia = 'tono' | 'semitono';

/** Un semitono es la distancia más pequeña que hay entre dos teclas contiguas. */
export function distancia(a: string, b: string): Distancia | null {
  const salto = Math.abs(aMidi(b) - aMidi(a));
  if (salto === 1) return 'semitono';
  if (salto === 2) return 'tono';
  return null;
}

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function desdeMidi(midi: number): string {
  return `${NOMBRES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * Las ocho notas de una escala a partir de su tónica.
 *
 * Ocho y no siete: la octava se incluye porque **es la que cierra el patrón**. Sin ella, el
 * último semitono —el que lleva de si a do— no aparece, y ese es justamente el que hace que
 * una escala mayor suene a que ha terminado.
 */
export function escalaDesde(tonica: string, patron: readonly number[] = MAYOR): string[] {
  let midi = aMidi(tonica);
  const notas = [desdeMidi(midi)];
  for (const paso of patron) {
    midi += paso;
    notas.push(desdeMidi(midi));
  }
  return notas;
}

/** Las distancias entre notas consecutivas de una secuencia. */
export function distanciasDe(notas: string[]): Array<Distancia | null> {
  return notas.slice(1).map((n, i) => distancia(notas[i]!, n));
}

/**
 * ¿Esta secuencia es una escala mayor?
 *
 * Se compara el **patrón de distancias**, no las notas. Es lo que hace que un do mayor y un
 * sol mayor den los dos verdadero: son la misma escala empezada en otro sitio, que es
 * exactamente lo que hay que entender.
 */
export function esEscalaMayor(notas: string[]): boolean {
  if (notas.length !== MAYOR.length + 1) return false;
  return notas.slice(1).every((n, i) => aMidi(n) - aMidi(notas[i]!) === MAYOR[i]);
}

/**
 * Dónde caen los semitonos de una escala, contando grados desde la tónica.
 *
 * En la mayor son el tercero y el séptimo, siempre. Poder decirlo sin mirar las notas es la
 * señal de que se ha entendido que la escala es un patrón y no una lista.
 */
export function gradosConSemitono(patron: readonly number[] = MAYOR): number[] {
  return patron.map((d, i) => (d === 1 ? i + 1 : -1)).filter((i) => i > 0);
}
