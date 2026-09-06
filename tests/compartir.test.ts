import { describe, expect, it } from 'vitest';
import {
  aParametro,
  alfabetoCodigos,
  comprobarCodigo,
  desdeParametro,
  diaDeHoy,
  generarCodigo,
  resumen,
} from '../src/datos/compartir';

/**
 * Los dos patrones que el dosier señala como los más valiosos del campo, y los dos
 * resuelven lo mismo: **evaluar y compartir sin cuentas, sin base de datos y sin tratar un
 * solo dato personal**.
 */
describe('códigos de verificación', () => {
  const base = { actividadId: 'inf-01-semaforo-del-sonido', aciertos: 6, intentos: 7, dia: 249 };

  it('el alfabeto no tiene caracteres que un niño confunda', () => {
    // Los copia a mano un niño de ocho años: confundir O con 0 es el error más frecuente.
    const a = alfabetoCodigos();
    for (const malo of ['I', 'O', '0', '1']) expect(a).not.toContain(malo);
  });

  it('genera un código de siete caracteres y lo valida', () => {
    const c = generarCodigo(base);
    expect(c).toHaveLength(7);
    expect(comprobarCodigo(c).valido).toBe(true);
  });

  it('recupera los datos que el maestro necesita', () => {
    const r = comprobarCodigo(generarCodigo(base));
    expect(r.datos).toMatchObject({
      aciertos: 6,
      intentos: 7,
      dia: 249,
      hashActividad: resumen(base.actividadId),
    });
  });

  it('detecta una errata al teclear', () => {
    const c = generarCodigo(base);
    // Se cambia un carácter del cuerpo por otro distinto del alfabeto.
    const roto = (c[0] === 'A' ? 'B' : 'A') + c.slice(1);
    expect(comprobarCodigo(roto)).toMatchObject({ valido: false, motivo: 'control' });
  });

  it('detecta dos caracteres intercambiados, que es el otro error típico', () => {
    // La suma de control pondera por posición justo para esto.
    const c = generarCodigo({ ...base, aciertos: 3, intentos: 9 });
    const cambiado = c[1]! + c[0]! + c.slice(2);
    if (c[0] !== c[1]) expect(comprobarCodigo(cambiado).valido).toBe(false);
  });

  it('acepta el código escrito de cualquier manera razonable', () => {
    const c = generarCodigo(base);
    for (const variante of [c.toLowerCase(), ` ${c} `, `${c.slice(0, 3)}-${c.slice(3)}`]) {
      expect(comprobarCodigo(variante).valido, variante).toBe(true);
    }
  });

  it('rechaza lo que no tiene forma de código', () => {
    for (const malo of ['', 'ABC', 'ABCDEFGH', 'ABCDEF0']) {
      expect(comprobarCodigo(malo)).toMatchObject({ valido: false });
    }
  });

  it('NO contiene nada que identifique a nadie', () => {
    // Un código dice «alguien completó esta actividad con estos aciertos este día», no
    // quién. El maestro sabe quién se lo enseña porque lo tiene delante.
    const r = comprobarCodigo(generarCodigo(base));
    const campos = Object.keys(r.datos ?? {}).sort();
    expect(campos).toEqual(['aciertos', 'dia', 'hashActividad', 'intentos']);
  });

  it('la fecha es un día, no un instante', () => {
    const a = diaDeHoy(new Date('2026-09-06T08:00:00Z'));
    const b = diaDeHoy(new Date('2026-09-06T22:30:00Z'));
    expect(a).toBe(b);
    expect(diaDeHoy(new Date('2026-01-01T00:00:00Z'))).toBe(0);
  });

  it('actividades distintas dan códigos distintos', () => {
    const a = generarCodigo(base);
    const b = generarCodigo({ ...base, actividadId: 'c1-08-memory-de-instrumentos' });
    expect(a).not.toBe(b);
  });
});

describe('estado en la URL', () => {
  it('va y vuelve sin perder nada', () => {
    const estado = { celdas: ['0,1', '2,3'], tempo: 96, notas: ['C4', 'G4'] };
    expect(desdeParametro(aParametro(estado))).toEqual(estado);
  });

  it('sobrevive a los acentos y a la eñe', () => {
    const estado = { titulo: 'El caracol: sube y baja ñ á é í ó ú «»' };
    expect(desdeParametro(aParametro(estado))).toEqual(estado);
  });

  it('es seguro en una URL: nada de +, / ni =', () => {
    // Sin esto, la mitad de los enlaces se rompen al pegarlos en WhatsApp o en un correo.
    const largo = { datos: Array.from({ length: 200 }, (_, i) => `celda-${i}`) };
    const p = aParametro(largo);
    expect(p).not.toMatch(/[+/=]/);
    expect(desdeParametro(p)).toEqual(largo);
  });

  it('una URL manipulada devuelve null en vez de romper la app', () => {
    for (const basura of ['', 'no-es-base64!!', 'YWJj', '////']) {
      expect(() => desdeParametro(basura)).not.toThrow();
    }
    expect(desdeParametro('no-es-base64!!')).toBeNull();
  });
});
