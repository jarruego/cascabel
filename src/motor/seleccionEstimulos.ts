/**
 * Qué estímulos se hacen en una vuelta de una actividad de elección.
 *
 * El autor lo pidió el 2026-09-12: «quizás diez sean muchas; creo recordar que pusimos de
 * máximo cinco». No había tope: había actividades de seis, ocho, diez y doce preguntas
 * seguidas, y un niño de seis años no aguanta doce «¿cuál es más aguda?». Pero recortar el
 * JSON tiraría contenido bueno. Lo que se hace es **tener un banco y sacar cinco cada
 * vez**: la actividad dura lo que tiene que durar, y «otra vez» no repite las mismas.
 *
 * Reglas, con test:
 *  - Con cinco o menos, se hacen todas y en su orden: el autor las escribió así.
 *  - Con más, se sacan cinco **repartidas entre las respuestas**: de «sube» y «baja» salen
 *    tres y dos, no cinco «sube». Si no, una vuelta podría no enseñar una de las opciones.
 *  - Deterministas para una semilla: el mismo número da la misma vuelta, que es lo que
 *    permite probarlo y lo que permitiría, mañana, repetir una vuelta concreta.
 */
export const MAX_POR_VUELTA = 5;

/** Generador pequeño y determinista (mulberry32): para barajar igual en el test que en la app. */
function azarDe(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajado<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

/**
 * Una lista barajada en la que ninguna entrada repite a la anterior, para las rondas que
 * piden cada cosa varias veces: «coloca la nota» pedía sol, la, si, do, sol, la, si, do,
 * en orden —«están en orden y es muy fácil acertar», dijo el autor—. Con pocas entradas
 * distintas no siempre se puede evitar la repetición; entonces se deja como salga.
 */
export function barajarSinRepetir<T>(lista: T[], semilla: number): T[] {
  const azar = azarDe(semilla);
  for (let intento = 0; intento < 20; intento++) {
    const b = barajado(lista, azar);
    if (b.every((x, i) => i === 0 || x !== b[i - 1])) return b;
  }
  return barajado(lista, azar);
}

export function seleccionarEstimulos<T extends { respuesta?: string }>(
  estimulos: T[],
  semilla: number,
  maximo = MAX_POR_VUELTA,
): T[] {
  if (estimulos.length <= maximo) return estimulos;
  const azar = azarDe(semilla);

  // Por respuesta, cada grupo barajado, y los grupos en orden barajado.
  const grupos = new Map<string, T[]>();
  for (const e of estimulos) {
    const clave = e.respuesta ?? '';
    grupos.set(clave, [...(grupos.get(clave) ?? []), e]);
  }
  const colas = barajado([...grupos.values()], azar).map((g) => barajado(g, azar));

  // Uno de cada grupo por turno hasta llegar al máximo: es lo que reparte las respuestas.
  const elegidos: T[] = [];
  let ronda = 0;
  while (elegidos.length < maximo) {
    let alguno = false;
    for (const cola of colas) {
      const e = cola[ronda];
      if (e === undefined) continue;
      alguno = true;
      elegidos.push(e);
      if (elegidos.length >= maximo) break;
    }
    if (!alguno) break;
    ronda += 1;
  }
  // Y el orden final barajado: si no, siempre empezaría por el primer grupo.
  return barajado(elegidos, azar);
}
