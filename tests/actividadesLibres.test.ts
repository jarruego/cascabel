import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TIPOS_LIBRES, esLibre, hayCelebracion } from '../src/motor/actividadesLibres';
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

/**
 * Que toda actividad tenga un momento en el que se da por hecha.
 *
 * Salió de una pregunta del autor —«¿cómo se marcan como completadas actividades como Ta y
 * ti-ti? ¿al dar a Empezar?»— y la respuesta era peor de lo que sugería: **no se marcaban
 * nunca**. `seguir` anota cuando la pieza llega al final, y la rama que anotaba estaba
 * detrás del `return` que relanza el bucle, así que las tres actividades que van en bucle no
 * la alcanzaban jamás. La cuarta sí, que es lo que hace que un fallo así no se note.
 *
 * Es un fallo invisible probando: la actividad funciona, suena y se ve bien. Lo único que
 * pasa es que en el catálogo sigue saliendo sin hacer, y para verlo hay que abrirla, salir,
 * y acordarse de mirar.
 */
describe('toda actividad se puede dar por hecha', () => {
  const DIR = join(__dirname, '..', 'content', 'actividades');
  const ACTIVIDADES = readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as {
      id: string;
      tipo: TipoActividad;
      contenido: Record<string, unknown>;
    });

  it('un musicograma en bucle se anota, pero no se celebra', () => {
    /*
      Las dos mitades de la corrección, y las dos importan. Si solo se anotara, saldría la
      modal de «¡Muy bien!» encima con la música todavía sonando; si solo se dejara de
      celebrar, seguiría sin marcarse.
    */
    const enBucle = ACTIVIDADES.filter((a) => a.tipo === 'seguir' && a.contenido.bucle === true);
    expect(enBucle.length, 'ya no hay musicogramas en bucle: revisa si este test sobra').toBeGreaterThan(0);
    for (const a of enBucle) {
      expect(hayCelebracion(a), `«${a.id}» va en bucle y celebraría con la música sonando`).toBe(false);
    }
  });

  it('el musicograma que sí acaba sigue celebrando', () => {
    const conFinal = ACTIVIDADES.filter((a) => a.tipo === 'seguir' && a.contenido.bucle !== true);
    expect(conFinal.length).toBeGreaterThan(0);
    for (const a of conFinal) expect(hayCelebracion(a), a.id).toBe(true);
  });

  it('las libres no celebran, porque no terminan', () => {
    for (const a of ACTIVIDADES.filter((x) => esLibre(x.tipo))) {
      expect(hayCelebracion(a), a.id).toBe(false);
    }
  });

  it('«seguir» anota antes de relanzar el bucle, no después', () => {
    /*
      El fallo era de ORDEN, no de lógica: la llamada existía y estaba detrás del `return`.
      Un test de comportamiento haría falta un reloj de audio falso y tres segundos de
      espera; esto comprueba lo único que se rompió, que es dónde está la línea.
    */
    const src = readFileSync(join(RAIZ, 'tipos', 'Seguir.tsx'), 'utf8');
    const anota = src.indexOf('alTerminar({ actividadId');
    const relanza = src.indexOf('arrancarRef.current?.(true)');
    expect(anota, 'Seguir.tsx ya no anota').toBeGreaterThan(0);
    expect(relanza, 'Seguir.tsx ya no relanza el bucle').toBeGreaterThan(0);
    expect(anota, 'anota después de relanzar: en bucle no llegaría nunca').toBeLessThan(relanza);
  });
});

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
