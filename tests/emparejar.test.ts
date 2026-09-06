import { describe, expect, it } from 'vitest';
import {
  INICIAL_EMPAREJAR,
  reducirEmparejar,
  type EstadoEmparejar,
  type ParejaResuelta,
} from '../src/motor/maquinaEmparejar';

const PAREJAS: ParejaResuelta[] = [
  { izquierda: 'tambor', derecha: 'sonido-tambor' },
  { izquierda: 'flauta', derecha: 'sonido-flauta' },
];

const p = (e: EstadoEmparejar, a: Parameters<typeof reducirEmparejar>[1]) =>
  reducirEmparejar(e, a, PAREJAS);
const izq = (e: EstadoEmparejar, clave: string) => p(e, { tipo: 'tocar', clave, lado: 'izquierda' });
const der = (e: EstadoEmparejar, clave: string) => p(e, { tipo: 'tocar', clave, lado: 'derecha' });
const seguir = (e: EstadoEmparejar) => p(e, { tipo: 'seguir' });

describe('máquina de emparejar', () => {
  it('empareja con dos toques, sin arrastrar nada', () => {
    let e = izq(INICIAL_EMPAREJAR, 'tambor');
    expect(e.seleccion).toBe('tambor');
    e = der(e, 'sonido-tambor');
    expect(e.ultima).toEqual({ izquierda: 'tambor', derecha: 'sonido-tambor', acierto: true });
    expect(e.resueltas).toContain('tambor');
  });

  it('un fallo no resta, no bloquea y no termina', () => {
    let e = der(izq(INICIAL_EMPAREJAR, 'tambor'), 'sonido-flauta');
    expect(e.ultima?.acierto).toBe(false);
    expect(e.resueltas).toHaveLength(0);
    e = seguir(e);
    expect(e.fase).toBe('eligiendo');
    // Y se puede reintentar exactamente lo mismo, sin penalización.
    e = der(izq(e, 'tambor'), 'sonido-tambor');
    expect(e.ultima?.acierto).toBe(true);
  });

  it('tocar dos veces el mismo elemento deselecciona y no cuenta intento', () => {
    // Un niño se arrepiente constantemente; arrepentirse tiene que ser gratis.
    let e = izq(INICIAL_EMPAREJAR, 'tambor');
    e = izq(e, 'tambor');
    expect(e.seleccion).toBeNull();
    expect(e.intentos).toBe(0);
  });

  it('tocar dos del mismo lado es cambiar de idea, no fallar', () => {
    let e = izq(INICIAL_EMPAREJAR, 'tambor');
    e = izq(e, 'flauta');
    expect(e.seleccion).toBe('flauta');
    expect(e.intentos).toBe(0);
  });

  it('ignora los toques mientras suena la comprobación', () => {
    let e = der(izq(INICIAL_EMPAREJAR, 'tambor'), 'sonido-tambor');
    const congelado = { ...e };
    e = izq(e, 'flauta');
    expect(e).toEqual(congelado);
  });

  it('no deja volver a tocar algo ya resuelto', () => {
    let e = seguir(der(izq(INICIAL_EMPAREJAR, 'tambor'), 'sonido-tambor'));
    e = izq(e, 'tambor');
    expect(e.seleccion).toBeNull();
  });

  it('se completa cuando todas las parejas están resueltas', () => {
    let e = seguir(der(izq(INICIAL_EMPAREJAR, 'tambor'), 'sonido-tambor'));
    expect(e.fase).toBe('eligiendo');
    e = seguir(der(izq(e, 'flauta'), 'sonido-flauta'));
    expect(e.fase).toBe('completada');
    expect(e.intentos).toBe(2);
  });
});
