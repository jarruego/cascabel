import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import es from '../src/i18n/es.json';

/**
 * Que no se queden textos de pantallas que ya no existen.
 *
 * `tests/textos.test.ts` mira que no FALTE ninguno. Esto mira lo contrario: que no SOBREN.
 * Un texto huérfano no rompe nada —por eso se acumulan—, pero cuesta en tres sitios que sí
 * importan: se traduce a cada idioma nuevo, se descarga con la aplicación, y sobre todo
 * **miente**: quien lea el diccionario creerá que esa pantalla dice eso.
 *
 * Salió de un caso real del 2026-09-08. Al quitar de las actividades las instrucciones que
 * ya cuenta el personaje, se quedaron dentro «Sigue el dibujo con el dedo mientras suena» y
 * «Toca para empezar y sigue el dibujo», que era justo lo que el autor había pedido que
 * dejara de aparecer. En el diccionario seguían, listas para que alguien las volviera a
 * poner sin saber por qué se habían quitado.
 *
 * **Cómo se decide que una clave se usa**, en este orden:
 *
 *  1. Aparece escrita en el código o en el contenido. Vale igual `t('tocar.bien')` que
 *     `'tocar.bien'` dentro de un ternario o `"comun.repetir"` en un JSON de actividad: lo
 *     que se busca es la cadena, no la llamada.
 *  2. Empieza por un prefijo que el código compone con plantilla — `opcion.`, `eje.`,
 *     `nota.`, `reaccion.` —, y esos prefijos se sacan del propio código, no de una lista
 *     escrita a mano que se quedaría vieja.
 */

const DICCIONARIO = es as Record<string, string>;
const RAIZ = join(__dirname, '..');

function ficheros(dir: string, extension: RegExp): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return ficheros(ruta, extension);
    return extension.test(n) ? [ruta] : [];
  });
}

const TODO = [
  ...ficheros(join(RAIZ, 'src'), /\.tsx?$/),
  ...ficheros(join(RAIZ, 'content'), /\.json$/),
]
  .filter((f) => !f.endsWith(join('i18n', 'es.json')))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/**
 * `` `eje.${x}` `` -> «eje.». Los prefijos que el código compone en marcha.
 *
 * Se busca en cualquier plantilla y no solo dentro de `t(...)`: la guía por tipo de la
 * ficha se arma en una variable —``const porTipo = `ficha.tipo.${tipo}.${campo}` ``— y se
 * pasa a `t()` después, así que mirar solo la llamada dejaba fuera noventa y seis claves
 * buenas.
 */
const PREFIJOS = [
  // Plantilla: `eje.${x}`
  ...[...TODO.matchAll(/`([a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)*\.)\$\{/g)],
  // Y concatenación, que es lo mismo escrito de otra forma: t('familia.' + x)
  ...[...TODO.matchAll(/'([a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)*\.)'\s*\+/g)],
]
  .map((m) => m[1]!)
  .filter(Boolean);

/**
 * Textos que se repiten con razón, y por qué.
 *
 * Cada uno es una pareja que hoy dice lo mismo y mañana puede no decirlo, así que juntarlas
 * sería atarlas por casualidad. Todo lo que no esté aquí y esté repetido es un descuido.
 */
const REPETIDOS_A_PROPOSITO: Record<string, string> = {
  'catalogo.titulo|nav.actividades|catalogo.actividades':
    'el título de una pantalla, la etiqueta de su botón de navegación y el nombre de una ' +
    'sección: caben tres longitudes distintas en cuanto la barra se estreche',
  'ajustes.titulo|nav.ajustes': 'lo mismo',
  'ajustes.privacidad|catalogo.privacidad': 'un apartado de ajustes y un enlace del pie',
  'ajustes.calibracion|calibracion.titulo': 'el enlace que lleva y el título de la pantalla',
  'catalogo.creditos|creditos.titulo': 'lo mismo',
  'instrumento.piano|pista.piano':
    'un instrumento del sampler y una voz de un arreglo. Coinciden en castellano y no ' +
    'tienen por qué coincidir en otro idioma',
  'instrumento.flauta|pista.flauta': 'lo mismo',
  'rejilla.pulso|accion.pulso': 'uno va dentro de una frase de lector de pantalla, en minúscula',
  'comun.empezar|accion.empezar':
    'el de la pantalla de explicación lleva admiración y es el más grande de la aplicación; ' +
    'el otro es el botón de dentro de la actividad',
};

describe('un texto por cosa', () => {
  /*
    «Textos comunes si hacen lo mismo», pidió el autor. Y había once claves distintas
    diciendo cinco palabras: «Parar» escrita tres veces, «Escuchar» tres, «Comprobar» dos.

    Duplicar un texto no rompe nada hoy y se cobra tres veces: al traducir son más cadenas y
    basta con que dos se traduzcan distinto para que la aplicación diga «Parar» en un sitio
    y «Detener» en otro; al cambiarlo hay que acordarse de todos los sitios; y en pantalla es
    cómo se acaba con dos botones que hacen lo mismo y no se llaman igual.

    No entran los textos de contenido —`actividad.*`, `opcion.*`, `ficha.*`—: ahí que dos
    actividades coincidan en una frase corta es normal y no significa nada.
  */
  const DE_INTERFAZ = Object.entries(DICCIONARIO).filter(
    ([k]) => !/^(actividad|ficha|opcion|reaccion)\./.test(k),
  );

  it('ninguna palabra de la interfaz se escribe en dos claves', () => {
    const porTexto = new Map<string, string[]>();
    for (const [k, v] of DE_INTERFAZ) {
      const normal = v.trim().toLowerCase();
      porTexto.set(normal, [...(porTexto.get(normal) ?? []), k]);
    }
    const repetidos = [...porTexto.values()]
      .filter((ks) => ks.length > 1)
      .map((ks) => ks.join('|'))
      .filter((firma) => !(firma in REPETIDOS_A_PROPOSITO));
    expect(
      repetidos,
      `mismo texto en varias claves (júntalas, o apúntalas en REPETIDOS_A_PROPOSITO ` +
        `con el motivo):\n${repetidos.join('\n')}`,
    ).toEqual([]);
  });

  it('la lista de excepciones no acumula parejas que ya no existen', () => {
    // Una excepción que sobra es peor que ninguna: da permiso a un duplicado futuro que
    // caiga por casualidad en las mismas claves.
    const vivas = Object.keys(REPETIDOS_A_PROPOSITO).filter((firma) =>
      firma.split('|').every((k) => k in DICCIONARIO),
    );
    expect(vivas).toEqual(Object.keys(REPETIDOS_A_PROPOSITO));
  });
});

describe('textos vivos', () => {
  it('el código compone claves con plantilla, y se han encontrado', () => {
    // Si esta lista se quedara vacía por un cambio de estilo, la comprobación de abajo
    // marcaría como huérfanas decenas de claves buenas y alguien la borraría.
    expect(PREFIJOS.length).toBeGreaterThan(4);
  });

  it('ninguna clave del diccionario se quedó sin pantalla', () => {
    const huerfanas = Object.keys(DICCIONARIO).filter(
      (k) => !TODO.includes(k) && !PREFIJOS.some((p) => k.startsWith(p)),
    );
    expect(
      huerfanas,
      `textos que ya no dice nadie (o se usan y hay que dejar rastro):\n${huerfanas.join('\n')}`,
    ).toEqual([]);
  });
});
