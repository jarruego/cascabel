/**
 * Lo que el buscador del catálogo lee de cada actividad además del título.
 *
 * El autor lo pidió el 2026-09-12: «anacrusa» no encontraba la 329, porque el buscador solo
 * miraba el código, el título, el eje, el tipo y el criterio. Ahora mira también:
 *
 *  - **las etiquetas** del JSON: palabras que el título no dice —sinónimos, obras,
 *    compositores, instrumentos—, escritas a mano;
 *  - **la práctica** declarada —figuras, compás, método, notas, secuencia—, traducida a lo
 *    que escribe un maestro: «6/8» también es «seis por ocho», «silencio-negra» es
 *    «silencio de negra», «laminas» es «láminas» y «xilófono».
 *
 * La descripción NO entra: «nota», «pulso» y «escucha» están en decenas, y el ruido ahogaría
 * lo que se busca. Lo que la descripción sabe y el título no, va a las etiquetas.
 */

export interface PracticaBuscable {
  figuras?: string[];
  compas?: string | null;
  metodo?: string[];
  notas?: string[];
  secuencia?: string | null;
}

const FIGURAS: Record<string, string> = {
  negra: 'negra negras',
  blanca: 'blanca blancas',
  corchea: 'corchea corcheas',
  semicorchea: 'semicorchea semicorcheas',
  redonda: 'redonda redondas',
  puntillo: 'puntillo',
  tresillo: 'tresillo tresillos',
  sincopa: 'síncopa síncopas',
  'silencio-negra': 'silencio de negra silencios',
  'silencio-blanca': 'silencio de blanca silencios',
  'silencio-corchea': 'silencio de corchea silencios',
  'silencio-redonda': 'silencio de redonda silencios',
};

const COMPASES: Record<string, string> = {
  '2/4': '2/4 dos por cuatro binario',
  '3/4': '3/4 tres por cuatro ternario',
  '4/4': '4/4 cuatro por cuatro cuaternario',
  '6/8': '6/8 seis por ocho',
};

const METODOS: Record<string, string> = {
  kodaly: 'kodály kodaly',
  orff: 'orff schulwerk',
  dalcroze: 'dalcroze',
  willems: 'willems',
  montessori: 'montessori',
};

const SECUENCIAS: Record<string, string> = {
  flauta: 'flauta dulce',
  laminas: 'láminas xilófono carillón',
  'vocal-kodaly': 'voz cantar kodály',
};

/** Las palabras por las que se puede buscar lo que declara la práctica. */
export function palabrasDePractica(p: PracticaBuscable | undefined): string {
  if (!p) return '';
  const partes: string[] = [];
  for (const f of p.figuras ?? []) partes.push(FIGURAS[f] ?? f);
  if (p.compas && p.compas !== 'libre') partes.push(COMPASES[p.compas] ?? p.compas);
  for (const m of p.metodo ?? []) if (METODOS[m]) partes.push(METODOS[m]);
  if (p.notas?.length) partes.push(p.notas.map((n) => n.replace(/['",]/g, '')).join(' '));
  if (p.secuencia && p.secuencia !== 'ninguna') partes.push(SECUENCIAS[p.secuencia] ?? p.secuencia);
  return partes.join(' ');
}

/** Sin acentos ni mayúsculas, por los dos lados: un maestro con prisa escribe «sincopa». */
export function normalizar(x: string): string {
  return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** ¿Encaja la búsqueda? Cada palabra escrita tiene que estar en algún sitio del pajar. */
export function encaja(busqueda: string, pajar: string): boolean {
  const aguja = normalizar(busqueda.trim());
  if (!aguja) return true;
  const p = normalizar(pajar);
  return aguja.split(/\s+/).every((palabra) => p.includes(palabra));
}
