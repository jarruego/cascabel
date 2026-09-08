import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Que un botón parezca un botón, en toda la aplicación.
 *
 * La queja del autor fue literal: «en actividades como Palmea el ritmo y otras muchas, los
 * botones de Empezar y otros siguen siendo un simple texto sin apariencia de botón». Y no
 * era falta de CSS: era que había dos apariencias para tres papeles distintos, así que cada
 * tipo de motor elegía por su cuenta, y la acción principal de una actividad se pintaba
 * como tarjeta gigante o como botón secundario según quién la hubiera escrito.
 *
 * El reparto, y de aquí no se sale:
 *
 *  - **`boton-principal`** — la acción que hace avanzar la actividad. Rellena, una sola.
 *  - **`boton-repetir`** — lo secundario: limpiar, grabar, exportar, «Idea».
 *  - **`boton-actividad`** — lo que se toca porque ES la actividad: opciones, fichas,
 *    bandas, la diana, el pandero.
 *
 * Y `boton-arranque` encima de la principal cuando hay que pulsarla para que empiece a
 * pasar algo.
 *
 * Lo que esto NO comprueba: que se vea bien. Comprueba lo que se estropea solo — un botón
 * sin clase, o un latido puesto en algo que no es la acción principal.
 */

const RAIZ = join(__dirname, '..', 'src');
/*
  Los tres sitios donde hay botones, y los tres siguen la misma regla.

  Empezó mirando solo los tipos de motor, que es donde estaba la queja. Pero la ficha, los
  ajustes y el aviso de actualización tienen la misma pregunta —cuál es LA acción de esta
  pantalla— y la respondían todas igual: con un botón secundario. Imprimir es lo que se viene
  a hacer a una ficha.
*/
const CARPETAS = [
  join(RAIZ, 'motor', 'tipos'),
  join(RAIZ, 'app'),
  join(RAIZ, 'ui'),
];
const CSS = readFileSync(join(RAIZ, 'estilos', 'tokens.css'), 'utf8');

const COMPARTIDAS = ['boton-principal', 'boton-repetir', 'boton-actividad', 'boton-arranque'];

/**
 * Las clases de cada `<button>` de cada tipo, con el fichero de donde salen.
 *
 * Se saltan los `<button>` sin atributos: los únicos que hay están dentro de comentarios
 * que hablan de botones —«son <button> nativos, así que Tab y Enter funcionan»— y contarlos
 * daría un botón sin clase que no existe.
 *
 * La clase viene de tres formas y hay que entender las tres:
 *
 *   className="boton-repetir"
 *   className={k.negra ? 'teclado__negra' : 'teclado__blanca'}
 *   className={`boton-actividad boton--${color}`}
 *
 * De las dos últimas se sacan los trozos literales, que es donde están los nombres de clase
 * de verdad; lo que se interpola es un modificador y se compone en marcha.
 */
function botones(): Array<{ fichero: string; clases: string[] }> {
  const salida: Array<{ fichero: string; clases: string[] }> = [];
  for (const carpeta of CARPETAS)
  for (const n of readdirSync(carpeta).filter((f) => f.endsWith('.tsx'))) {
    const src = readFileSync(join(carpeta, n), 'utf8');
    for (const m of src.matchAll(/<button\b([\s\S]*?)>/g)) {
      const atributos = m[1]!;
      if (!atributos.trim()) continue;
      const entreComillas = /className="([^"]*)"/.exec(atributos);
      const plantilla = /className=\{`([^`]*)`?/.exec(atributos);
      const enExpresion = /className=\{([^}]*)\}/.exec(atributos);
      const crudo = entreComillas
        ? entreComillas[1]!
        : plantilla
          ? plantilla[1]!.replace(/\$\{[^}]*\}?/g, ' ')
          : [...(enExpresion?.[1] ?? '').matchAll(/['`]([^'`]*)['`]/g)].map((x) => x[1]).join(' ');
      salida.push({ fichero: n, clases: crudo.trim().split(/\s+/).filter(Boolean) });
    }
  }
  return salida;
}

describe('los botones de la aplicación', () => {
  const TODOS = botones();

  it('se han encontrado botones que revisar', () => {
    // Si un cambio de estilo dejara esta lista vacía, todo lo de abajo pasaría sin mirar
    // nada. Entre los veintiún tipos y las pantallas de alrededor pasan de sesenta.
    expect(TODOS.length).toBeGreaterThan(55);
  });

  it('ninguno se queda sin clase, que es como se acaba pareciendo un texto suelto', () => {
    const desnudos = [...new Set(TODOS.filter((b) => b.clases.length === 0).map((b) => b.fichero))];
    expect(desnudos, `botones sin clase en:\n${desnudos.join('\n')}`).toEqual([]);
  });

  it('toda clase de botón tiene su regla, compartida o propia', () => {
    /*
      Una clase que no existe en el CSS no da error: el botón se dibuja con la apariencia
      que le toque por herencia, que suele ser ninguna. Es exactamente el fallo que
      describió el autor, y es el que vuelve solo al renombrar una clase.
    */
    const huerfanas = new Set<string>();
    for (const { clases } of TODOS) {
      for (const c of clases) {
        if (COMPARTIDAS.includes(c)) continue;
        if (!CSS.includes(`.${c}`)) huerfanas.add(c);
      }
    }
    expect([...huerfanas], `clases de botón sin CSS:\n${[...huerfanas].join('\n')}`).toEqual([]);
  });

  it('el latido va siempre sobre la acción principal', () => {
    /*
      `boton-arranque` significa «este, y hasta que lo pulses». Si latiera un botón
      secundario, dejaría de significar cuál hay que tocar — que es lo único que hace.
    */
    const mal = TODOS.filter(
      (b) => b.clases.includes('boton-arranque') && !b.clases.includes('boton-principal'),
    ).map((b) => `${b.fichero}: ${b.clases.join(' ')}`);
    expect(mal, `latido fuera de la acción principal:\n${mal.join('\n')}`).toEqual([]);
  });

  it('cada tipo que arranca algo tiene un solo botón con latido', () => {
    // Dos latidos a la vez es ninguno: el niño mira los dos y no sabe cuál es el que
    // empieza. Se cuenta por fichero porque las fases se excluyen entre sí.
    const cuenta = new Map<string, number>();
    for (const b of TODOS) {
      if (b.clases.includes('boton-arranque')) {
        cuenta.set(b.fichero, (cuenta.get(b.fichero) ?? 0) + 1);
      }
    }
    const varios = [...cuenta].filter(([, n]) => n > 1).map(([f, n]) => `${f}: ${n}`);
    expect(varios, `más de un botón con latido:\n${varios.join('\n')}`).toEqual([]);
  });
});
