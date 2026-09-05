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
