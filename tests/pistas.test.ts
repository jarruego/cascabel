import { describe, expect, it } from 'vitest';
import {
  INICIAL_PISTAS,
  clavePista,
  loQueSuena,
  reducirPistas,
  tieneAlgo,
  type AccionPistas,
  type EstadoPistas,
  type Pista,
} from '@/motor/maquinaPistas';

const PISTAS: Pista[] = [
  { clave: 'melodia', clase: 'melodica', filas: ['G4', 'E4', 'C4'], instrumento: 'flauta' },
  { clave: 'ritmo', clase: 'percusion', filas: ['caja', 'bombo'] },
];

const desde = (...acciones: AccionPistas[]): EstadoPistas =>
  acciones.reduce(reducirPistas, INICIAL_PISTAS);

describe('encender y apagar casillas', () => {
  it('cada pista tiene sus propias casillas', () => {
    // La misma fila y columna en dos pistas son dos casillas distintas: si compartieran
    // clave, escribir en la melodía escribiría también en el ritmo.
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 0 },
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
    );
    expect(e.encendidas.size).toBe(2);
    expect(e.encendidas.has(clavePista('melodia', 0, 0))).toBe(true);
    expect(e.encendidas.has(clavePista('ritmo', 0, 0))).toBe(true);
  });

  it('tocar dos veces la misma casilla la apaga', () => {
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 1, columna: 2 },
      { tipo: 'alternar', pista: 'melodia', fila: 1, columna: 2 },
    );
    expect(e.encendidas.size).toBe(0);
  });
});

describe('silenciar', () => {
  it('silenciar NO borra: las casillas siguen ahí', () => {
    /*
      Es la razón de ser del botón. Si silenciar borrara, no serviría para lo único que
      sirve: oír cómo suena con esa pista y sin ella. Tiene que poder volver.
    */
    const e = desde(
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
      { tipo: 'silenciar', pista: 'ritmo' },
    );
    expect(e.encendidas.size).toBe(1);
    expect(e.silenciadas.has('ritmo')).toBe(true);
  });

  it('una pista silenciada no suena, aunque tenga casillas', () => {
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 0 },
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
      { tipo: 'silenciar', pista: 'ritmo' },
    );
    const suena = loQueSuena(e, PISTAS, 0);
    expect(suena).toHaveLength(1);
    expect(suena[0]!.pista.clave).toBe('melodia');
  });

  it('volver a pulsar la devuelve', () => {
    const e = desde(
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
      { tipo: 'silenciar', pista: 'ritmo' },
      { tipo: 'silenciar', pista: 'ritmo' },
    );
    expect(loQueSuena(e, PISTAS, 0)).toHaveLength(1);
  });
});

describe('qué suena en cada columna', () => {
  it('varias voces a la vez, que es toda la idea', () => {
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 3 },
      { tipo: 'alternar', pista: 'ritmo', fila: 1, columna: 3 },
    );
    const suena = loQueSuena(e, PISTAS, 3);
    expect(suena).toHaveLength(2);
    expect(suena.map((s) => s.pista.filas[s.fila])).toEqual(['G4', 'bombo']);
  });

  it('una columna vacía no suena', () => {
    const e = desde({ tipo: 'alternar', pista: 'melodia', fila: 0, columna: 3 });
    expect(loQueSuena(e, PISTAS, 4)).toEqual([]);
  });

  it('dos notas de la misma pista en la misma columna son un acorde', () => {
    // No se impide: dos casillas en la misma columna de una pista melódica suenan a la vez,
    // y eso es un acorde. Prohibirlo cerraría la puerta a algo que a estas edades ya se oye.
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 0 },
      { tipo: 'alternar', pista: 'melodia', fila: 2, columna: 0 },
    );
    expect(loQueSuena(e, PISTAS, 0)).toHaveLength(2);
  });
});

describe('limpiar', () => {
  it('limpiar una pista deja las otras intactas', () => {
    // Es lo que se hace cuando algo no encaja: se rehace la que estorba, no todo.
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 0 },
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
      { tipo: 'limpiarPista', pista: 'ritmo' },
    );
    expect(e.encendidas.size).toBe(1);
    expect(tieneAlgo(e, 'melodia')).toBe(true);
    expect(tieneAlgo(e, 'ritmo')).toBe(false);
  });

  it('limpiar todo vacía las casillas pero no los silencios', () => {
    const e = desde(
      { tipo: 'alternar', pista: 'melodia', fila: 0, columna: 0 },
      { tipo: 'silenciar', pista: 'ritmo' },
      { tipo: 'limpiarTodo' },
    );
    expect(e.encendidas.size).toBe(0);
    expect(e.silenciadas.has('ritmo')).toBe(true);
  });

  it('una pista que se llama como el prefijo de otra no se lleva sus casillas por delante', () => {
    /*
      `limpiarPista` filtra por prefijo, así que «ritmo» podría llevarse «ritmo2» si el
      separador no estuviera. Está: la clave es «pista:fila,columna» y se filtra por
      «pista:», con los dos puntos incluidos.
    */
    const e = desde(
      { tipo: 'alternar', pista: 'ritmo', fila: 0, columna: 0 },
      { tipo: 'alternar', pista: 'ritmo2', fila: 0, columna: 0 },
      { tipo: 'limpiarPista', pista: 'ritmo' },
    );
    expect(tieneAlgo(e, 'ritmo2')).toBe(true);
  });
});

describe('reproducción', () => {
  it('parar devuelve el cursor a ninguna columna', () => {
    const e = desde(
      { tipo: 'sonando', valor: true },
      { tipo: 'columna', valor: 5 },
      { tipo: 'sonando', valor: false },
    );
    expect(e.columna).toBe(-1);
    expect(e.sonando).toBe(false);
  });
});
