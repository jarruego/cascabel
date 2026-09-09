import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HECHA_CUANDO, TIPOS_LIBRES, esLibre, hayCelebracion, sinFinal } from '../src/motor/actividadesLibres';
import type { TipoActividad } from '../src/motor/tipos';

/**
 * Que toda actividad tenga un disparador que la dé por hecha, y que la lista de libres no
 * se quede vieja.
 *
 * La lista decide que esas pantallas **no llevan botón de terminar** y **no celebran**. Lo
 * que ya no decide es cuándo se marcan: desde el 2026-09-12 eso lo hace cada componente
 * llamando a `alTerminar` cuando se cumple su condición —`HECHA_CUANDO`—, y antes las
 * libres se marcaban al abrirlas sin que el niño hubiera tocado nada.
 *
 * Lo que se comprueba se puede leer en el componente: **todo tipo del registro llama a
 * `alTerminar`**. Un tipo que no lo hiciera no se anotaría nunca, y no daría ningún
 * error: el niño haría la actividad y en el catálogo seguiría saliendo sin hacer. Es lo
 * que le pasaba al constructor de ritmos.
 */

const RAIZ = join(__dirname, '..', 'src', 'motor');

/** tipo del registro -> fichero del componente. */
function componentes(): Map<string, string> {
  const registro = readFileSync(join(RAIZ, 'registro.ts'), 'utf8');
  const importado = new Map(
    [...registro.matchAll(/^import (\w+) from '\.\/tipos\/(\w+)';$/gm)].map((m) => [m[1]!, m[2]!]),
  );
  const mapa = new Map<string, string>();
  // Un tipo puede ir envuelto en `conSerie(Tipo, 'tipo')`, que lo convierte en serie de
  // ejercicios sin cambiar su componente: lo que se busca es el componente de dentro.
  for (const m of registro.matchAll(/^\s+'?([a-z-]+)'?:\s+(?:conSerie\()?(\w+)/gm)) {
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

  it('el constructor de ritmos se da por hecho al escuchar el primer ritmo, sin modal', () => {
    /*
      Una rejilla en modo libre no tiene solución que comprobar, y comprobar era lo único
      que la cerraba: no se marcaba nunca. Ahora se anota al escuchar lo primero que se ha
      puesto, con la reacción del personaje, y se sigue componiendo. La modal encima de una
      composición a medias sobraría.
    */
    const libres = ACTIVIDADES.filter(
      (a) => a.tipo === 'rejilla' && (a.contenido.modo ?? (a.contenido.solucion ? 'dictado' : 'libre')) === 'libre',
    );
    expect(libres.map((a) => a.id)).toContain('c1-04-constructor-de-ritmos');
    for (const a of libres) {
      expect(sinFinal(a), a.id).toBe(true);
      expect(hayCelebracion(a), a.id).toBe(false);
    }
    const dictados = ACTIVIDADES.filter((a) => a.tipo === 'rejilla' && !libres.includes(a));
    expect(dictados.length).toBeGreaterThan(0);
    for (const a of dictados) expect(hayCelebracion(a), a.id).toBe(true);
  });

  it('«seguir» anota la vuelta completa, dé vueltas o no', () => {
    /*
      El fallo original era de ORDEN: la llamada que anota estaba detrás del `return` que
      relanzaba el bucle, así que en bucle no se alcanzaba nunca. Ese `return` ya no existe
      —el bucle no relanza, sigue— y con él desaparece la forma de volver a equivocarse.

      Lo que queda por comprobar es que siga habiendo una sola llamada y que no esté dentro
      de la rama de «no hay bucle», que es lo que la escondía.
    */
    const src = readFileSync(join(RAIZ, 'tipos', 'Seguir.tsx'), 'utf8');
    expect(src, 'ya no relanza, y no debe volver a hacerlo').not.toContain('arrancarRef');
    const llamadas = src.match(/alTerminar\(\{ actividadId/g) ?? [];
    expect(llamadas.length, 'debe haber una sola llamada, y fuera de toda rama').toBe(1);
    const anota = src.indexOf('alTerminar({ actividadId');
    const ramaSinBucle = src.indexOf('if (!contenido.bucle)');
    expect(ramaSinBucle, 'ya no hay rama de «sin bucle»').toBeGreaterThan(0);
    expect(anota, 'anota dentro de la rama de «sin bucle»: en bucle no llegaría').toBeLessThan(
      ramaSinBucle,
    );
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

  it('todo tipo del registro llama a alTerminar: es su disparador de «hecha»', () => {
    const sinDisparador: string[] = [];
    for (const [tipo, fichero] of MAPA) {
      const src = readFileSync(join(RAIZ, 'tipos', `${fichero}.tsx`), 'utf8');
      /* `alTerminar` también es el nombre de una prop de la cuenta atrás, que no tiene nada
         que ver: lo que se busca es la prop de la actividad, que llega destructurada. */
      const recibe = /function \w+\(\{[^}]*\balTerminar\b/.test(src);
      const llama = /\balTerminar\(\{/.test(src);
      if (!recibe || !llama) sinDisparador.push(tipo);
    }
    expect(sinDisparador, `sin disparador de hecha: ${sinDisparador.join(', ')}`).toEqual([]);
  });

  it('HECHA_CUANDO dice de todo tipo del registro cuándo se da por hecho', () => {
    for (const tipo of MAPA.keys()) {
      expect(HECHA_CUANDO[tipo as TipoActividad], `«${tipo}» no dice cuándo se da por hecho`).toBeTruthy();
    }
  });

  it('los tipos libres no piden nada al niño para terminar, pero sí para darse por hechos', () => {
    // Lo que se comprueba es que ninguno se marque al abrirse desde el marco: esa rama
    // se quitó, y volver a ponerla marcaría el piano sin tocarlo.
    const marco = readFileSync(join(__dirname, '..', 'src', 'app', 'Actividad.tsx'), 'utf8');
    expect(marco).not.toMatch(/esLibre\(actividad\.tipo\)\)\s*return;\s*void anotar/);
    expect(TIPOS_LIBRES.length).toBeGreaterThan(0);
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
