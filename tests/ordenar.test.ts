import { describe, expect, it } from 'vitest';
import {
  inicial,
  pendientes,
  reducirOrdenar,
  type EstadoOrdenar,
} from '../src/motor/maquinaOrdenar';

/**
 * El orden correcto de la actividad de ejemplo: tres sonidos de grave a agudo.
 */
const CORRECTO = ['grave', 'medio', 'agudo'];

const desde = (...acciones: Parameters<typeof reducirOrdenar>[1][]): EstadoOrdenar =>
  acciones.reduce((e, a) => reducirOrdenar(e, a, CORRECTO), inicial(CORRECTO.length));

describe('elegir antes de colocar', () => {
  /*
    Es la corrección que pidió el autor: antes, tocar un elemento lo colocaba en el acto, así
    que había que decidir con el mismo gesto con el que escuchabas. En una actividad donde
    hay que COMPARAR sonidos eso hacía imposible la mitad del ejercicio.
  */
  it('tocar un elemento no lo coloca, solo lo elige', () => {
    const e = desde({ tipo: 'elegir', clave: 'medio' });
    expect(e.elegida).toBe('medio');
    expect(e.casillas).toEqual([null, null, null]);
  });

  it('tocar otro elemento cambia la elección y no coloca nada', () => {
    const e = desde({ tipo: 'elegir', clave: 'medio' }, { tipo: 'elegir', clave: 'agudo' });
    expect(e.elegida).toBe('agudo');
    expect(e.casillas).toEqual([null, null, null]);
  });

  it('tocar lo ya elegido lo suelta: arrepentirse es gratis', () => {
    const e = desde({ tipo: 'elegir', clave: 'medio' }, { tipo: 'elegir', clave: 'medio' });
    expect(e.elegida).toBeNull();
  });

  it('una casilla sin nada elegido no hace nada', () => {
    expect(desde({ tipo: 'colocar', indice: 0 }).casillas).toEqual([null, null, null]);
  });

  it('coloca en la casilla que se toca, no al final', () => {
    // Poder colocar la tercera antes que la primera es lo que permite ordenar comparando.
    const e = desde({ tipo: 'elegir', clave: 'agudo' }, { tipo: 'colocar', indice: 2 });
    expect(e.casillas).toEqual([null, null, 'agudo']);
    expect(e.elegida).toBeNull();
  });
});

describe('recoger lo ya colocado', () => {
  it('tocar un colocado lo devuelve a la mano y lo deja elegido', () => {
    const e = desde(
      { tipo: 'elegir', clave: 'grave' },
      { tipo: 'colocar', indice: 0 },
      { tipo: 'elegir', clave: 'grave' },
    );
    expect(e.casillas).toEqual([null, null, null]);
    expect(e.elegida).toBe('grave');
  });

  it('se puede recoger cualquiera, no solo el último', () => {
    // Es lo que sustituye al «deshacer», que solo dejaba corregir en orden inverso.
    const e = desde(
      { tipo: 'elegir', clave: 'grave' },
      { tipo: 'colocar', indice: 0 },
      { tipo: 'elegir', clave: 'medio' },
      { tipo: 'colocar', indice: 1 },
      { tipo: 'elegir', clave: 'grave' },
    );
    expect(e.casillas).toEqual([null, 'medio', null]);
    expect(e.elegida).toBe('grave');
  });

  it('colocar sobre una casilla ocupada devuelve lo que había a la mano', () => {
    // Nada se pierde por tocar donde no era: lo desalojado queda cogido y se recoloca.
    const e = desde(
      { tipo: 'elegir', clave: 'grave' },
      { tipo: 'colocar', indice: 0 },
      { tipo: 'elegir', clave: 'agudo' },
      { tipo: 'colocar', indice: 0 },
    );
    expect(e.casillas).toEqual(['agudo', null, null]);
    expect(e.elegida).toBe('grave');
  });
});

describe('colocar mal no se impide', () => {
  it('se deja colocar en el orden equivocado', () => {
    // Rechazar el toque en el momento convertiría esto en un cerrojo que hay que adivinar.
    const e = desde(
      { tipo: 'elegir', clave: 'agudo' },
      { tipo: 'colocar', indice: 0 },
      { tipo: 'elegir', clave: 'grave' },
      { tipo: 'colocar', indice: 1 },
    );
    expect(e.casillas).toEqual(['agudo', 'grave', null]);
    expect(e.fase).toBe('colocando');
  });
});

describe('comprobar', () => {
  const lleno = (orden: string[]) =>
    orden.reduce(
      (e, clave, i) =>
        reducirOrdenar(
          reducirOrdenar(e, { tipo: 'elegir', clave }, CORRECTO),
          { tipo: 'colocar', indice: i },
          CORRECTO,
        ),
      inicial(CORRECTO.length),
    );

  it('no comprueba si falta alguna casilla', () => {
    const e = desde({ tipo: 'elegir', clave: 'grave' }, { tipo: 'colocar', indice: 0 });
    expect(reducirOrdenar(e, { tipo: 'comprobar' }, CORRECTO).fase).toBe('colocando');
  });

  it('el orden correcto completa la actividad', () => {
    const e = reducirOrdenar(lleno(CORRECTO), { tipo: 'comprobar' }, CORRECTO);
    expect(e.fase).toBe('completada');
    expect(e.fueraDeSitio).toEqual([]);
  });

  it('señala qué casillas están fuera de sitio', () => {
    const e = reducirOrdenar(lleno(['agudo', 'medio', 'grave']), { tipo: 'comprobar' }, CORRECTO);
    expect(e.fase).toBe('revisando');
    expect(e.fueraDeSitio).toEqual([0, 2]);
  });
});

describe('seguir tras un fallo', () => {
  it('vacía SOLO las casillas equivocadas y respeta los aciertos sueltos', () => {
    /*
      Con la lista compacta de antes esto no se podía hacer: quitar el primero le cambiaba
      el índice al segundo y convertía un acierto en un error sin que el niño tocara nada.
      Con casillas numeradas, un acierto en la segunda sigue en la segunda pase lo que pase.
    */
    let e = inicial(3);
    for (const [i, clave] of ['agudo', 'medio', 'grave'].entries()) {
      e = reducirOrdenar(e, { tipo: 'elegir', clave }, CORRECTO);
      e = reducirOrdenar(e, { tipo: 'colocar', indice: i }, CORRECTO);
    }
    e = reducirOrdenar(e, { tipo: 'comprobar' }, CORRECTO);
    e = reducirOrdenar(e, { tipo: 'seguir' }, CORRECTO);

    expect(e.fase).toBe('colocando');
    expect(e.casillas).toEqual([null, 'medio', null]);
    expect(e.elegida).toBeNull();
  });
});

describe('los que quedan en la mano', () => {
  it('excluye los colocados', () => {
    expect(pendientes(CORRECTO, [null, 'medio', null])).toEqual(['grave', 'agudo']);
  });

  it('con todo colocado no queda ninguno', () => {
    expect(pendientes(CORRECTO, ['grave', 'medio', 'agudo'])).toEqual([]);
  });
});
