import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Que la interfaz no se vuelva a quedar pequeña en una pantalla grande.
 *
 * Salió de una queja concreta del autor: «el piano no se estira al 100 % y otras muchas
 * actividades tampoco, se desaprovecha mucho espacio». El origen eran dos costumbres que
 * parecen inofensivas y no lo son:
 *
 *  1. **`min(46vh, 340px)`.** Se lee como «que no pase de 340» y significa «que no pase de
 *     340 NUNCA»: en cualquier pantalla de más de 740 px de alto gana siempre el número
 *     fijo. Es lo contrario de adaptarse. Lo que se quería decir es `clamp(mínimo,
 *     relativo, máximo)`, que sí tiene suelo y techo.
 *  2. **Un `max-width` para toda la aplicación.** Todo estaba encajonado en 840 px, y el
 *     teclado —que mide su caja para decidir cuántas octavas caben— no podía crecer más
 *     allá de esa caja por mucho monitor que hubiera.
 *
 * Lo que este fichero NO comprueba: que se vea bien. Eso hace falta mirarlo. Comprueba las
 * dos formas concretas en que se estropeó, que son las que vuelven solas.
 */

const CSS = readFileSync(join(__dirname, '..', 'src', 'estilos', 'tokens.css'), 'utf-8').replace(
  /\r\n/g,
  '\n',
);

/** El fichero sin comentarios: en ellos se citan los patrones que se explican. */
const SIN_COMENTARIOS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

describe('la interfaz aprovecha la pantalla', () => {
  it('ningún tamaño usa min(relativo, fijo), que siempre acaba ganando el fijo', () => {
    const culpables = [...SIN_COMENTARIOS.matchAll(/min\(\s*[\d.]+v[hw]\s*,\s*[\d.]+px\s*\)/g)].map(
      (m) => m[0],
    );
    expect(culpables).toEqual([]);
  });

  it('las superficies que se tocan no están encajonadas en el ancho de un móvil', () => {
    // 840 px era el tope de todo. El catálogo y el marco de la actividad son las dos cajas
    // de las que cuelga el resto, así que si ellas están estrechas, no hay componente que
    // pueda ensancharse por su cuenta.
    const bloque = SIN_COMENTARIOS.slice(
      SIN_COMENTARIOS.indexOf('.catalogo,\n.actividad-marco'),
    ).slice(0, 200);
    const tope = /max-width:\s*(\d+)px/.exec(bloque);
    expect(tope, 'no se encuentra el tope de .catalogo/.actividad-marco').toBeTruthy();
    expect(Number(tope![1])).toBeGreaterThanOrEqual(1200);
  });

  it('el catálogo se reparte en columnas y no en una tira', () => {
    // Con una sola columna, un monitor ancho enseña una lista de una tarjeta de ancho y
    // dos metros de largo. `auto-fill` reparte solo, sin puntos de ruptura que mantener.
    const bloque = SIN_COMENTARIOS.slice(SIN_COMENTARIOS.lastIndexOf('.catalogo__lista'));
    expect(bloque.slice(0, 220)).toMatch(/repeat\(\s*auto-fill/);
  });

  it('la actividad tiene un escenario, y se centra dentro', () => {
    /*
      `.actividad` no tenía **ninguna** regla hasta el 2026-09-09. Cada tipo colocaba lo suyo
      en el flujo normal del documento —o sea pegado arriba— y lo que se veía centrado lo
      estaba porque ese componente se centraba solo. De ahí la queja del autor: unas cosas
      centradas y otras no, sin criterio, porque no había nada común que lo decidiera.
    */
    const bloque = SIN_COMENTARIOS.slice(SIN_COMENTARIOS.indexOf('\n.actividad {'));
    expect(bloque.slice(0, 200), 'la actividad no centra su contenido').toMatch(
      /align-content:\s*safe center/,
    );
    expect(bloque.slice(0, 200), 'el aire entre bloques no sale de un gap común').toMatch(
      /gap:/,
    );
  });

  it('las superficies miden contra el alto REAL, no contra la ventana', () => {
    /*
      `vh` es la ventana entera y la actividad no la tiene: tiene la ventana menos las dos
      barras de abajo, que se llevan unos 136 px. Nueve superficies se medían así —el lienzo
      en `56vh`, el musicograma en `52vh`, el teclado en `38vh`— y por eso no cabían: cada
      una prometía más alto del que había.

      El sustituto es `--alto-escena`, que resta las dos barras. Aquí se comprueba que nadie
      vuelve a `vh` para un alto; `dvh` sí, pero solo donde se define el token.
    */
    /*
      `100vh` sí vale, y solo en un sitio: el marco de la actividad, que **es** la ventana
      entera y de ahí resta las barras. Lo que se persigue es la fracción —`56vh`, `38vh`—,
      que es una promesa de espacio que no existe.
    */
    const culpables = [...SIN_COMENTARIOS.matchAll(/(?:height|min-height):[^;]*?(\d+)vh/g)]
      .filter((m) => m[1] !== '100')
      .map((m) => m[0].trim());
    expect(
      culpables,
      `alturas medidas contra la ventana entera:\n${culpables.join('\n')}`,
    ).toEqual([]);
  });

  it('el alto disponible descuenta las dos barras de abajo', () => {
    const definicion = /--alto-escena:[^;]*;/g;
    const todas = [...SIN_COMENTARIOS.matchAll(definicion)].map((m) => m[0]);
    expect(todas.length, 'no se define --alto-escena').toBeGreaterThan(0);
    for (const d of todas) {
      expect(d, 'no descuenta la barra de navegación').toContain('--alto-barra');
      expect(d, 'no descuenta la botonera').toContain('--alto-acciones');
    }
  });

  it('hay una regla para la pantalla apaisada y baja, que es un móvil girado', () => {
    // Es la postura del piano y de todo lo que avanza de lado, y donde menos altura hay.
    expect(CSS).toMatch(/@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height/);
  });
});
