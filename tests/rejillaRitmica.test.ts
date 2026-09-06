import { describe, expect, it } from 'vitest';
import {
  aMilisegundos,
  rejillaDesdeSilabas,
  silabasConocidas,
} from '../src/motor/rejillaRitmica';

/**
 * Esto es comportamiento musical y temporal, que es exactamente lo que CLAUDE.md §11 dice
 * que hay que testear. Un error de medio pulso aquí no rompe nada visiblemente: solo hace
 * que el niño falle sistemáticamente y no sepa por qué.
 */
describe('rejilla rítmica desde sílabas', () => {
  it('«ta» es un golpe por pulso', () => {
    expect(rejillaDesdeSilabas(['ta', 'ta', 'ta', 'ta'])).toEqual({
      golpes: [0, 1, 2, 3],
      inicios: [0, 1, 2, 3],
      pulsos: 4,
    });
  });

  it('«ti-ti» son dos golpes dentro del mismo pulso', () => {
    const r = rejillaDesdeSilabas(['ta', 'ti-ti', 'ta']);
    expect(r.golpes).toEqual([0, 1, 1.5, 2]);
    expect(r.pulsos).toBe(3);
  });

  it('«ta-a» dura dos pulsos pero solo suena una vez', () => {
    const r = rejillaDesdeSilabas(['ta-a', 'ta']);
    expect(r.golpes).toEqual([0, 2]);
    expect(r.pulsos).toBe(3);
  });

  it('«sh» ocupa pulso y NO lleva golpe: el silencio es media asignatura', () => {
    const r = rejillaDesdeSilabas(['ta', 'sh', 'ta']);
    expect(r.golpes).toEqual([0, 2]);
    expect(r.pulsos).toBe(3);
  });

  it('las semicorcheas caen en los cuartos de pulso', () => {
    const r = rejillaDesdeSilabas(['ti-ri-ti-ri']);
    expect(r.golpes).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('el patrón de la actividad c1-02 sale como debe', () => {
    // «ta ta ti-ti ta» es el primer patrón que aprende un niño de 1.º.
    const r = rejillaDesdeSilabas(['ta', 'ta', 'ti-ti', 'ta']);
    expect(r.golpes).toEqual([0, 1, 2, 2.5, 3]);
    expect(r.pulsos).toBe(4);
  });

  it('falla con una sílaba que no conoce, en vez de tocarla mal', () => {
    expect(() => rejillaDesdeSilabas(['ta', 'zapato'])).toThrow(/zapato/);
    // Y el mensaje dice cuáles sí conoce, para que se pueda arreglar sin buscar.
    expect(() => rejillaDesdeSilabas(['zapato'])).toThrow(/ta-a/);
  });

  it('el repertorio incluye lo mínimo de 1.º y 2.º', () => {
    for (const s of ['ta', 'ti-ti', 'ta-a', 'sh']) {
      expect(silabasConocidas()).toContain(s);
    }
  });
});

describe('paso a milisegundos', () => {
  const rejilla = rejillaDesdeSilabas(['ta', 'ta', 'ti-ti', 'ta']);

  it('a 60 bpm, un pulso es un segundo exacto', () => {
    expect(aMilisegundos(rejilla, 0, 60)).toEqual([0, 1000, 2000, 2500, 3000]);
  });

  it('a 120 bpm, medio segundo', () => {
    expect(aMilisegundos(rejilla, 0, 120)).toEqual([0, 500, 1000, 1250, 1500]);
  });

  it('respeta el instante de inicio', () => {
    expect(aMilisegundos(rejilla, 5000, 60)[0]).toBe(5000);
  });

  it('la latencia se SUMA a lo esperado, no se resta a lo real', () => {
    // El niño oye el clic tarde, así que responde tarde a algo que para el ordenador ya
    // había pasado. Lo esperado se desplaza hacia adelante. Con el signo al revés, el
    // error se duplica en vez de anularse, y eso no se ve mirando el código.
    const sin = aMilisegundos(rejilla, 0, 60);
    const con = aMilisegundos(rejilla, 0, 60, 50);
    expect(con[0]! - sin[0]!).toBe(50);
    expect(con.every((v, i) => v - sin[i]! === 50)).toBe(true);
  });

  it('con 52 ms de latencia (Chromium real) un niño puntual sale puntual', () => {
    // Escenario medido el 2026-09-06: Chromium declara 52 ms en un PC de sobremesa.
    // Un niño que toca EXACTAMENTE cuando oye el clic golpea 52 ms después del instante
    // teórico. Si compensamos bien, su error tiene que salir cero.
    const esperados = aMilisegundos(rejilla, 0, 60, 52);
    const realesDelNino = [52, 1052, 2052, 2552, 3052];
    const errores = esperados.map((e, i) => realesDelNino[i]! - e);
    expect(errores.every((e) => Math.abs(e) < 1e-9)).toBe(true);
  });
});

describe('sílabas de tercer ciclo', () => {
  it('la síncopa pone el golpe donde no cae el pulso', () => {
    // ti-ta-ti: corchea, negra, corchea. El acento del medio cae a contratiempo, que es
    // justo lo que hay que sentir para entender la síncopa.
    const r = rejillaDesdeSilabas(['ti-ta-ti']);
    expect(r.golpes).toEqual([0, 0.5, 1.5]);
    expect(r.pulsos).toBe(2);
  });

  it('el contratiempo suena en la mitad del pulso, no al principio', () => {
    const r = rejillaDesdeSilabas(['ta', 'sh-ti', 'ta']);
    expect(r.golpes).toEqual([0, 1.5, 2]);
  });

  it('la negra con puntillo ocupa pulso y medio', () => {
    const r = rejillaDesdeSilabas(['ta-i-ti', 'ta']);
    expect(r.golpes).toEqual([0, 1.5, 2]);
  });
});

describe('sílabas y golpes no son lo mismo', () => {
  /*
    Salió de un fallo real. «ti-ti» es UNA sílaba con DOS golpes, así que en `ta ti-ti ta ta`
    hay cuatro sílabas y cinco golpes. El cursor que recorre el patrón en pantalla se movía
    con el índice del golpe sobre una lista de sílabas: desde el primer «ti-ti» iluminaba la
    casilla equivocada y se salía del final. No fallaba nada, solo se veía el ritmo mal.
  */
  it('hay un inicio por sílaba escrita, no por golpe', () => {
    const r = rejillaDesdeSilabas(['ta', 'ti-ti', 'ta', 'ta']);
    expect(r.inicios).toHaveLength(4);
    expect(r.golpes).toHaveLength(5);
  });

  it('cada sílaba empieza donde acaba la anterior', () => {
    const r = rejillaDesdeSilabas(['ta', 'ti-ti', 'ta-a', 'ta']);
    expect(r.inicios).toEqual([0, 1, 2, 4]);
    expect(r.pulsos).toBe(5);
  });

  it('los dos golpes de «ti-ti» caben dentro de su sílaba', () => {
    const r = rejillaDesdeSilabas(['ta', 'ti-ti']);
    expect(r.inicios).toEqual([0, 1]);
    // El segundo golpe cae a mitad del segundo pulso, no en el tercero.
    expect(r.golpes).toEqual([0, 1, 1.5]);
  });

  it('un silencio ocupa sílaba e inicio aunque no tenga golpe', () => {
    // Es lo que evita que el cursor se salte la casilla del silencio al recorrer el patrón.
    const r = rejillaDesdeSilabas(['ta', 'sh', 'ta']);
    expect(r.inicios).toEqual([0, 1, 2]);
    expect(r.golpes).toEqual([0, 2]);
  });
});
