import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { componenteDe } from '@/motor/registro';
import type { Actividad, TipoActividad } from '@/motor/tipos';

/**
 * Que cada tipo de motor **se monte** con una actividad de verdad.
 *
 * Es el hueco que dejaban todos los demás tests. Las reglas de producto están probadas una a
 * una —`maquinaOrdenar`, `rejillaRitmica`, `eco`, `repaso`…— pero nada comprobaba que el
 * componente que las usa llegue siquiera a dibujarse. Un tipo nuevo con una clave de texto
 * mal escrita, un `contenido` que el componente lee de otra forma o un import circular no
 * rompían ningún test: rompían la pantalla, y solo se veía abriéndola.
 *
 * **Esto no sustituye a probarlo a mano.** No comprueba que se vea bien, ni que suene, ni que
 * se pueda usar: comprueba que no explota al abrirse, que es el fallo más caro de encontrar
 * porque exige tener el dispositivo delante.
 *
 * Se monta con `react-dom/client` a pelo, sin biblioteca de testing: son treinta líneas y no
 * hace falta añadir una dependencia para esto.
 */

function todas(): Actividad[] {
  const dir = join(__dirname, '..', 'content', 'actividades');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Actividad);
}

/** Una actividad por tipo, la primera que haya de cada uno. */
function unaPorTipo(): Map<TipoActividad, Actividad> {
  const porTipo = new Map<TipoActividad, Actividad>();
  for (const a of todas()) if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, a);
  return porTipo;
}

beforeAll(() => {
  // React 19 pide esta bandera para que `act` no avise en cada render.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;

  // jsdom no trae ResizeObserver y el teclado lo usa para medir el ancho disponible.
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  /*
    jsdom no implementa la reproducción de audio y su `play()` devuelve `undefined`, cuando
    la especificación dice que devuelve una promesa. No es un fallo de la aplicación: es un
    hueco del entorno, y taparlo aquí es más honesto que llenar el código de comprobaciones
    para un navegador que no existe.
  */
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};

  if (typeof globalThis.matchMedia === 'undefined') {
    globalThis.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof globalThis.matchMedia;
  }
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;

afterEach(() => {
  if (raiz) act(() => raiz!.unmount());
  caja?.remove();
  raiz = null;
  caja = null;
});

const actividades = unaPorTipo();

/** Monta una actividad y devuelve el texto de su `h1`, o lanza si no se pudo montar. */
async function montar(actividad: Actividad): Promise<string> {
  const Componente = componenteDe(actividad.tipo);
  if (!Componente) throw new Error(`sin componente para «${actividad.tipo}»`);
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  act(() => {
    raiz!.render(createElement(Componente, { actividad, alTerminar: () => {} }));
  });
  // Un ciclo más para que corran los efectos que arrancan solos y sus promesas: es donde
  // suelen estar los fallos de montaje, no en el primer dibujado.
  await act(async () => {});
  return caja.querySelector('h1')?.textContent?.trim() ?? '';
}

describe('cada tipo de motor se monta', () => {
  it('hay una actividad de cada tipo registrado', () => {
    // Si esto falla, es que se registró un tipo y no se escribió contenido para él: el
    // resto de este fichero no lo habría probado y nadie se habría enterado.
    for (const tipo of actividades.keys()) expect(componenteDe(tipo)).toBeTruthy();
    expect(actividades.size).toBeGreaterThan(15);
  });

  for (const [tipo, actividad] of actividades) {
    it(`${tipo} (${actividad.id})`, async () => {
      // Toda actividad enseña su consigna en un h1. Si esto está vacío, el componente se
      // dibujó pero no leyó su contenido, que es tan roto como no dibujarse.
      const titulo = await montar(actividad);
      expect(titulo.length, `«${tipo}» dibuja un h1 vacío o ninguno`).toBeGreaterThan(0);
    });
  }
});

/**
 * Y las setenta y ocho, una por una.
 *
 * Lo de arriba prueba **el tipo**; esto prueba **el contenido**. No es lo mismo: un JSON al
 * que le falta un campo que su tipo da por hecho, una clave de texto mal escrita o una
 * combinación de opciones que nadie había juntado rompen esa actividad y ninguna otra, y el
 * primer bloque no las tocaría porque solo abre la primera de cada tipo.
 *
 * Es la versión mecánica de «revísalas una por una»: no dice si una actividad es buena —eso
 * hay que mirarlo—, dice que se abre y que enseña su consigna.
 */
describe('las setenta y ocho actividades se abren', () => {
  const TODAS = todas();

  it('hay contenido que revisar', () => {
    expect(TODAS.length).toBeGreaterThan(70);
  });

  for (const actividad of TODAS) {
    it(actividad.id, async () => {
      const titulo = await montar(actividad);
      expect(titulo.length, `«${actividad.id}» dibuja un h1 vacío o ninguno`).toBeGreaterThan(0);
      // La clave sin traducir se cuela tal cual en la pantalla y no da ningún error: es el
      // fallo que enseñó «actividad.c120mano.enunciado» en el sitio del enunciado.
      expect(titulo, `«${actividad.id}» enseña una clave en crudo`).not.toMatch(
        /^[a-z]+\.[a-zA-Z0-9.]+$/,
      );
    });
  }
});
