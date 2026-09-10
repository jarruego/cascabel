import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { codigoDe } from '../src/motor/codigo';

describe('el código corto de una actividad', () => {
  it('sale del identificador: la etapa da la primera cifra', () => {
    expect(codigoDe('inf-23-sube-o-baja')).toBe('023');
    expect(codigoDe('c1-07-canta-la-nota')).toBe('107');
    expect(codigoDe('c2-05-toca-con-la-flauta')).toBe('205');
    expect(codigoDe('c3-41-memory-de-instrumentos-tocados')).toBe('341');
    expect(codigoDe('tr-05-piano')).toBe('905');
  });

  it('lo que no es un identificador de actividad no tiene código', () => {
    expect(codigoDe('piano')).toBe('');
    expect(codigoDe('')).toBe('');
  });

  it('en el catálogo no se repite ninguno y todos tienen tres cifras', () => {
    const DIR = join(__dirname, '..', 'content', 'actividades');
    const codigos = readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => codigoDe(f.replace(/\.json$/, '')));
    expect(codigos.every((c) => /^\d{3}$/.test(c)), codigos.filter((c) => !/^\d{3}$/.test(c)).join(',')).toBe(true);
    const repetidos = codigos.filter((c, i) => codigos.indexOf(c) !== i);
    expect(repetidos).toEqual([]);
  });
});
