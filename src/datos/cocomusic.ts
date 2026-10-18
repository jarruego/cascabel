import { APP } from '@/config';

/**
 * Qué páginas de cocomusic.es corresponden a una actividad.
 *
 * Los datos los publica cocomusic y los aceptó su propietario uno a uno, pero llegan de
 * otra web: aquí se filtran antes de convertirse en un enlace. Solo pasa lo que apunta a la
 * web del proyecto con una ruta relativa normal; un `//otro.sitio` o un `javascript:` no
 * llega nunca a un `href`, venga de un error o de lo que sea.
 *
 * Ver `tools/cocomusic.mjs`, que copia el fichero al construir.
 */

export interface DatosCocomusic {
  base: string;
  actividades: Record<string, Array<{ titulo: string; tipo?: string; ruta: string }>>;
}

export type TipoPagina = 'ficha' | 'tematica' | 'entrada';

export interface Vinculo {
  titulo: string;
  tipo: TipoPagina | null;
  url: string;
}

const TIPOS: readonly TipoPagina[] = ['ficha', 'tematica', 'entrada'];

/** Una barra al principio y no dos: `//x` sería otro origen con el protocolo de la página. */
const RUTA_VALIDA = /^\/(?!\/)[^\s\\]*$/;

export function vinculosDe(datos: DatosCocomusic | null, id: string): Vinculo[] {
  if (!datos || datos.base !== APP.webProyecto) return [];
  const paginas = datos.actividades?.[id];
  if (!Array.isArray(paginas)) return [];

  const vistos = new Set<string>();
  const salida: Vinculo[] = [];
  for (const p of paginas) {
    const titulo = typeof p?.titulo === 'string' ? p.titulo.trim() : '';
    if (!titulo || typeof p.ruta !== 'string' || !RUTA_VALIDA.test(p.ruta)) continue;
    const url = `${APP.webProyecto}${p.ruta}`;
    if (vistos.has(url)) continue;
    vistos.add(url);
    const tipo = TIPOS.find((x) => x === p.tipo) ?? null;
    salida.push({ titulo, tipo, url });
  }
  // La ficha primero: la sección se llama «La ficha para el aula» y es lo que se imprime.
  return salida.sort((a, b) => orden(a.tipo) - orden(b.tipo));
}

function orden(tipo: TipoPagina | null): number {
  return tipo === null ? TIPOS.length : TIPOS.indexOf(tipo);
}
