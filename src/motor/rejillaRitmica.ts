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
  /**
   * Instante en que empieza cada SÍLABA, en pulsos. Uno por sílaba escrita.
   *
   * No es lo mismo que `golpes` y confundirlos fue un fallo real: «ti-ti» es **una** sílaba
   * con **dos** golpes, así que en `ta ti-ti ta ta` hay cuatro sílabas y cinco golpes. El
   * cursor que recorre el patrón se movía con el índice del golpe sobre una lista de
   * sílabas, de modo que a partir del primer «ti-ti» iluminaba la casilla equivocada y se
   * salía del final. Quien lo mirara veía el ritmo mal escrito sin que nada fallara.
   */
  inicios: number[];
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
  const inicios: number[] = [];
  let pulso = 0;

  for (const s of silabas) {
    const def = SILABAS[s];
    if (!def) {
      throw new Error(
        `Sílaba rítmica desconocida: «${s}». Conocidas: ${silabasConocidas().join(', ')}`,
      );
    }
    inicios.push(pulso);
    for (const g of def.golpes) golpes.push(pulso + g);
    pulso += def.pulsos;
  }

  return { golpes, inicios, pulsos: pulso };
}

/**
 * Una casilla por cada cosa que se ve en el patrón: cada golpe, y cada silencio.
 *
 * **Por qué el silencio también cuenta.** La fila de puntos de «tocar a tiempo» se construía
 * solo con los golpes, así que en `ta sh ta sh` enseñaba dos puntos para cuatro pulsos y los
 * silencios desaparecían — justo lo que esa actividad enseña. `Cuerpo.tsx` ya lo tenía
 * resuelto al revés: «un hueco vacío no se distingue de "aquí no toca esta zona", y el
 * silencio hay que contarlo igual que un golpe».
 *
 * Una sílaba con varios golpes da varias casillas —`ti-ti` da dos— y una sin ninguno da una
 * sola, la del silencio. Así cada sílaba de arriba se corresponde con lo que hay debajo.
 *
 * `golpe` es el índice dentro de `golpes`, que es lo que permite saber si esa casilla se ha
 * acertado; en un silencio es `null`, y una casilla sin golpe no se enciende nunca.
 */
export interface CasillaRitmica {
  /** En qué pulso cae, desde el principio del patrón. */
  pulso: number;
  /** Su posición en `golpes`, o `null` si es un silencio. */
  golpe: number | null;
}

export function casillasDesdeSilabas(silabas: string[]): CasillaRitmica[] {
  const casillas: CasillaRitmica[] = [];
  let pulso = 0;
  let golpe = 0;

  for (const s of silabas) {
    const def = SILABAS[s];
    if (!def) {
      throw new Error(
        `Sílaba rítmica desconocida: «${s}». Conocidas: ${silabasConocidas().join(', ')}`,
      );
    }
    if (def.golpes.length === 0) {
      casillas.push({ pulso, golpe: null });
    } else {
      for (const g of def.golpes) {
        casillas.push({ pulso: pulso + g, golpe });
        golpe += 1;
      }
    }
    pulso += def.pulsos;
  }

  return casillas;
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

/**
 * Despliega el patrón a partir del **primer golpe del niño**, no de un reloj externo.
 *
 * Es la diferencia entre pedir «repite este ritmo» y pedir «repite este ritmo empezando
 * exactamente aquí». Son dos habilidades, y medirlas juntas hacía que fallar la entrada
 * arruinara todo lo demás aunque el ritmo fuera perfecto.
 *
 * El primer instante devuelto es siempre el propio golpe: no puede estar desplazado
 * respecto a sí mismo. Lo que queda por evaluar —y lo único que tiene sentido evaluar en
 * este modelo— es el resto.
 *
 * **Y esto vuelve innecesaria la compensación de latencia.** El retardo de salida desplaza
 * por igual al primer golpe y a los demás, así que se cancela solo. Sigue haciendo falta
 * allí donde se compara contra un reloj externo, como en el musicograma.
 *
 * @param primerGolpeMs instante del primer golpe, en el reloj del `AudioContext`
 */
export function anclarEn(
  rejilla: RejillaRitmica,
  primerGolpeMs: number,
  bpm: number,
): number[] {
  const msPorPulso = 60000 / bpm;
  const primero = rejilla.golpes[0] ?? 0;
  return rejilla.golpes.map((g) => primerGolpeMs + (g - primero) * msPorPulso);
}
