import { describe, expect, it } from 'vitest';
import {
  INICIAL_ORDENAR,
  pendientes,
  reducirOrdenar,
  type EstadoOrdenar,
} from '../src/motor/maquinaOrdenar';

const CORRECTO = ['grave', 'medio', 'agudo'];
const p = (e: EstadoOrdenar, a: Parameters<typeof reducirOrdenar>[1]) =>
  reducirOrdenar(e, a, CORRECTO);
const colocar = (e: EstadoOrdenar, clave: string) => p(e, { tipo: 'colocar', clave });
const comprobar = (e: EstadoOrdenar) => p(e, { tipo: 'comprobar' });
const seguir = (e: EstadoOrdenar) => p(e, { tipo: 'seguir' });

describe('máquina de ordenar', () => {
  it('coloca tocando en secuencia, sin arrastrar', () => {
    let e = colocar(colocar(colocar(INICIAL_ORDENAR, 'grave'), 'medio'), 'agudo');
    expect(e.colocadas).toEqual(CORRECTO);
    e = comprobar(e);
    expect(e.fase).toBe('completada');
  });

  it('NO rechaza un elemento colocado fuera de sitio', () => {
    // Rechazar el toque convertiría la actividad en un cerrojo que hay que adivinar.
    const e = colocar(INICIAL_ORDENAR, 'agudo');
    expect(e.colocadas).toEqual(['agudo']);
  });

  it('conserva el prefijo correcto y devuelve el resto', () => {
    let e = colocar(colocar(colocar(INICIAL_ORDENAR, 'grave'), 'agudo'), 'medio');
    e = comprobar(e);
    expect(e.fase).toBe('revisando');
    expect(e.fueraDeSitio).toEqual([1, 2]);
    e = seguir(e);
    // «grave» estaba bien y en su sitio: no se le vuelve a preguntar lo que ya sabía.
    expect(e.colocadas).toEqual(['grave']);
    expect(e.fase).toBe('colocando');
  });

  it('NO conserva un acierto suelto que quedaría descolocado', () => {
    // Coloca [agudo, medio, grave]: «medio» está en su sitio, pero el primero falla.
    // Si conserváramos «medio» a secas pasaría a ocupar la posición 0, que no es la suya:
    // un acierto convertido en error sin que el niño toque nada. Se devuelve todo.
    let e = colocar(colocar(colocar(INICIAL_ORDENAR, 'agudo'), 'medio'), 'grave');
    e = seguir(comprobar(e));
    expect(e.colocadas).toEqual([]);
  });

  it('deshacer es gratis y no cuenta como intento', () => {
    let e = colocar(colocar(INICIAL_ORDENAR, 'grave'), 'agudo');
    e = p(e, { tipo: 'deshacer' });
    expect(e.colocadas).toEqual(['grave']);
    expect(e.intentos).toBe(0);
  });

  it('no comprueba hasta que están todas colocadas', () => {
    const e = comprobar(colocar(INICIAL_ORDENAR, 'grave'));
    expect(e.fase).toBe('colocando');
    expect(e.intentos).toBe(0);
  });

  it('un fallo no termina la actividad, por muchas veces que ocurra', () => {
    let e = INICIAL_ORDENAR;
    for (let i = 0; i < 15; i++) {
      // Orden en el que NINGUNA posición acierta, así que cada vuelta deja el tablero
      // vacío y la siguiente es idéntica. Quince fallos seguidos.
      e = comprobar(colocar(colocar(colocar(e, 'medio'), 'agudo'), 'grave'));
      expect(e.fase).toBe('revisando');
      expect(e.fueraDeSitio).toEqual([0, 1, 2]);
      e = seguir(e);
      expect(e.colocadas).toEqual([]);
    }
    expect(e.intentos).toBe(15);
    // Y a la dieciseisava se completa igual que si fuera la primera.
    e = comprobar(colocar(colocar(colocar(e, 'grave'), 'medio'), 'agudo'));
    expect(e.fase).toBe('completada');
  });



  it('pendientes devuelve lo que queda por colocar', () => {
    expect(pendientes(CORRECTO, ['medio'])).toEqual(['grave', 'agudo']);
  });
});
