import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El catálogo filtra desde la URL.
 *
 * Los filtros vivían en el estado del componente y abrir una actividad los borraba: había
 * que volver a filtrar cada vez. Al pasarlos a la URL se arreglan tres cosas de golpe —el
 * «atrás» del navegador, poder compartir un filtro, y no tener estado que sincronizar—,
 * pero se gana una forma nueva de romperlo: que el nombre de un parámetro cambie por un
 * lado y no por el otro, y entonces el enlace que alguien guardó deje de filtrar en
 * silencio, enseñando las setenta y siete.
 *
 * Por eso lo que se comprueba aquí son los nombres de los parámetros y que de verdad
 * recortan la lista.
 */

const INDICE = readFileSync(join(__dirname, '..', 'content', 'indice.json'), 'utf-8');

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(INDICE)) }),
  );
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;

afterEach(() => {
  if (raiz) act(() => raiz!.unmount());
  caja?.remove();
  raiz = null;
  caja = null;
});

async function pintar(url: string): Promise<string[]> {
  const { default: Catalogo } = await import('@/app/Catalogo');
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(
      createElement(MemoryRouter, { initialEntries: [url] }, createElement(Catalogo)),
    );
  });
  await act(async () => {});
  // El título sin el código corto que va delante: lo que se comprueba es qué actividades salen.
  return [...caja.querySelectorAll('.tarjeta__titulo')].map((e) =>
    (e.textContent ?? '').replace(/^\d{3}\s+/, ''),
  );
}

describe('el catálogo', () => {
  it('sin filtros enseña todas las actividades', async () => {
    const todas = await pintar('/');
    expect(todas.length).toBeGreaterThan(50);
  });

  it('`etapa` recorta por curso', async () => {
    const todas = await pintar('/');
    const infantil = await pintar('/?etapa=infantil');
    expect(infantil.length).toBeGreaterThan(0);
    expect(infantil.length).toBeLessThan(todas.length);
  });

  it('`eje` recorta por lo que se trabaja', async () => {
    const pulso = await pintar('/?eje=pulso');
    expect(pulso.length).toBeGreaterThan(0);
    expect(pulso.length).toBeLessThan((await pintar('/')).length);
  });

  it('`crit` recorta por criterio curricular', async () => {
    // Es el filtro por el que llega un maestro con la programación delante, y el que hace
    // que valga la pena poder guardar la URL.
    const uno = await pintar('/?crit=3.1');
    expect(uno.length).toBeGreaterThan(0);
    expect(uno.length).toBeLessThan((await pintar('/')).length);
  });

  it('`q` busca sin acentos y por varias palabras', async () => {
    // Un maestro con prisa escribe «ritmico» sin tilde, y que eso no encuentre «rítmico»
    // es exactamente lo que hace pensar que el buscador está roto.
    const conTilde = await pintar('/?q=r%C3%ADtmico');
    const sinTilde = await pintar('/?q=ritmico');
    expect(sinTilde).toEqual(conTilde);
    expect(sinTilde.length).toBeGreaterThan(0);
  });

  it('los filtros se combinan, no se pisan', async () => {
    const soloEtapa = await pintar('/?etapa=primaria-c1');
    const etapaYEje = await pintar('/?etapa=primaria-c1&eje=pulso');
    expect(etapaYEje.length).toBeGreaterThan(0);
    expect(etapaYEje.length).toBeLessThan(soloEtapa.length);
  });

  it('un filtro sin resultados no rompe la pantalla', async () => {
    expect(await pintar('/?q=zzzzz')).toEqual([]);
  });

  it('los instrumentos puros no salen aquí', async () => {
    // Tienen su propia pantalla. Un maestro que busca qué hacer en clase no debería tener
    // que descartar el afinador y el metrónomo uno a uno.
    const todas = await pintar('/');
    expect(todas).not.toContain('Afinador visual');
    expect(todas).not.toContain('Metrónomo y calibrador');
  });

  it('pero una actividad que ADEMÁS es herramienta sí sale', async () => {
    // El editor de melodías tiene criterio curricular: quien lo busca por el 4.1 tiene que
    // encontrarlo. Ser las dos cosas no es duplicar.
    expect(await pintar('/')).toContain('Editor de melodías');
  });
});
