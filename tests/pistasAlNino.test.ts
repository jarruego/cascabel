import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TIPOS_LIBRES } from '../src/motor/actividadesLibres';

/**
 * Que la pista escrita para el niño llegue al niño.
 *
 * `CLAUDE.md` regla 4: «el feedback de error es una pista concreta y amable». Las pistas
 * concretas están escritas en el JSON de cada actividad, una o dos, cada vez más precisas —
 * «los dos “ti” seguidos son la mitad de rápido que un “ta”: los dos entran en el mismo
 * pulso»—. Y hasta el 2026-09-08 las leían **dos** de los veintiún tipos.
 *
 * En los demás, al fallar salía la frase genérica del tipo: «escucha otra vez», «revisa lo
 * que has puesto». Amable, sí. Concreta, no: no enseña nada. Las pistas buenas se quedaban
 * en la hoja imprimible, o sea llegaban solo al adulto, que es quien no las necesita.
 *
 * Es un fallo que **no se ve probando**: la actividad funciona, el mensaje sale, y hay que
 * saber que existe una pista mejor para echarla en falta. Por eso hay test.
 *
 * **Quién entra en la comprobación**: el tipo que puede decirle al niño «casi». Ése es el
 * momento en el que una pista sirve para algo, y se reconoce en el código porque el
 * componente pinta una `Reaccion` con tono `casi`. Los demás no entran, y no son solo los
 * libres: «seguir» tiene final —acaba cuando acaba la pieza— y aun así no se puede fallar,
 * porque lo único que se hace ahí es mirar. Sus pistas van a la ficha, escritas para el
 * maestro, y ahí están bien.
 */

const TIPOS = join(__dirname, '..', 'src', 'motor', 'tipos');
const REGISTRO = readFileSync(join(TIPOS, '..', 'registro.ts'), 'utf8');

/** tipo del registro -> fichero del componente. */
const COMPONENTE = (() => {
  const importado = new Map(
    [...REGISTRO.matchAll(/^import (\w+) from '\.\/tipos\/(\w+)';$/gm)].map((m) => [m[1]!, m[2]!]),
  );
  const mapa = new Map<string, string>();
  for (const m of REGISTRO.matchAll(/^\s+'?([a-z-]+)'?:\s+(\w+),$/gm)) {
    const f = importado.get(m[2]!);
    if (f) mapa.set(m[1]!, f);
  }
  return mapa;
})();

const LIBRES = new Set<string>(TIPOS_LIBRES);

/** ¿Este tipo llega a decirle «casi» a alguien? Entonces le hace falta algo que ofrecer. */
function puedeDecirCasi(fichero: string): boolean {
  return readFileSync(join(TIPOS, `${fichero}.tsx`), 'utf8').includes("'casi'");
}

describe('las pistas llegan al niño', () => {
  it('todo tipo que evalúa lee las pistas de la actividad', () => {
    const mudos: string[] = [];
    for (const [tipo, fichero] of COMPONENTE) {
      if (LIBRES.has(tipo) || !puedeDecirCasi(fichero)) continue;
      const src = readFileSync(join(TIPOS, `${fichero}.tsx`), 'utf8');
      if (!src.includes('actividad.pistas')) mudos.push(`${tipo} (${fichero}.tsx)`);
    }
    expect(
      mudos,
      `tipos que evalúan y no usan la pista escrita para esa actividad:\n${mudos.join('\n')}`,
    ).toEqual([]);
  });

  it('toda actividad que se puede fallar trae al menos una pista', () => {
    /*
      Al revés que la de arriba: el motor sabe leerla, pero si el JSON no la trae lo que sale
      es la frase genérica. Se mira `autocorrectiva`, que es como el contenido declara que
      hay una respuesta que se comprueba.
    */
    const DIR = join(__dirname, '..', 'content', 'actividades');
    const sinPista: string[] = [];
    for (const f of readdirSync(DIR).filter((n) => n.endsWith('.json'))) {
      const a = JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as {
        id: string;
        tipo: string;
        pistas?: string[];
        evaluacion?: { autocorrectiva?: boolean };
      };
      const fichero = COMPONENTE.get(a.tipo);
      if (!fichero || LIBRES.has(a.tipo) || !puedeDecirCasi(fichero)) continue;
      if (!a.evaluacion?.autocorrectiva) continue;
      if (!a.pistas?.length) sinPista.push(a.id);
    }
    expect(sinPista, `sin nada que ofrecer al fallar:\n${sinPista.join('\n')}`).toEqual([]);
  });
});
