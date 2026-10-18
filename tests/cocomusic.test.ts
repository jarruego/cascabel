import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { vinculosDe, type DatosCocomusic } from '@/datos/cocomusic';

/**
 * Los vínculos con cocomusic llegan de otra web y acaban en un `href`. Lo que se vigila es
 * que solo se conviertan en enlace los que apuntan a cocomusic.es con una ruta normal.
 */

const BASE = 'https://cocomusic.es';

function datos(paginas: DatosCocomusic['actividades'][string], base = BASE): DatosCocomusic {
  return { base, actividades: { 'c3-45-x': paginas } };
}

describe('vinculosDe', () => {
  it('construye la URL completa y pone la ficha primero', () => {
    const v = vinculosDe(
      datos([
        { titulo: 'Entrada', tipo: 'entrada', ruta: '/musicograma/' },
        { titulo: 'Ficha', tipo: 'ficha', ruta: '/ficha-musica/m/' },
      ]),
      'c3-45-x',
    );
    expect(v).toEqual([
      { titulo: 'Ficha', tipo: 'ficha', url: 'https://cocomusic.es/ficha-musica/m/' },
      { titulo: 'Entrada', tipo: 'entrada', url: 'https://cocomusic.es/musicograma/' },
    ]);
  });

  it('una actividad sin vínculos, o sin datos, no da ninguno', () => {
    expect(vinculosDe(datos([]), 'otra')).toEqual([]);
    expect(vinculosDe(null, 'c3-45-x')).toEqual([]);
  });

  it('descarta lo que llevaría a otro sitio', () => {
    const v = vinculosDe(
      datos([
        { titulo: 'Otro origen', ruta: '//malo.example/x' },
        { titulo: 'Absoluta', ruta: 'https://malo.example/' },
        { titulo: 'Script', ruta: 'javascript:alert(1)' },
        { titulo: 'Barra invertida', ruta: '/\\malo.example' },
        { titulo: '', ruta: '/sin-titulo/' },
        { titulo: 'Buena', ruta: '/buena/' },
      ]),
      'c3-45-x',
    );
    expect(v.map((x) => x.titulo)).toEqual(['Buena']);
  });

  it('si la base no es cocomusic.es no sale nada', () => {
    expect(vinculosDe(datos([{ titulo: 'X', ruta: '/x/' }], 'https://malo.example'), 'c3-45-x')).toEqual([]);
  });

  it('no repite una misma página ni inventa tipos', () => {
    const v = vinculosDe(
      datos([
        { titulo: 'A', tipo: 'raro', ruta: '/a/' },
        { titulo: 'A otra vez', tipo: 'ficha', ruta: '/a/' },
      ]),
      'c3-45-x',
    );
    expect(v).toEqual([{ titulo: 'A', tipo: null, url: 'https://cocomusic.es/a/' }]);
  });

  it('la copia guardada en git solo vincula actividades que existen', () => {
    const raiz = join(__dirname, '..', 'content');
    const copia = JSON.parse(readFileSync(join(raiz, 'cocomusic.json'), 'utf8')) as DatosCocomusic;
    const indice = JSON.parse(readFileSync(join(raiz, 'indice.json'), 'utf8')) as { actividades: Array<{ id: string }> };
    const ids = new Set(indice.actividades.map((a) => a.id));
    expect(Object.keys(copia.actividades).filter((id) => !ids.has(id))).toEqual([]);
  });
});
