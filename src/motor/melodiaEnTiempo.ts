/**
 * De una melodía escrita en pulsos a los instantes en que suena cada nota.
 *
 * La aritmética es trivial; lo que no es trivial es el **margen de entrada**, y por eso esto
 * vive aquí con un test en vez de estar suelto dentro del componente.
 *
 * Sin margen, la melodía arranca en el instante cero y en un musicograma que avanza **la
 * primera nota nace justo encima de la línea del presente**: no se puede anticipar, solo
 * reaccionar, y se falla siempre. La cuenta atrás no lo arregla, porque termina justo cuando
 * la nota ya está ahí. Lo detectó el autor probando, no un test, así que ahora hay un test.
 */

export interface NotaEnPulsos {
  nota: string;
  /** Duración en pulsos: 1 es una negra en 4/4. */
  pulsos: number;
}

/**
 * @param bpm      pulsos por minuto
 * @param entradaS segundos de margen antes de la primera nota
 * @returns instante de ataque de cada nota, en segundos desde el arranque
 */
export function instantesDe(notas: NotaEnPulsos[], bpm: number, entradaS: number): number[] {
  const segundosPorPulso = 60 / bpm;
  let acumulado = entradaS;
  return notas.map((n) => {
    const cuando = acumulado;
    acumulado += n.pulsos * segundosPorPulso;
    return cuando;
  });
}

/** Cuánto dura la melodía entera, contando el margen de entrada. */
export function duracionDe(notas: NotaEnPulsos[], bpm: number, entradaS: number): number {
  const segundosPorPulso = 60 / bpm;
  return entradaS + notas.reduce((total, n) => total + n.pulsos * segundosPorPulso, 0);
}
