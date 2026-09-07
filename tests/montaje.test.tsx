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

/** Una actividad por tipo, la primera que haya de cada uno. */
function unaPorTipo(): Map<TipoActividad, Actividad> {
  const dir = join(__dirname, '..', 'content', 'actividades');
  const porTipo = new Map<TipoActividad, Actividad>();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json')) continue;
    const a = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Actividad;
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, a);
  }
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

describe('cada tipo de motor se monta', () => {
  it('hay una actividad de cada tipo registrado', () => {
    // Si esto falla, es que se registró un tipo y no se escribió contenido para él: el
    // resto de este fichero no lo habría probado y nadie se habría enterado.
    for (const tipo of actividades.keys()) expect(componenteDe(tipo)).toBeTruthy();
    expect(actividades.size).toBeGreaterThan(15);
  });

  for (const [tipo, actividad] of actividades) {
    it(`${tipo} (${actividad.id})`, async () => {
      const Componente = componenteDe(tipo);
      expect(Componente, `sin componente registrado para «${tipo}»`).toBeTruthy();

      caja = document.createElement('div');
      document.body.appendChild(caja);
      raiz = createRoot(caja);

      act(() => {
        raiz!.render(
          createElement(Componente!, { actividad, alTerminar: () => {} }),
        );
      });

      // Un ciclo más para que corran los efectos que arrancan solos y sus promesas: es
      // donde suelen estar los fallos de montaje, no en el primer dibujado.
      await act(async () => {});

      // Toda actividad enseña su consigna en un h1. Si esto está vacío, el componente se
      // dibujó pero no leyó su contenido, que es tan roto como no dibujarse.
      const titulo = caja.querySelector('h1');
      expect(titulo, `«${tipo}» no dibuja ningún h1`).toBeTruthy();
      expect(titulo!.textContent?.trim().length, `«${tipo}» dibuja un h1 vacío`).toBeGreaterThan(0);
    });
  }
});
