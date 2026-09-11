import { describe, expect, it } from 'vitest';
import { REFRACTARIO_MS } from '@/motor/maquinaReaccion';
import {
  ESTADO_INICIAL,
  esperaMs,
  pistaPara,
  reducir,
  type EstadoEleccion,
} from '../src/motor/maquinaEleccion';

/**
 * Estos tests no comprueban que el componente se pinte bien: comprueban que las reglas de
 * producto de CLAUDE.md §4 se cumplen. «El error nunca castiga» es una promesa que se le
 * hace a un maestro, y una promesa que no está en un test es una intención.
 */

const TOTAL = 3;
const paso = (e: EstadoEleccion, a: Parameters<typeof reducir>[1]) => reducir(e, a, TOTAL);
const fallar = (e: EstadoEleccion) => paso(e, { tipo: 'elegir', clave: 'mal', respuesta: 'bien' });
const acertar = (e: EstadoEleccion) => paso(e, { tipo: 'elegir', clave: 'bien', respuesta: 'bien' });
const seguir = (e: EstadoEleccion) => paso(e, { tipo: 'seguir' });

describe('máquina del tipo elección', () => {
  it('un fallo NO termina la actividad ni hace avanzar', () => {
    let e = ESTADO_INICIAL;
    for (let i = 0; i < 20; i++) {
      e = seguir(fallar(e));
      expect(e.fase).not.toBe('completada');
      expect(e.indice).toBe(0);
    }
    // Y después de veinte fallos, acertar sigue funcionando igual que la primera vez.
    e = acertar(e);
    expect(e.fase).toBe('bien');
    expect(e.aciertos).toBe(1);
  });

  it('no hay vidas: el número de fallos no limita nada', () => {
    let e = ESTADO_INICIAL;
    for (let i = 0; i < 50; i++) e = seguir(fallar(e));
    expect(e.intentos).toBe(50);
    // Se completa igual, con 50 fallos a la espalda.
    for (let i = 0; i < TOTAL; i++) e = seguir(acertar(e));
    expect(e.fase).toBe('completada');
  });

  it('ignora los toques mientras se muestra el feedback', () => {
    // Un niño de cuatro años toca tres veces seguidas. Debe contar UN intento.
    let e = acertar(ESTADO_INICIAL);
    expect(e.intentos).toBe(1);
    e = acertar(e);
    e = fallar(e);
    expect(e.intentos).toBe(1);
    expect(e.aciertos).toBe(1);
    expect(e.fase).toBe('bien');
  });

  it('avanza un estímulo por acierto y termina en el último', () => {
    let e = ESTADO_INICIAL;
    e = seguir(acertar(e));
    expect(e).toMatchObject({ fase: 'estimulo', indice: 1 });
    e = seguir(acertar(e));
    expect(e).toMatchObject({ fase: 'estimulo', indice: 2 });
    e = seguir(acertar(e));
    expect(e).toMatchObject({ fase: 'completada', aciertos: 3, intentos: 3 });
  });

  it('un fallo vuelve al mismo estímulo, no al siguiente', () => {
    let e = seguir(acertar(ESTADO_INICIAL)); // estamos en el índice 1
    e = fallar(e);
    expect(e.fase).toBe('casi');
    e = seguir(e);
    expect(e).toMatchObject({ fase: 'estimulo', indice: 1 });
  });

  it('los fallos del estímulo se reinician al pasar al siguiente', () => {
    let e = fallar(fallar(ESTADO_INICIAL) as EstadoEleccion);
    e = seguir(fallar(seguir(e)));
    expect(e.fallosAqui).toBeGreaterThan(0);
    e = seguir(acertar(seguir(e)));
    expect(e.fallosAqui).toBe(0);
  });

  it('una vez completada, nada la reabre', () => {
    let e = ESTADO_INICIAL;
    for (let i = 0; i < TOTAL; i++) e = seguir(acertar(e));
    expect(e.fase).toBe('completada');
    const congelado = { ...e };
    e = fallar(e);
    e = acertar(e);
    e = seguir(e);
    expect(e).toEqual(congelado);
  });

  it('tras un fallo se puede corregir al instante: solo el refractario del doble toque', () => {
    // La pista se queda encima sin bloquear. Lo pidió el autor el 2026-09-12: «cuando me
    // equivoco y toco rápido para corregir, no me valida la nota».
    expect(esperaMs('casi')).toBe(REFRACTARIO_MS);
    expect(esperaMs('casi')).toBeLessThan(esperaMs('bien'));
    expect(esperaMs('casi')).toBeLessThan(1000);
  });

  describe('pistas', () => {
    const pistas = ['escucha otra vez', 'la primera es más grave'];

    it('no da pista si aún no ha fallado', () => {
      expect(pistaPara(pistas, 0)).toBeNull();
    });

    it('da una pista distinta por cada fallo, y repite la última', () => {
      expect(pistaPara(pistas, 1)).toBe('escucha otra vez');
      expect(pistaPara(pistas, 2)).toBe('la primera es más grave');
      expect(pistaPara(pistas, 9)).toBe('la primera es más grave');
    });

    it('aguanta una actividad sin pistas', () => {
      expect(pistaPara(undefined, 3)).toBeNull();
      expect(pistaPara([], 3)).toBeNull();
    });
  });
});
