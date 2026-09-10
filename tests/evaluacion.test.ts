import { describe, expect, it } from 'vitest';
import { bastanteBien, evaluarRitmo, calidadDe } from '@/motor/evaluacion';

/**
 * Estos tests protegen la decisión pedagógica más importante del proyecto: que un
 * niño regular pero desfasado NO es un niño que falla.
 */
describe('evaluación rítmica', () => {
  const rejilla = [0, 500, 1000, 1500];

  it('reconoce un pulso perfecto', () => {
    const r = evaluarRitmo(rejilla, [10, 505, 995, 1502], 'primaria-c1');
    expect(r.aciertos).toBe(4);
    expect(Math.abs(r.desvioMedioMs)).toBeLessThan(20);
  });

  it('detecta al niño regular pero desfasado y no lo penaliza', () => {
    // Todas las palmadas 120 ms tarde, pero con una desviación de solo 5 ms.
    const r = evaluarRitmo(rejilla, [120, 622, 1118, 1625], 'primaria-c1');
    expect(r.regularPeroDesfasado).toBe(true);
    expect(r.desviacionTipicaMs).toBeLessThan(20);
    expect(r.desvioMedioMs).toBeGreaterThan(100);
  });

  it('no marca como desfasado a quien va irregular', () => {
    const r = evaluarRitmo(rejilla, [10, 700, 950, 1700], 'primaria-c1');
    expect(r.regularPeroDesfasado).toBe(false);
  });

  it('un golpe antes de tiempo quema su hueco, y el golpe bueno que venga detrás sobra', () => {
    // Se adelanta 400 ms al segundo hueco (la ventana de 1.º es ±300) y luego lo da bien.
    const r = evaluarRitmo(rejilla, [0, 100, 500, 1000, 1500], 'primaria-c1');
    expect(r.emparejados[1]!.calidad).toBe('fuera');
    expect(r.emparejados[1]!.realMs).toBeNull();
    // El tercero y el cuarto no pagan el adelanto del segundo.
    expect(r.emparejados[2]!.calidad).not.toBe('fuera');
    expect(r.emparejados[3]!.calidad).not.toBe('fuera');
    expect(r.aciertos).toBe(3);
    expect(r.sobrantes).toBe(1);
  });

  it('aporrear no rellena los huecos', () => {
    // Un golpe cada 100 ms durante toda la vuelta: antes había uno dentro de cada ventana.
    const golpes = Array.from({ length: 20 }, (_, i) => i * 100);
    const r = evaluarRitmo(rejilla, golpes, 'primaria-c1');
    // Cada hueco quemado bloquea el suyo, no el siguiente: aporreando se coge como mucho
    // uno de cada dos. Lo que lo descalifica es el recuento de golpes de más.
    expect(r.aciertos).toBeLessThanOrEqual(2);
    expect(r.sobrantes).toBeGreaterThan(10);
    expect(bastanteBien(r.aciertos, rejilla.length, r.sobrantes)).toBe(false);
  });

  it('un golpe tardío, pasada la ventana, no entra en el hueco de al lado', () => {
    // 850 está fuera del primero (500 ± 300) y aún fuera del segundo (1000 ± 300): sobra.
    const r = evaluarRitmo(rejilla, [0, 850, 1000, 1500], 'primaria-c1');
    expect(r.emparejados[1]!.calidad).toBe('fuera');
    expect(r.emparejados[2]!.calidad).not.toBe('fuera');
  });

  it('cuenta como fallada la palmada que no llega', () => {
    const r = evaluarRitmo(rejilla, [0, 500, 1000], 'primaria-c1');
    expect(r.emparejados[3]!.realMs).toBeNull();
    expect(r.emparejados[3]!.calidad).toBe('fuera');
  });

  it('usa tolerancias más generosas en Infantil que en tercer ciclo', () => {
    // 130 ms: en Infantil aún es un acierto pleno; en 5.º-6.º ya no lo es.
    expect(calidadDe(130, 'infantil')).toBe('perfecto');
    expect(calidadDe(130, 'primaria-c3')).toBe('bien');
    // 200 ms: separa claramente las dos etapas.
    expect(calidadDe(200, 'infantil')).toBe('bien');
    expect(calidadDe(200, 'primaria-c3')).toBe('casi');
  });
});

/**
 * La tolerancia se indexa por CARRIL (edad) y no por etapa (ciclo LOMLOE), porque lo que
 * mide es control motor. Decisión del 2026-09-06, documentada en src/config.ts.
 */
describe('tolerancia por carril', () => {
  it('un mismo desfase es «bien» para un niño de 3.º y «casi» para uno de 4.º', () => {
    // 90 ms de error: dentro de la ventana de «perfecto» de lectores (100), fuera de la
    // de autónomos (70). La misma actividad, dos niños de edades distintas.
    expect(calidadDe(90, 'lectores')).toBe('perfecto');
    expect(calidadDe(90, 'autonomos')).toBe('bien');
  });

  it('sin saber quién está delante, usa la ventana más ANCHA de esa etapa', () => {
    // primaria-c2 la abren lectores (100 ms) y autónomos (70). Ante la duda, la ancha:
    // que un niño con buen pulso se sienta torpe cuesta más que lo contrario.
    expect(calidadDe(90, 'primaria-c2')).toBe('perfecto');
    expect(calidadDe(90, 'primaria-c3')).toBe('bien');
  });

  it('Infantil es la más generosa de todas', () => {
    expect(calidadDe(140, 'infantil')).toBe('perfecto');
    expect(calidadDe(140, 'lectores')).toBe('bien');
  });
});

describe('cuándo se felicita y cuándo se sugiere otra vuelta', () => {
  /*
    El número lo decide `PARA_FELICITAR` y espera revisión pedagógica. Lo que se comprueba
    aquí es la forma, que es lo que se rompe solo: que el umbral entra —ocho de diez
    felicita, no «más de ocho»—, que los golpes de más cuentan en contra, y que una
    actividad sin nada que coger no felicita por
    división entre cero, que es como un componente acaba diciendo «¡muy bien!» a quien no
    ha tocado nada.
  */
  it('el umbral entra, no se roza', () => {
    expect(bastanteBien(8, 10)).toBe(true);
    expect(bastanteBien(7, 10)).toBe(false);
    expect(bastanteBien(16, 16)).toBe(true);
  });

  it('aporrear no se felicita aunque se cojan los huecos', () => {
    expect(bastanteBien(8, 10, 5)).toBe(true);
    expect(bastanteBien(8, 10, 6)).toBe(false);
  });

  it('sin nada que coger no se felicita', () => {
    expect(bastanteBien(0, 0)).toBe(false);
    expect(bastanteBien(0, 8)).toBe(false);
  });
});
