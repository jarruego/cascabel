import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BarraAcciones } from '@/ui/BarraAcciones';

/**
 * Que la botonera vacía se pueda esconder.
 *
 * El autor lo vio en cuanto la tuvo delante: «cuando no hay botones se sigue viendo la línea
 * de la botonera». Y tenía razón por partida doble, porque son dos casos y solo uno estaba
 * resuelto: el componente no se dibuja si no le pasan hijos, pero lo que le pasan son
 * **condiciones**, y mientras suena el ritmo las tres valen `false`.
 *
 * Se esconde con `.barra-acciones:empty { display: none }`, y esa regla depende de una cosa
 * que no se ve leyendo el CSS: que React, al no pintar ningún hijo, **no deje ningún nodo**
 * dentro del `<div>` — ni un texto en blanco, ni un comentario. Si algún día dejara uno,
 * `:empty` dejaría de casar y la franja volvería sin que nada fallara.
 *
 * Eso es lo que se comprueba aquí, y no se puede comprobar con un test de CSS ni leyendo el
 * componente: hay que montarlo.
 */

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;

afterEach(() => {
  if (raiz) act(() => raiz!.unmount());
  caja?.remove();
  raiz = null;
  caja = null;
});

function montar(hijos: React.ReactNode): HTMLElement | null {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  act(() => {
    raiz!.render(createElement(BarraAcciones, null, hijos));
  });
  return caja.querySelector('.barra-acciones');
}

describe('la botonera de la actividad', () => {
  it('con todas las condiciones en falso no deja ningún nodo dentro', () => {
    // Es la forma exacta que tiene en los componentes: una lista de condiciones que en
    // algunas fases no pinta nada.
    const barra = montar([false, false, null, undefined]);
    expect(barra, 'la barra no llegó a dibujarse').toBeTruthy();
    expect(
      barra!.childNodes.length,
      'queda algún nodo dentro, así que `:empty` no la escondería',
    ).toBe(0);
  });

  it('con un botón sí lleva contenido', () => {
    // La otra mitad: si esto diera 0, la comprobación de arriba pasaría siempre.
    const barra = montar(createElement('button', { type: 'button' }, 'Empezar'));
    expect(barra!.childNodes.length).toBeGreaterThan(0);
  });

  it('sin hijos ninguno no se monta la barra', () => {
    expect(montar(null)).toBeNull();
  });
});
