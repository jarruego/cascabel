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
 *
 * **Con huecos**, si se le pasan valores: `t('tocar.vuelta', { n: 2, total: 3 })` sobre
 * «Vuelta {n} de {total}». Se añadió el 2026-09-09, cuando hubo que decir en cuántas vueltas
 * va una actividad; hasta entonces el único caso lo resolvía un `.replace('{s}', …)` a mano
 * en el componente, que es la misma idea escrita donde no se ve.
 *
 * Los huecos van en el texto y no fuera por una razón de traducción: en otro idioma el
 * número puede ir en otro sitio de la frase, y partirla en trozos aquí lo impediría.
 */
export function t(clave: string, valores?: Record<string, string | number>): string {
  const texto = diccionarios[idioma]?.[clave] ?? diccionarios.es?.[clave] ?? clave;
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (hueco, nombre: string) =>
    nombre in valores ? String(valores[nombre]) : hueco,
  );
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
