import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');

/**
 * La promesa «ni una petición fuera de nuestro origen» (regla 1 del proyecto) se sostiene
 * sobre dos cosas: la CSP, que la hace cumplir en el navegador, y que un solo fichero haga
 * peticiones, para que auditar el código sea leer una página y no todo el repositorio.
 *
 * Estos tests protegen la segunda. La primera la protege `public/_headers`.
 */
describe('un solo punto de red', () => {
  function ficherosDe(dir: string, ext: string[]): string[] {
    const salida: string[] = [];
    for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) salida.push(...ficherosDe(rel, ext));
      else if (ext.some((x) => e.name.endsWith(x))) salida.push(rel);
    }
    return salida;
  }

  it('solo src/datos/cargar.ts llama a fetch', () => {
    const culpables = ficherosDe('src', ['.ts', '.tsx'])
      .filter((f) => f !== 'src/datos/cargar.ts')
      .filter((f) => /(?<![.\w])fetch\s*\(/.test(leer(f)));
    expect(culpables).toEqual([]);
  });

  it('cargar.ts rechaza cualquier ruta que no sea relativa', () => {
    const fuente = leer('src/datos/cargar.ts');
    // Tres funciones salen a la red y las tres tienen que comprobarlo.
    const guardas = fuente.match(/startsWith\('\/'\)/g) ?? [];
    const fetches = fuente.match(/fetch\(/g) ?? [];
    expect(guardas.length).toBeGreaterThanOrEqual(fetches.length);
  });

  it('la CSP prohíbe conectarse a cualquier otro origen', () => {
    const cabeceras = leer('public/_headers');
    // connect-src 'self' es lo que hace técnicamente imposible exfiltrar el audio del
    // micrófono, y por tanto lo que permite prometerlo por escrito.
    expect(cabeceras).toMatch(/connect-src 'self'/);
    expect(cabeceras).toMatch(/font-src 'self'/);
    expect(cabeceras).toMatch(/default-src 'self'/);
    expect(cabeceras).not.toMatch(/https?:\/\//);
  });

  it('no hay ninguna URL absoluta en el código de la app', () => {
    const conUrl = ficherosDe('src', ['.ts', '.tsx', '.css']).filter((f) =>
      /https?:\/\/(?!www\.w3\.org)/.test(leer(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')),
    );
    expect(conUrl).toEqual([]);
  });
});
