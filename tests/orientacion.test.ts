import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { orientacionDe } from '../src/motor/orientacion';
import type { Actividad } from '../src/motor/tipos';

/**
 * En qué postura se pide la pantalla al ampliar.
 *
 * Ampliar pedía **apaisado siempre**, y eso giraba al revés justo las actividades donde las
 * notas caen de arriba abajo: cinco de las siete de karaoke. El recorrido de caída es toda
 * la actividad, y en apaisado se queda en nada.
 *
 * No lo cazaba nada porque no había nada que cazar: era una línea sin condición. Y probarlo
 * a mano exige un móvil, ampliar, y saber qué esperabas ver.
 */

const DIR = join(__dirname, '..', 'content', 'actividades');
const ACTIVIDADES = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as Actividad);

const de = (id: string) => {
  const a = ACTIVIDADES.find((x) => x.id === id);
  if (!a) throw new Error(`no existe ${id}`);
  return orientacionDe(a);
};

describe('la postura que pide cada actividad', () => {
  it('lo que cae pide vertical', () => {
    // El caso que destapó todo: notas que bajan hacia una línea. Girar a apaisado les
    // quitaba el recorrido, que es la actividad entera.
    for (const id of [
      'c1-14-notas-que-caen',
      'c1-18-la-escalera-que-cae',
      'c1-19-adivina-quien-baja',
      'c2-16-cuatro-bandas',
      'inf-16-animales-que-bajan',
    ]) {
      expect(de(id), id).toBe('vertical');
    }
  });

  it('lo que avanza de lado, y el teclado, piden apaisado', () => {
    expect(de('c2-15-lee-las-figuras'), 'musicograma sobre pentagrama').toBe('apaisado');
    expect(de('c2-14-himno-de-la-alegria'), 'karaoke sin orientación declarada').toBe('apaisado');
    expect(de('tr-05-piano'), 'un piano es ancho por definición').toBe('apaisado');
    expect(de('c1-01-ta-y-ti-ti'), 'musicograma en tira').toBe('apaisado');
    expect(de('c3-12-compon-por-pistas'), 'cuatro voces por dieciséis casillas').toBe('apaisado');
  });

  it('a la mayoría le da igual, y entonces no se toca la pantalla', () => {
    /*
      Es la respuesta que faltaba. Forzar un giro que no aporta nada es peor que no girar:
      sorprende, y deja al niño con el aparato en una postura que no eligió.
    */
    for (const id of [
      'inf-01-semaforo-del-sonido',
      'inf-10-cajas-de-sonidos',
      'c1-21-eco-a-dos',
      'tr-03-caja-de-sonidos',
      'c1-07-canta-la-nota',
      'c2-13-graba-tu-paisaje-sonoro',
    ]) {
      expect(de(id), id).toBe('cualquiera');
    }
  });

  it('la rejilla depende de cuánto mida', () => {
    // Con cuatro columnas cabe en cualquier postura y girarla sería marear por nada; con
    // ocho o más, en vertical las casillas dejan de ser un objetivo táctil.
    expect(de('c1-12-la-rueda-del-compas'), 'cuatro columnas').toBe('cualquiera');
    expect(de('c3-03-editor-de-melodias'), 'dieciséis columnas').toBe('apaisado');
  });

  it('la postura del karaoke coincide con la que dibuja el componente', () => {
    /*
      Si no coincidieran, la pantalla giraría hacia un lado y la actividad se dibujaría hacia
      el otro: el peor resultado posible, peor que no girar. El valor por defecto se calcula
      en dos sitios —aquí y en `Karaoke.tsx`— así que se comprueba que digan lo mismo.
    */
    const componente = readFileSync(
      join(__dirname, '..', 'src', 'motor', 'tipos', 'Karaoke.tsx'),
      'utf-8',
    );
    expect(componente, 'el componente ya no calcula así su orientación').toContain(
      "contenido.orientacion ?? (representacion === 'pentagrama' ? 'horizontal' : 'vertical')",
    );

    for (const a of ACTIVIDADES.filter((x) => x.tipo === 'karaoke')) {
      const c = a.contenido as { orientacion?: string; representacion?: string };
      const dibuja =
        c.orientacion ??
        ((c.representacion ?? 'pentagrama') === 'pentagrama' ? 'horizontal' : 'vertical');
      const pide = orientacionDe(a);
      expect(pide, `${a.id} se dibuja ${dibuja} y pide ${pide}`).toBe(
        dibuja === 'vertical' ? 'vertical' : 'apaisado',
      );
    }
  });

  it('ninguna actividad se queda sin respuesta', () => {
    for (const a of ACTIVIDADES) {
      expect(['apaisado', 'vertical', 'cualquiera'], a.id).toContain(orientacionDe(a));
    }
  });
});
