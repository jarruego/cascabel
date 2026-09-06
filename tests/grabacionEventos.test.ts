import { describe, expect, it, vi } from 'vitest';
import {
  GrabadorDeEventos,
  reproducir,
  transportar,
  type Grabacion,
} from '@/motor/grabacionEventos';

describe('grabar gestos y no audio', () => {
  it('el reloj arranca con la primera nota, no al pulsar grabar', () => {
    /*
      Si arrancara al pulsar, todo el rato que el niño tarda en decidirse quedaría grabado
      como silencio inicial y al reproducir habría que esperarlo otra vez. Es el mismo
      criterio que en las actividades de ritmo: el primer gesto fija el origen.
    */
    const g = new GrabadorDeEventos();
    g.empezar();
    g.anotar('C4', 8000);
    g.anotar('E4', 8500);
    expect(g.terminar().eventos.map((e) => e.ms)).toEqual([0, 500]);
  });

  it('conserva las distancias entre notas', () => {
    const g = new GrabadorDeEventos();
    g.empezar();
    g.anotar('C4', 1000);
    g.anotar('D4', 1250);
    g.anotar('E4', 2000);
    expect(g.terminar().eventos.map((e) => e.ms)).toEqual([0, 250, 1000]);
  });

  it('empezar de nuevo tira lo anterior', () => {
    const g = new GrabadorDeEventos();
    g.empezar();
    g.anotar('C4', 0);
    g.empezar();
    expect(g.vacia).toBe(true);
  });

  it('una grabación vacía dura cero y no revienta al reproducirse', () => {
    const g = new GrabadorDeEventos();
    g.empezar();
    const vacia = g.terminar();
    expect(vacia.duracionMs).toBe(0);
    const tocar = vi.fn();
    reproducir(vacia, tocar, 0);
    expect(tocar).not.toHaveBeenCalled();
  });

  it('deja cola tras la última nota, para que no acabe en seco', () => {
    const g = new GrabadorDeEventos();
    g.empezar();
    g.anotar('C4', 0);
    g.anotar('D4', 1000);
    expect(g.terminar().duracionMs).toBeGreaterThan(1000);
  });
});

describe('reproducir', () => {
  const grabacion: Grabacion = {
    eventos: [
      { nota: 'C4', ms: 0 },
      { nota: 'E4', ms: 500 },
      { nota: 'G4', ms: 1000 },
    ],
    duracionMs: 1600,
  };

  it('programa todo contra el reloj de audio, en segundos', () => {
    const tocar = vi.fn();
    reproducir(grabacion, tocar, 10);
    expect(tocar.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ['C4', 10],
      ['E4', 10.5],
      ['G4', 11],
    ]);
  });

  it('a media velocidad, las distancias se doblan', () => {
    const tocar = vi.fn();
    reproducir(grabacion, tocar, 0, 0.5);
    expect(tocar.mock.calls.map((c) => c[1])).toEqual([0, 1, 2]);
  });

  it('una velocidad absurda no rompe la reproducción', () => {
    const tocar = vi.fn();
    reproducir(grabacion, tocar, 0, 0);
    expect(tocar.mock.calls.map((c) => c[1])).toEqual([0, 0.5, 1]);
  });
});

describe('transportar', () => {
  const grabacion: Grabacion = {
    eventos: [{ nota: 'C4', ms: 0 }, { nota: 'E4', ms: 500 }],
    duracionMs: 1100,
  };

  it('sube todas las notas por igual', () => {
    expect(transportar(grabacion, 2).eventos.map((e) => e.nota)).toEqual(['D4', 'F#4']);
  });

  it('cruza la octava sin perderse', () => {
    const alto: Grabacion = { eventos: [{ nota: 'B4', ms: 0 }], duracionMs: 600 };
    expect(transportar(alto, 1).eventos[0]!.nota).toBe('C5');
  });

  it('baja igual de bien', () => {
    const bajo: Grabacion = { eventos: [{ nota: 'C4', ms: 0 }], duracionMs: 600 };
    expect(transportar(bajo, -1).eventos[0]!.nota).toBe('B3');
  });

  it('no toca los tiempos', () => {
    expect(transportar(grabacion, 5).eventos.map((e) => e.ms)).toEqual([0, 500]);
  });

  it('transportar cero deja todo igual', () => {
    expect(transportar(grabacion, 0).eventos).toEqual(grabacion.eventos);
  });
});
