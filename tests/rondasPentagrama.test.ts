import { describe, expect, it } from 'vitest';
import { rondasPentagrama } from '@/motor/rondasPentagrama';

/** Las quince notas de do4 a do6: tres «do» y dos de cada una de las demás. */
const QUINCE = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'];

describe('las rondas del pentagrama de do a do', () => {
  const rondas = rondasPentagrama(QUINCE, 6, 7);

  it('cada sitio se pregunta exactamente una vez', () => {
    expect(rondas).toHaveLength(15);
    expect([...rondas.map((r) => r.pedida)].sort((a, b) => a - b)).toEqual(QUINCE.map((_, i) => i));
  });

  it('la regla del autor: nunca se dibuja una nota repetida, y la pedida está dibujada', () => {
    for (const r of rondas) {
      expect(r.dibujadas).toHaveLength(6);
      expect(r.dibujadas).toContain(r.pedida);
      const nombres = r.dibujadas.map((i) => QUINCE[i]);
      expect(new Set(nombres).size, nombres.join(' ')).toBe(nombres.length);
    }
  });

  it('no pregunta dos veces seguidas el mismo nombre', () => {
    for (let i = 1; i < rondas.length; i++) {
      expect(QUINCE[rondas[i]!.pedida]).not.toBe(QUINCE[rondas[i - 1]!.pedida]);
    }
  });

  it('los dibujados no salen de grave a agudo', () => {
    // Con quince rondas de seis, alguna estaría ordenada por casualidad; todas, no.
    const ordenadas = rondas.filter((r) => r.dibujadas.every((x, i) => i === 0 || x > r.dibujadas[i - 1]!));
    expect(ordenadas.length).toBeLessThan(rondas.length / 2);
  });

  it('con más sitios por ronda que nombres distintos, dibuja uno por nombre', () => {
    const r = rondasPentagrama(QUINCE, 12, 1);
    for (const ronda of r) expect(ronda.dibujadas).toHaveLength(7);
  });

  it('es determinista para una semilla', () => {
    expect(rondasPentagrama(QUINCE, 6, 99)).toEqual(rondasPentagrama(QUINCE, 6, 99));
  });
});
