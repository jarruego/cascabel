/**
 * Convierte un patrón rítmico en sílabas a una rejilla de instantes.
 *
 * Las sílabas son la notación de Kodály, que es la que un maestro español reconoce y la
 * que un niño de siete años puede decir en voz alta antes de saber leer una corchea:
 * «ta» es negra, «ti-ti» dos corcheas, «ta-a» blanca. Está en `docs/03-CURRICULO.md` como
 * capa de PRÁCTICA, no de currículo: el real decreto nunca nombra una figura.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: el repertorio de sílabas de abajo es el convencional
 * del método Kodály tal como se enseña en España, pero hay variantes regionales («ti-ri-ti-ri»
 * frente a «ta-fa-te-fe» para semicorcheas, por ejemplo). Lo ha fijado un desarrollador.
 */

/** Duración de cada sílaba en pulsos, y cuántos golpes lleva dentro. */
const SILABAS: Record<string, { pulsos: number; golpes: number[] }> = {
  // Negra: un golpe, al principio del pulso.
  ta: { pulsos: 1, golpes: [0] },
  // Dos corcheas: dos golpes, a mitad de pulso.
  'ti-ti': { pulsos: 1, golpes: [0, 0.5] },
  // Blanca: un golpe que dura dos pulsos.
  'ta-a': { pulsos: 2, golpes: [0] },
  // Redonda.
  'ta-a-a-a': { pulsos: 4, golpes: [0] },
  // Cuatro semicorcheas.
  'ti-ri-ti-ri': { pulsos: 1, golpes: [0, 0.25, 0.5, 0.75] },
  // Silencio de negra: ocupa pulso y NO lleva golpe. Es media asignatura.
  sh: { pulsos: 1, golpes: [] },
  // Síncopa: corchea, negra, corchea dentro de dos pulsos. El acento cae donde no toca,
  // que es justo lo que hay que sentir.
  'ti-ta-ti': { pulsos: 2, golpes: [0, 0.5, 1.5] },
  // Contratiempo: silencio en el pulso y golpe en la mitad.
  'sh-ti': { pulsos: 1, golpes: [0.5] },
  // Negra con puntillo más corchea.
  'ta-i-ti': { pulsos: 2, golpes: [0, 1.5] },
};

export interface RejillaRitmica {
  /** Instantes de golpe, en pulsos desde el inicio. */
  golpes: number[];
  /** Duración total en pulsos. */
  pulsos: number;
}

export function silabasConocidas(): string[] {
  return Object.keys(SILABAS);
}

/**
 * @throws si una sílaba no está en el repertorio. Fallar es lo correcto: una sílaba
 *         desconocida significa que el JSON pide un ritmo que no sabemos tocar, y
 *         tocarlo mal sería peor que no tocarlo.
 */
export function rejillaDesdeSilabas(silabas: string[]): RejillaRitmica {
  const golpes: number[] = [];
  let pulso = 0;

  for (const s of silabas) {
    const def = SILABAS[s];
    if (!def) {
      throw new Error(
        `Sílaba rítmica desconocida: «${s}». Conocidas: ${silabasConocidas().join(', ')}`,
      );
    }
    for (const g of def.golpes) golpes.push(pulso + g);
    pulso += def.pulsos;
  }

  return { golpes, pulsos: pulso };
}

/**
 * Pasa la rejilla a milisegundos absolutos.
 *
 * @param inicioMs instante del primer pulso
 * @param bpm      tempo
 * @param latenciaMs latencia que hay que compensar. **Se RESTA de lo esperado**, no se
 *        suma a lo real: el niño oye el clic tarde, así que responde tarde a algo que
 *        para el ordenador ya había pasado. Confundir el signo aquí hace que el error se
 *        duplique en vez de anularse, y no lo detecta nadie mirando el código.
 */
export function aMilisegundos(
  rejilla: RejillaRitmica,
  inicioMs: number,
  bpm: number,
  latenciaMs = 0,
): number[] {
  const msPorPulso = 60000 / bpm;
  return rejilla.golpes.map((g) => inicioMs + g * msPorPulso + latenciaMs);
}
