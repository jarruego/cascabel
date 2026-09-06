import es from './es.json';

const diccionarios: Record<string, Record<string, string>> = { es };

/**
 * Idioma activo.
 *
 * Es una constante mientras solo haya un diccionario. Había un `ponerIdioma()` para
 * cambiarlo y se quitó en la auditoría del 2026-09-07 por lo que era: código que nadie
 * llamaba. **La estructura multiidioma sí se queda** —el mapa de diccionarios y la búsqueda
 * con respaldo en español—, que es lo que hace que T3.2 sea añadir ficheros y una línea
 * aquí, no un refactor. Guardar el setter «por si acaso» no adelantaba ese trabajo ni un
 * minuto.
 */
const idioma = 'es';

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
