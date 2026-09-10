/**
 * Cuándo suena cada nota de un mapa (tipo «seguir»).
 *
 * Un mapa tiene casillas —sílabas o bloques— y, si trae `notas`, puede escribirlas de dos
 * maneras: **una por casilla** (la canción con pictogramas: un dibujo, una nota, aunque el
 * dibujo dure dos pulsos) o **una por pulso** (la forma de una obra: cuatro bloques de
 * dieciséis pulsos y sesenta y cuatro notas, con `null` donde no empieza nota). Se
 * distingue por la cuenta: tantas notas como casillas, o tantas como pulsos.
 *
 * Es una regla de producto y vive aquí, con su test, porque estuvo mal en el componente:
 * solo existía la primera lectura, y un mapa de sesenta y cuatro pulsos con cuatro bloques
 * sonaba cuatro notas separadas cinco segundos. El autor lo llamó «infumable» el
 * 2026-09-11, y tenía razón: era el Preludio de Bach a una nota cada cinco segundos.
 */
export interface NotaProgramada {
  nota: string;
  /** Milisegundos desde el principio de la vuelta. */
  ms: number;
}

export function notasDelMapa(
  notas: ReadonlyArray<string | null | undefined> | undefined,
  desfasesDeCasilla: readonly number[],
  msPorPulso: number,
): NotaProgramada[] {
  if (!notas) return [];
  if (notas.length === desfasesDeCasilla.length) {
    return desfasesDeCasilla.flatMap((ms, i) => (notas[i] ? [{ nota: notas[i]!, ms }] : []));
  }
  return notas.flatMap((nota, i) => (nota ? [{ nota, ms: i * msPorPulso }] : []));
}
