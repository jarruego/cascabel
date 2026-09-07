import { calidadDe, evaluarRitmo, type EvaluacionRitmica } from './evaluacion';
import type { Carril, Etapa } from '@/config';

/**
 * El eco: comparar **dos ejecuciones entre sí**, no una contra un modelo.
 *
 * Todo lo demás en la aplicación compara al niño con una rejilla que decidimos nosotros.
 * Aquí no hay rejilla: uno de los dos propone un ritmo y el otro lo repite, y lo que se mide
 * es cuánto se parecen. Eso cambia dos cosas de fondo:
 *
 *  - **No hay respuesta correcta previa.** El modelo lo pone un niño, con sus imprecisiones,
 *    y esas imprecisiones son ahora parte del modelo. Es lo que pasa en un aula de verdad
 *    cuando el maestro palmea y los niños repiten.
 *  - **El resultado no es de uno de los dos.** `CLAUDE.md` §4 prohíbe las clasificaciones
 *    entre niños, así que lo que se dice es «os habéis parecido mucho», nunca quién lo hizo
 *    mejor. La medida es de la pareja.
 *
 * **Los dos se anclan a su primer golpe.** Nadie empieza a la vez que el otro y no tiene por
 * qué: lo que se repite es el ritmo, no el momento de arrancar. Ver `anclarEn()` en
 * `rejillaRitmica.ts`, que hace lo mismo contra una rejilla.
 *
 * **Y hay un caso que merece nombre propio: el mismo ritmo más rápido o más lento.** Un niño
 * que repite el patrón entero acelerado un 20 % lo ha entendido —ha oído la *forma*— y
 * decirle que ha fallado sería mentirle. Se detecta buscando el factor de velocidad que
 * mejor encaja y comprobando si con él sí cuadra.
 *
 * > **PENDIENTE DE REVISIÓN PEDAGÓGICA.** Que un eco a otra velocidad cuente como bueno es
 * > un criterio, no un hecho: en un aula de conservatorio no lo sería. Aquí se ha elegido
 * > que sí, porque a estas edades reconocer la forma rítmica va antes que sostener el tempo,
 * > y porque la alternativa —marcarlo como fallo— desanima justo a quien lo ha entendido.
 * > Se informa aparte, así que el maestro ve las dos cosas.
 */

export interface ResultadoEco {
  /** Cuántos golpes hizo cada uno. Si no coinciden, es lo primero que hay que decir. */
  golpesPrimero: number;
  golpesSegundo: number;
  /** La comparación golpe a golpe, ya anclada. */
  evaluacion: EvaluacionRitmica;
  /**
   * Factor de velocidad del segundo respecto del primero: 1 es igual, 1,2 es un 20 % más
   * rápido. `null` cuando no hay bastantes golpes para estimarlo.
   */
  velocidad: number | null;
  /** El mismo patrón, pero a otra velocidad. Es un acierto, y de los buenos. */
  mismoRitmoOtraVelocidad: boolean;
  /** Se parecen lo bastante como para decir que sí. */
  seParecen: boolean;
}

/** Traslada una serie de instantes para que el primero sea 0. */
export function anclar(instantesMs: number[]): number[] {
  const primero = instantesMs[0];
  if (primero === undefined) return [];
  return instantesMs.map((m) => m - primero);
}

/**
 * A partir de cuánta diferencia de velocidad se considera «otra velocidad» y no ruido.
 *
 * Un 8 % a 100 ppm son ocho pulsos por minuto, que ya se oye. Por debajo de eso, la
 * diferencia cabe dentro de la imprecisión normal de un niño y llamarlo «otro tempo» sería
 * inventarse una explicación.
 */
const UMBRAL_VELOCIDAD = 0.08;

export function compararEco(
  primeroMs: number[],
  segundoMs: number[],
  quien: Carril | Etapa,
): ResultadoEco {
  const a = anclar(primeroMs);
  const b = anclar(segundoMs);

  const base: Pick<ResultadoEco, 'golpesPrimero' | 'golpesSegundo'> = {
    golpesPrimero: a.length,
    golpesSegundo: b.length,
  };

  // Con menos de dos golpes no hay ritmo que comparar: hay un golpe.
  if (a.length < 2 || b.length < 2) {
    return {
      ...base,
      evaluacion: evaluarRitmo(a, b, quien),
      velocidad: null,
      mismoRitmoOtraVelocidad: false,
      seParecen: false,
    };
  }

  const evaluacion = evaluarRitmo(a, b, quien);
  const bienDirecto = evaluacion.aciertos === a.length && a.length === b.length;

  /*
    La velocidad se estima con la duración total y no con el hueco medio: si el segundo se
    saltó un golpe en medio, el hueco medio sale disparado y la duración total apenas se
    entera. Es la estimación más robusta que se puede hacer con dos series cortas.
  */
  const duracionA = a[a.length - 1]!;
  const duracionB = b[b.length - 1]!;
  const velocidad = duracionA > 0 ? duracionA / duracionB : null;

  let mismoRitmoOtraVelocidad = false;
  if (
    !bienDirecto &&
    velocidad !== null &&
    Math.abs(velocidad - 1) > UMBRAL_VELOCIDAD &&
    a.length === b.length
  ) {
    // Se estira el segundo hasta la duración del primero y se vuelve a comparar. Si así
    // cuadra, el patrón estaba bien: lo que cambió fue el tempo.
    const estirado = b.map((m) => m * velocidad);
    const conEscala = evaluarRitmo(a, estirado, quien);
    mismoRitmoOtraVelocidad = conEscala.aciertos === a.length;
  }

  return {
    ...base,
    evaluacion,
    velocidad,
    mismoRitmoOtraVelocidad,
    seParecen: bienDirecto || mismoRitmoOtraVelocidad,
  };
}

/**
 * Qué decirles, en clave de texto.
 *
 * Se saca aquí y no en el componente porque es la parte con criterio: el orden en que se
 * comprueban los casos **es** la decisión pedagógica. Primero lo que se ha hecho bien.
 */
export function mensajeEco(r: ResultadoEco, quien: Carril | Etapa): string {
  if (r.golpesSegundo === 0) return 'eco.nadaSegundo';
  if (r.mismoRitmoOtraVelocidad) {
    // `velocidad` es duracionPrimero / duracionSegundo: si el segundo tarda MENOS, el
    // cociente pasa de uno. Lo tuve al revés y lo cazó el test, que es para lo que está.
    return r.velocidad !== null && r.velocidad > 1 ? 'eco.igualMasRapido' : 'eco.igualMasLento';
  }
  if (r.seParecen) return 'eco.iguales';
  if (r.golpesSegundo < r.golpesPrimero) return 'eco.faltanGolpes';
  if (r.golpesSegundo > r.golpesPrimero) return 'eco.sobranGolpes';
  // Mismo número de golpes y no cuadran: el reparto es otro. Es el caso interesante y el
  // único donde conviene decir «escuchad los dos otra vez».
  // Un golpe sin pareja tiene `errorMs` a null, y eso ES el peor caso, no la ausencia de
  // error: darle un cero lo convertia en «perfecto» y el mensaje salia al reves.
  const hayFuera = r.evaluacion.emparejados.some(
    (e) => e.errorMs === null || calidadDe(e.errorMs, quien) === 'fuera',
  );
  return hayFuera ? 'eco.otroReparto' : 'eco.casi';
}
