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

describe('grabando: el estado que el botón consulta', () => {
  /*
    Este bloque existe por un fallo real que los tests anteriores no cogían porque llamaban
    a `anotar` directamente, sin preguntar antes si estaba grabando. `grabando` se deducía
    del instante de la primera nota, que no se fija hasta que hay una nota; y quien llama
    comprueba `grabando` antes de anotar. Nunca había primera nota, así que nunca empezaba
    a grabar, así que nunca había primera nota. El botón se encendía y no guardaba nada.
  */
  it('está grabando desde que se pulsa, aunque todavía no haya sonado nada', () => {
    const g = new GrabadorDeEventos();
    expect(g.grabando).toBe(false);
    g.empezar();
    expect(g.grabando).toBe(true);
  });

  it('graba de verdad cuando quien llama comprueba `grabando` antes', () => {
    // La secuencia exacta que hace el piano, que es donde se rompía.
    const g = new GrabadorDeEventos();
    g.empezar();
    for (const [nota, ms] of [['C4', 100], ['E4', 600]] as const) {
      if (g.grabando) g.anotar(nota, ms);
    }
    const grabacion = g.terminar();
    expect(grabacion.eventos.map((e) => e.nota)).toEqual(['C4', 'E4']);
    expect(grabacion.eventos.map((e) => e.ms)).toEqual([0, 500]);
  });

  it('deja de grabar al terminar', () => {
    const g = new GrabadorDeEventos();
    g.empezar();
    g.anotar('C4', 0);
    g.terminar();
    expect(g.grabando).toBe(false);
    // Y lo que se toque después ya no entra.
    g.anotar('D4', 1000);
    expect(g.vacia).toBe(false);
  });

  it('anotar sin haber empezado no guarda nada', () => {
    const g = new GrabadorDeEventos();
    g.anotar('C4', 0);
    expect(g.vacia).toBe(true);
  });
});
