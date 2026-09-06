import { describe, expect, it } from 'vitest';
import {
  INICIAL_REJILLA,
  clave,
  notasDeColumna,
  reducirRejilla,
  type AccionRejilla,
  type EstadoRejilla,
  type ModoRejilla,
} from '../src/motor/maquinaRejilla';

const FILAS = 4;
const COLS = 8;

const p = (e: EstadoRejilla, a: AccionRejilla, modo: ModoRejilla = 'dictado') =>
  reducirRejilla(e, a, modo, FILAS, COLS);
const tocar = (e: EstadoRejilla, f: number, c: number, m: ModoRejilla = 'dictado') =>
  p(e, { tipo: 'alternar', fila: f, columna: c }, m);

describe('rejilla', () => {
  it('tocar enciende y volver a tocar apaga', () => {
    let e = tocar(INICIAL_REJILLA, 1, 2);
    expect(e.encendidas.has(clave(1, 2))).toBe(true);
    e = tocar(e, 1, 2);
    expect(e.encendidas.has(clave(1, 2))).toBe(false);
  });

  it('ignora celdas fuera de la cuadrícula en vez de crearlas', () => {
    expect(tocar(INICIAL_REJILLA, -1, 0).encendidas.size).toBe(0);
    expect(tocar(INICIAL_REJILLA, FILAS, 0).encendidas.size).toBe(0);
    expect(tocar(INICIAL_REJILLA, 0, COLS).encendidas.size).toBe(0);
  });

  describe('modo libre: no existe el error', () => {
    // Es la regla de Incredibox que el dosier señala como el mejor modelo de motivación
    // infantil: si todo suena bien, explorar es lo divertido.
    it('comprobar no hace nada', () => {
      const e = tocar(INICIAL_REJILLA, 0, 0, 'libre');
      const despues = p(e, { tipo: 'comprobar', solucion: [clave(3, 3)] }, 'libre');
      expect(despues).toEqual(e);
      expect(despues.fase).toBe('editando');
      expect(despues.intentos).toBe(0);
    });

    it('nunca se completa ni se bloquea: es un lienzo', () => {
      let e = INICIAL_REJILLA;
      for (let i = 0; i < 20; i++) e = tocar(e, i % FILAS, i % COLS, 'libre');
      expect(e.fase).toBe('editando');
    });
  });

  describe('modo dictado', () => {
    const solucion = [clave(0, 0), clave(1, 2), clave(2, 4)];

    it('se completa cuando coincide exactamente', () => {
      let e = INICIAL_REJILLA;
      e = tocar(tocar(tocar(e, 0, 0), 1, 2), 2, 4);
      e = p(e, { tipo: 'comprobar', solucion });
      expect(e.fase).toBe('completada');
      expect(e.sobran.size + e.faltan.size).toBe(0);
    });

    it('distingue lo que sobra de lo que falta', () => {
      // Poner de más y de menos no es el mismo error, y al niño hay que decírselo
      // distinto: «esta sobra» no es lo mismo que «te falta una».
      let e = tocar(tocar(INICIAL_REJILLA, 0, 0), 3, 7);
      e = p(e, { tipo: 'comprobar', solucion });
      expect(e.fase).toBe('revisando');
      expect([...e.sobran]).toEqual([clave(3, 7)]);
      expect([...e.faltan].sort()).toEqual([clave(1, 2), clave(2, 4)]);
    });

    it('un fallo NO borra lo que el niño había puesto', () => {
      let e = tocar(tocar(INICIAL_REJILLA, 0, 0), 3, 7);
      e = p(p(e, { tipo: 'comprobar', solucion }), { tipo: 'seguir' });
      expect(e.fase).toBe('editando');
      expect(e.encendidas.has(clave(0, 0))).toBe(true);
    });

    it('tocar una celda borra las marcas del intento anterior', () => {
      // Si no, el niño sigue viendo señalado un error que ya ha corregido.
      let e = p(tocar(INICIAL_REJILLA, 3, 7), { tipo: 'comprobar', solucion });
      expect(e.sobran.size).toBeGreaterThan(0);
      e = tocar(e, 3, 7);
      expect(e.sobran.size).toBe(0);
      expect(e.faltan.size).toBe(0);
    });

    it('un fallo no termina nunca la actividad, por muchas veces que ocurra', () => {
      let e = tocar(INICIAL_REJILLA, 3, 7);
      for (let i = 0; i < 25; i++) {
        e = p(e, { tipo: 'comprobar', solucion });
        expect(e.fase).toBe('revisando');
        e = p(e, { tipo: 'seguir' });
      }
      expect(e.intentos).toBe(25);
    });

    it('una vez completada, nada la reabre', () => {
      let e = tocar(tocar(tocar(INICIAL_REJILLA, 0, 0), 1, 2), 2, 4);
      e = p(e, { tipo: 'comprobar', solucion });
      const congelado = { ...e };
      e = tocar(e, 3, 3);
      e = p(e, { tipo: 'limpiar' });
      expect(e).toEqual(congelado);
    });
  });

  it('notasDeColumna da lo que suena en cada pulso, de grave a agudo', () => {
    let e = INICIAL_REJILLA;
    e = tocar(tocar(tocar(e, 2, 1), 0, 1), 3, 5);
    expect(notasDeColumna(e.encendidas, 1)).toEqual([0, 2]);
    expect(notasDeColumna(e.encendidas, 5)).toEqual([3]);
    expect(notasDeColumna(e.encendidas, 7)).toEqual([]);
  });
});
