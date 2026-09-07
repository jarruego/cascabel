import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERSONAJES, POSES, personajeDe, rutaDe } from '@/ui/personajes';

/**
 * Los personajes de cocomusic.
 *
 * Dos clases de comprobación. La del **mapa nota → personaje**, donde el caso que importa
 * son los dos «do»: Dora abre y Doby cierra, y confundirlos pondría al personaje del final
 * del recorrido en la primera tecla del teclado.
 *
 * Y la de los **ficheros**, que es la que se rompe sola: un nombre mal escrito no da ningún
 * error —el componente cae a `neutro` y sigue, que es lo que se le pide— pero la pose no
 * aparece nunca y nadie se entera. Ya pasó con `doby-palmeea.svg`.
 */

const DIR = join(__dirname, '..', 'public', 'personajes');
const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.svg'));

describe('el mapa de notas', () => {
  it('cada nota de la escala tiene su personaje', () => {
    expect(personajeDe('C4')).toBe('dora');
    expect(personajeDe('D4')).toBe('rex');
    expect(personajeDe('E4')).toBe('milo');
    expect(personajeDe('F4')).toBe('fara');
    expect(personajeDe('G4')).toBe('sol');
    expect(personajeDe('A4')).toBe('laia');
    expect(personajeDe('B4')).toBe('simon');
  });

  it('el do de arriba es Doby, no Dora', () => {
    // Es el caso de todo el mapa: Doby cierra la octava y cierra el recorrido. Ponerlo en
    // la primera tecla sería contar la metodología al revés.
    expect(personajeDe('C5')).toBe('doby');
    expect(personajeDe('C4')).toBe('dora');
  });

  it('los sostenidos van con su nota natural', () => {
    // Un fa sostenido sigue siendo territorio de Fara: no hay personaje para las negras.
    expect(personajeDe('F#4')).toBe('fara');
  });

  it('una nota sin octava usa la de referencia', () => {
    expect(personajeDe('C')).toBe('dora');
  });

  it('lo que no es una nota no devuelve un personaje al azar', () => {
    expect(personajeDe('bombo')).toBeNull();
    expect(personajeDe('')).toBeNull();
  });
});

describe('los ficheros de dibujo', () => {
  it('hay al menos un personaje dibujado', () => {
    expect(ficheros.length).toBeGreaterThan(0);
  });

  it('todo fichero se llama <personaje>-<pose>.svg', () => {
    // Un nombre mal escrito no rompe nada: la pose simplemente no aparece nunca. Por eso
    // hace falta comprobarlo aquí y no descubrirlo mirando la pantalla.
    const validos = new Set<string>();
    for (const p of PERSONAJES) for (const pose of POSES) validos.add(`${p}-${pose}.svg`);
    // `-main` es la lámina de referencia del personaje, no una pose de la aplicación.
    const sueltos = ficheros.filter((f) => !validos.has(f) && !f.endsWith('-main.svg'));
    expect(sueltos).toEqual([]);
  });

  it('las poses de un mismo personaje comparten lienzo', () => {
    // Si no, el personaje cambia de tamaño y da un salto al cambiar de gesto. Lo unifica
    // `npm run personajes`, y esto comprueba que se ha pasado.
    const lienzos = new Set<string>();
    for (const f of ficheros) {
      if (f.endsWith('-main.svg')) continue;
      const svg = readFileSync(join(DIR, f), 'utf-8');
      const m = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
      expect(m, `${f}: sin viewBox normalizado; pasa \`npm run personajes\``).toBeTruthy();
      lienzos.add(`${m![1]}x${m![2]}`);
    }
    expect([...lienzos]).toHaveLength(1);
  });

  it('ningún dibujo lleva texto, que es lo que impediría traducirlo', () => {
    const conTexto = ficheros.filter((f) =>
      /<text|font-family/.test(readFileSync(join(DIR, f), 'utf-8')),
    );
    expect(conTexto).toEqual([]);
  });

  it('la ruta que construye el código es la que existe en disco', () => {
    // Comprobado contra un fichero de verdad: si `rutaDe` cambiara de forma, el componente
    // pediría una ruta que no está y caería a `neutro` en silencio.
    const alguno = ficheros.find((f) => f.endsWith('-neutro.svg'));
    expect(alguno).toBeTruthy();
    const personaje = alguno!.replace('-neutro.svg', '') as (typeof PERSONAJES)[number];
    expect(rutaDe(personaje, 'neutro')).toBe(`/personajes/${alguno}`);
  });
});
