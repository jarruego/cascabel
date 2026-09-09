import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import es from '../src/i18n/es.json';

/**
 * Toda opción de una actividad de elección tiene su texto.
 *
 * La etiqueta se compone —`opcion.${clave}`—, así que el test de textos, que solo mira las
 * claves escritas como literal, no la ve. Y se notaba: «¿Largo o corto?» enseñaba
 * `opcion.largo` y `opcion.corto` tal cual, y otras cinco actividades tenían lo mismo. Lo
 * vio el autor el 2026-09-12.
 */
describe('las opciones de elección tienen texto', () => {
  const DIR = join(__dirname, '..', 'content', 'actividades');
  const diccionario = es as Record<string, string>;

  it('toda clave de opción tiene su «opcion.<clave>» en es.json', () => {
    const faltan: string[] = [];
    for (const f of readdirSync(DIR).filter((n) => n.endsWith('.json'))) {
      const a = JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as {
        id: string;
        tipo: string;
        contenido: { opciones?: Array<{ clave: string; etiqueta?: string }> };
      };
      if (a.tipo !== 'eleccion') continue;
      for (const o of a.contenido.opciones ?? []) {
        if (!o.etiqueta && !diccionario[`opcion.${o.clave}`]) faltan.push(`${a.id}: opcion.${o.clave}`);
      }
    }
    expect(faltan, faltan.join(', ')).toEqual([]);
  });
});
