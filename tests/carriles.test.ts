import { describe, expect, it } from 'vitest';
import {
  MAX_OBJETOS,
  OBJETIVO_TACTIL,
  SEPARACION,
  carrilDe,
  carrilPorDefecto,
  carrilesDe,
  etapaDe,
  type Curso,
} from '../src/config';

/**
 * El ADR 0005 separa dos ejes que se parecen y no coinciden: la etapa (ciclo LOMLOE, capa
 * normativa) y el carril (presentación). El 2.º ciclo queda partido a propósito.
 *
 * Es justo el tipo de cosa que alguien «arreglará» dentro de seis meses creyendo que es un
 * error. Este test está aquí para que no lo haga.
 */

describe('carriles y etapas', () => {
  it('3.º va con los primeros lectores y 4.º con los autónomos, pese a compartir ciclo', () => {
    expect(etapaDe(3)).toBe('primaria-c2');
    expect(etapaDe(4)).toBe('primaria-c2');
    expect(carrilDe(3)).toBe('lectores');
    expect(carrilDe(4)).toBe('autonomos');
  });

  it('asigna un carril a cada curso', () => {
    const esperado: Array<[Curso, string]> = [
      ['infantil', 'infantil'],
      [1, 'lectores'],
      [2, 'lectores'],
      [3, 'lectores'],
      [4, 'autonomos'],
      [5, 'autonomos'],
      [6, 'autonomos'],
    ];
    for (const [curso, carril] of esperado) expect(carrilDe(curso)).toBe(carril);
  });

  it('mapea cada curso a su ciclo LOMLOE', () => {
    expect(etapaDe('infantil')).toBe('infantil');
    expect(etapaDe(1)).toBe('primaria-c1');
    expect(etapaDe(2)).toBe('primaria-c1');
    expect(etapaDe(5)).toBe('primaria-c3');
    expect(etapaDe(6)).toBe('primaria-c3');
  });

  it('una actividad de 2.º ciclo aparece en los dos carriles de Primaria', () => {
    expect(carrilesDe('primaria-c2')).toEqual(['lectores', 'autonomos']);
    expect(carrilesDe('primaria-c1')).toEqual(['lectores']);
    expect(carrilesDe('primaria-c3')).toEqual(['autonomos']);
    expect(carrilesDe('infantil')).toEqual(['infantil']);
  });

  it('el carril por defecto nunca deja botones más pequeños de lo debido', () => {
    // Ante la duda se elige el carril de los pequeños, que da objetivos más grandes.
    expect(carrilPorDefecto('primaria-c2')).toBe('lectores');
    expect(OBJETIVO_TACTIL[carrilPorDefecto('primaria-c2')]).toBeGreaterThanOrEqual(
      OBJETIVO_TACTIL.autonomos,
    );
  });

  it('los tamaños respetan WCAG 2.2 AA y decrecen con la edad', () => {
    for (const carril of ['infantil', 'lectores', 'autonomos'] as const) {
      // 2.5.8 pide 24 px. Para niños es el suelo, no la meta.
      expect(OBJETIVO_TACTIL[carril]).toBeGreaterThanOrEqual(24);
      expect(SEPARACION[carril]).toBeGreaterThanOrEqual(12);
    }
    expect(OBJETIVO_TACTIL.infantil).toBeGreaterThan(OBJETIVO_TACTIL.lectores);
    expect(OBJETIVO_TACTIL.lectores).toBeGreaterThan(OBJETIVO_TACTIL.autonomos);
    expect(MAX_OBJETOS.infantil).toBeLessThan(MAX_OBJETOS.lectores);
    expect(MAX_OBJETOS.lectores).toBeLessThan(MAX_OBJETOS.autonomos);
  });
});
