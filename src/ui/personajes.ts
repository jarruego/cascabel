/**
 * Los ocho personajes de la metodología cocomusic.
 *
 * Uno por nota, y cada uno con un color, una emoción y una función. **No son decoración**:
 * la progresión que forman —de la seguridad de Dora a la unión de Doby— es la de la
 * metodología, y el orden de esta lista es ese, no el alfabético. El dosier completo, con
 * las poses y los prompts, está en `docs/14-PERSONAJES.md`.
 *
 * Los personajes y sus nombres son de **cocomusic**, no de Cascabel, y no están cubiertos
 * por las licencias del código ni de los contenidos. Ver `TRADEMARK.md`.
 */

export const PERSONAJES = [
  'dora',
  'rex',
  'milo',
  'fara',
  'sol',
  'laia',
  'simon',
  'doby',
] as const;

export type Personaje = (typeof PERSONAJES)[number];

/**
 * Qué personaje es cada nota.
 *
 * Hay dos «do»: **Dora abre y Doby cierra**. Doby no es «otro do», es la octava y el final
 * del recorrido, así que se resuelve por octava y no por letra.
 */
const POR_LETRA: Record<string, Personaje> = {
  c: 'dora',
  d: 'rex',
  e: 'milo',
  f: 'fara',
  g: 'sol',
  a: 'laia',
  b: 'simon',
};

/** Personaje de una nota en notación científica: `C4` → Dora, `C5` → Doby. */
export function personajeDe(nota: string, octavaBase = 4): Personaje | null {
  const m = /^([A-Ga-g])#?(-?\d+)?$/.exec(nota);
  if (!m) return null;
  const letra = m[1]!.toLowerCase();
  const octava = m[2] === undefined ? octavaBase : Number(m[2]);
  if (letra === 'c' && octava > octavaBase) return 'doby';
  return POR_LETRA[letra] ?? null;
}

/**
 * Las poses.
 *
 * Salen de los sitios donde la aplicación enseña un personaje, no de una lista de gestos:
 * `neutro` cuando el personaje **es** una nota, `celebra` al terminar, `anima` tras un
 * intento fallido, y el resto según lo que la actividad esté trabajando.
 */
export const POSES = [
  'neutro',
  'celebra',
  'anima',
  'saluda',
  'busca',
  'palmea',
  'calla',
  'baila',
  'canta',
  'escucha',
] as const;

export type Pose = (typeof POSES)[number];

/**
 * La ruta del dibujo. No comprueba que exista: de eso se encarga el componente, cayendo a
 * `neutro` y, si tampoco está, a no dibujar nada. Nunca un hueco y nunca un error.
 */
export function rutaDe(personaje: Personaje, pose: Pose): string {
  return `/personajes/${personaje}-${pose}.svg`;
}
