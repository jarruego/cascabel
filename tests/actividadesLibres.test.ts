import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TIPOS_LIBRES, esLibre } from '../src/motor/actividadesLibres';
import type { TipoActividad } from '../src/motor/tipos';

/**
 * Que la lista de actividades libres no se quede vieja.
 *
 * La lista decide dos cosas visibles: que esas pantallas **no llevan botón de terminar** y
 * que se marcan como hechas al abrirlas. Si mañana se añade un tipo libre y nadie toca la
 * lista, ese tipo no se anotaría nunca — y no daría ningún error: simplemente el niño haría
 * la actividad y en el catálogo seguiría saliendo sin hacer.
 *
 * El criterio se puede comprobar leyendo el componente, y eso es lo que se hace aquí:
 * **libre es el que no llama a `alTerminar`**. Un tipo que evalúa termina con un resultado
 * que depende de lo que ha hecho el niño; uno libre no tiene nada que pasar.
 */

const RAIZ = join(__dirname, '..', 'src', 'motor');

/** tipo del registro -> fichero del componente. */
function componentes(): Map<string, string> {
  const registro = readFileSync(join(RAIZ, 'registro.ts'), 'utf8');
  const importado = new Map(
    [...registro.matchAll(/^import (\w+) from '\.\/tipos\/(\w+)';$/gm)].map((m) => [m[1]!, m[2]!]),
  );
  const mapa = new Map<string, string>();
  for (const m of registro.matchAll(/^\s+'?([a-z-]+)'?:\s+(\w+),$/gm)) {
    const fichero = importado.get(m[2]!);
    if (fichero) mapa.set(m[1]!, fichero);
  }
  return mapa;
}

describe('actividades sin final', () => {
  const MAPA = componentes();

  it('el registro se lee entero', () => {
    expect(MAPA.size).toBeGreaterThanOrEqual(21);
  });

  it('todo tipo de la lista es un tipo que existe', () => {
    for (const tipo of TIPOS_LIBRES) expect(MAPA.has(tipo), `«${tipo}» no está en el registro`).toBe(true);
  });

  it('ningún tipo libre evalúa, y todo tipo que no evalúa está en la lista', () => {
    const mal: string[] = [];
    for (const [tipo, fichero] of MAPA) {
      const src = readFileSync(join(RAIZ, 'tipos', `${fichero}.tsx`), 'utf8');
      /* `alTerminar` también es el nombre de una prop de la cuenta atrás, que no tiene nada
         que ver: lo que se busca es la prop de la actividad, que llega destructurada. */
      const evalua = /function \w+\(\{[^}]*\balTerminar\b/.test(src);
      if (evalua === esLibre(tipo as TipoActividad)) {
        mal.push(
          evalua
            ? `«${tipo}» está en TIPOS_LIBRES y llama a alTerminar`
            : `«${tipo}» no llama a alTerminar y falta en TIPOS_LIBRES`,
        );
      }
    }
    expect(mal, mal.join('\n')).toEqual([]);
  });

  it('ninguna actividad libre enseña un botón de terminar', () => {
    // Se sale por «Volver», que está siempre abajo a la izquierda. Dos salidas para una
    // pantalla de la que solo se puede salir de una manera es lo que había antes.
    for (const tipo of TIPOS_LIBRES) {
      const src = readFileSync(join(RAIZ, 'tipos', `${MAPA.get(tipo)!}.tsx`), 'utf8');
      expect(src, `«${tipo}» sigue teniendo botón de terminar`).not.toMatch(/\.terminar'/);
    }
  });
});
