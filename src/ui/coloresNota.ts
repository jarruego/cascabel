/**
 * Un color por grado de la escala.
 *
 * No es decoración: es el código de color de los tubos **Boomwhacker**, que es el estándar
 * de facto en las aulas de Primaria y el que una maestra reconoce sin que se lo expliquen.
 * Do rojo, re naranja, mi amarillo, fa verde, sol turquesa, la azul, si morado.
 *
 * **El color nunca informa solo** (`CLAUDE.md` §6). Donde se use esto tiene que haber
 * además el nombre de la nota, su posición, o las dos cosas: en el teclado, la tecla lleva
 * su nombre debajo; en el musicograma, la nota está a su altura en el pentagrama y al
 * acertarla aparece escrita.
 *
 * Vive en `ui/` y no en `motor/` porque es una decisión de presentación: la misma nota se
 * pinta igual la ejecute el tipo de actividad que la ejecute.
 */

const POR_LETRA: Record<string, string> = {
  c: 'vivo-rojo',
  d: 'vivo-naranja',
  e: 'vivo-amarillo',
  f: 'vivo-verde',
  g: 'vivo-turquesa',
  a: 'vivo-azul',
  b: 'vivo-morado',
};

/** Nombre del token CSS del color de una nota, sin el `var()`. */
export function tokenColorDe(nota: string): string {
  return POR_LETRA[nota[0]!.toLowerCase()] ?? 'linea';
}

/** El color listo para meter en un `style`, p. ej. `var(--vivo-rojo)`. */
export function colorDe(nota: string): string {
  return `var(--${tokenColorDe(nota)})`;
}

const LATINO: Record<string, string> = {
  c: 'do',
  d: 're',
  e: 'mi',
  f: 'fa',
  g: 'sol',
  a: 'la',
  b: 'si',
};

/**
 * Nombre de la nota para enseñárselo al niño.
 *
 * En latino (do, re, mi) por defecto, que es la nomenclatura de la escuela española, y en
 * inglés cuando la actividad lo pida. La octava no se muestra: a estas edades «do» es do,
 * y decir «do4» no añade nada que se pueda usar.
 */
export function nombreDe(nota: string, sistema: 'latino' | 'ingles' = 'latino'): string {
  const letra = nota[0]!;
  const base = sistema === 'ingles' ? letra.toUpperCase() : (LATINO[letra.toLowerCase()] ?? letra);
  return nota.includes('#') ? `${base}♯` : base;
}
