/**
 * Cuándo entra el niño en «tocar a tiempo»: tres, dos, uno, **¡ya!**
 *
 * Después del ejemplo hay un compás de entrada, como el que da un director: tres números en
 * tempo y el «¡ya!» en el cuarto pulso. **El ¡ya! ES el primer golpe.** Estaba mal: el ¡ya!
 * caía un pulso antes de la entrada que esperaba el reloj, y la palmada que el niño daba
 * justo con él —que es lo que «¡ya!» significa— se descartaba por llegar en la fase de la
 * cuenta. El autor lo vio el 2026-09-12 en «Palmea el ritmo» (102): «coge el primer tono
 * antes de darle».
 *
 * Los tres instantes salen de aquí, con su test, y el componente solo programa relojes:
 *
 *  - `ventanaDesdeMs`: desde cuándo cuenta un golpe. Medio pulso antes del ¡ya!, porque
 *    entrar un poco antes es lo normal y descartarlo sería castigar al que ha anticipado bien.
 *  - `entradaMs`: el ¡ya!.
 *  - `respondiendoDesdeMs`: cuándo la pantalla cambia a la de responder. Medio pulso después
 *    del ¡ya!, para que se vea. Un golpe entre la ventana y ese cambio cuenta igual: la fase
 *    es lo que se ve, la ventana es lo que vale.
 */

/** Pulsos de entrada entre el ejemplo y la respuesta: un compás, ¡ya! incluido. */
export const CUENTA_PULSOS = 4;

export interface EntradaDeVuelta {
  /** Desde qué número cuenta la cuenta atrás: 3, 2, 1 y el ¡ya!. */
  cuentaDesde: number;
  ventanaDesdeMs: number;
  entradaMs: number;
  respondiendoDesdeMs: number;
}

/** @param finPatronMs instante en que acaba el ejemplo, en el reloj de audio (ms). */
export function entradaDeVuelta(finPatronMs: number, bpm: number): EntradaDeVuelta {
  const msPorPulso = 60000 / bpm;
  const entradaMs = finPatronMs + (CUENTA_PULSOS - 1) * msPorPulso;
  return {
    cuentaDesde: CUENTA_PULSOS - 1,
    ventanaDesdeMs: entradaMs - msPorPulso * 0.5,
    entradaMs,
    respondiendoDesdeMs: entradaMs + msPorPulso * 0.5,
  };
}
