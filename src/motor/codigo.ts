/**
 * El código corto de una actividad: tres cifras, para nombrarla y buscarla.
 *
 * Lo pidió el autor el 2026-09-10: «pon un número o código corto a cada actividad para
 * identificarlas mejor». No es un campo más del JSON: **sale del identificador**, que ya
 * lleva la etapa y un número único dentro de ella, así que no hay que mantener dos cosas.
 *
 *   inf-23-sube-o-baja  → 023      (Infantil: centenar 0)
 *   c1-07-canta-la-nota → 107      (1.º y 2.º: centenar 1)
 *   c2-05-…             → 205      (3.º y 4.º: centenar 2)
 *   c3-41-…             → 341      (5.º y 6.º: centenar 3)
 *   tr-05-piano         → 905      (el Taller: centenar 9, lejos de las etapas)
 *
 * La primera cifra dice la etapa de un vistazo, y el número es el mismo que ya se usa en
 * las claves de texto (`actividad.c107.consigna`). Un test comprueba que ningún código se
 * repite y que todos tienen tres cifras.
 */
const CENTENAR: Record<string, string> = { inf: '0', c1: '1', c2: '2', c3: '3', tr: '9' };

export function codigoDe(id: string): string {
  const m = /^(inf|c1|c2|c3|tr)-(\d{1,2})(?:-|$)/.exec(id);
  if (!m) return '';
  return `${CENTENAR[m[1]!]}${m[2]!.padStart(2, '0')}`;
}
