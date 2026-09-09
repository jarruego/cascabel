import { describe, expect, it } from 'vitest';
import {
  INICIAL_MEMORIA,
  barajar,
  destapada,
  encajan,
  reducirMemoria,
  tocable,
  type Carta,
  type EstadoMemoria,
} from '../src/motor/maquinaMemoria';

const CARTAS: Carta[] = [
  { id: 'perro-imagen', pareja: 'perro', cara: 'imagen' },
  { id: 'perro-sonido', pareja: 'perro', cara: 'sonido' },
  { id: 'gato-imagen', pareja: 'gato', cara: 'imagen' },
  { id: 'gato-sonido', pareja: 'gato', cara: 'sonido' },
];

const d = (e: EstadoMemoria, id: string) => reducirMemoria(e, { tipo: 'destapar', id }, CARTAS);
const seguir = (e: EstadoMemoria) => reducirMemoria(e, { tipo: 'seguir' }, CARTAS);

describe('máquina de memoria', () => {
  it('encaja el dibujo con su sonido, y no dos dibujos ni dos sonidos', () => {
    expect(encajan(CARTAS[0]!, CARTAS[1]!)).toBe(true);
    expect(encajan(CARTAS[0]!, CARTAS[2]!)).toBe(false);
    expect(encajan(CARTAS[1]!, CARTAS[3]!)).toBe(false);
  });

  it('con dos destapadas que encajan, se quedan destapadas', () => {
    let e = d(INICIAL_MEMORIA, 'perro-imagen');
    expect(destapada(e, 'perro-imagen')).toBe(true);
    e = d(e, 'perro-sonido');
    expect(e.turno?.acierto).toBe(true);
    e = seguir(e);
    expect(e.resueltas).toEqual(['perro-imagen', 'perro-sonido']);
    expect(destapada(e, 'perro-sonido')).toBe(true);
  });

  it('un fallo vuelve a tapar las dos y no cuesta nada más', () => {
    let e = d(d(INICIAL_MEMORIA, 'perro-imagen'), 'gato-sonido');
    expect(e.turno?.acierto).toBe(false);
    // Mientras se comprueba se ven las dos: es lo que permite recordarlas.
    expect(destapada(e, 'gato-sonido')).toBe(true);
    e = seguir(e);
    expect(e.fase).toBe('eligiendo');
    expect(destapada(e, 'perro-imagen')).toBe(false);
    expect(e.resueltas).toEqual([]);
    // Y se puede seguir sin ninguna consecuencia: no hay vidas.
    e = d(d(e, 'perro-imagen'), 'perro-sonido');
    expect(e.turno?.acierto).toBe(true);
  });

  it('la segunda carta tiene que ser de la otra cara: dos sonidos seguidos no se aceptan', () => {
    // Lo pidió el autor: dos sonidos seguidos confunden y nunca pueden ser pareja.
    const e = d(INICIAL_MEMORIA, 'perro-sonido');
    expect(d(e, 'gato-sonido')).toBe(e);
    expect(tocable(e, CARTAS[3]!, CARTAS)).toBe(false); // gato-sonido
    expect(tocable(e, CARTAS[2]!, CARTAS)).toBe(true); // gato-imagen
    expect(tocable(e, CARTAS[1]!, CARTAS)).toBe(true); // la misma, para deshacer
    expect(d(e, 'gato-imagen').fase).toBe('comprobando');
  });

  it('tocar una resuelta, la misma dos veces o una que no existe no hace nada', () => {
    let e = seguir(d(d(INICIAL_MEMORIA, 'perro-imagen'), 'perro-sonido'));
    expect(d(e, 'perro-imagen')).toBe(e);
    e = d(e, 'gato-imagen');
    expect(d(e, 'gato-imagen')).toBe(e);
    expect(d(e, 'no-existe')).toBe(e);
  });

  it('no acepta toques mientras se comprueba, y termina al destapar todas', () => {
    let e = d(d(INICIAL_MEMORIA, 'perro-imagen'), 'gato-sonido');
    expect(d(e, 'perro-sonido')).toBe(e);
    e = seguir(e);
    e = seguir(d(d(e, 'perro-imagen'), 'perro-sonido'));
    e = seguir(d(d(e, 'gato-imagen'), 'gato-sonido'));
    expect(e.fase).toBe('completada');
    expect(e.intentos).toBe(3);
  });

  it('baraja igual con la misma semilla y distinto con otra', () => {
    const a = barajar([1, 2, 3, 4, 5, 6, 7, 8], 7);
    expect(barajar([1, 2, 3, 4, 5, 6, 7, 8], 7)).toEqual(a);
    expect(a.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(barajar([1, 2, 3, 4, 5, 6, 7, 8], 99)).not.toEqual(a);
  });
});
