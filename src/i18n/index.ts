import es from './es.json';

const diccionarios: Record<string, Record<string, string>> = { es };
let idioma = 'es';

export function ponerIdioma(codigo: string) {
  if (diccionarios[codigo]) idioma = codigo;
}

/**
 * Ningún texto vive en un componente. Es lo que convierte «traducir a valenciano»
 * en una tanda de trabajo en vez de en un refactor.
 */
export function t(clave: string): string {
  return diccionarios[idioma]?.[clave] ?? diccionarios.es?.[clave] ?? clave;
}

/**
 * ¿Hay traducción para esta clave?
 *
 * `t()` devuelve la clave cuando no encuentra nada, que está bien para que un texto perdido
 * se vea en pantalla y se arregle. Pero hay sitios que necesitan decidir ANTES: la ficha
 * imprimible cae a la guía por tipo de actividad cuando la actividad no trae la suya, y sin
 * esto imprimiría literalmente «ficha.tipo.karaoke.refuerzo» en un papel.
 */
export function existe(clave: string): boolean {
  return Boolean(diccionarios[idioma]?.[clave] ?? diccionarios.es?.[clave]);
}
