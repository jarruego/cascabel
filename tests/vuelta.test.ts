import { beforeEach, describe, expect, it } from 'vitest';
import { apuntarVuelta, claveDeScroll, destinoDeVuelta } from '@/app/vuelta';

describe('volver a donde estabas', () => {
  beforeEach(() => sessionStorage.clear());

  it('sin nada apuntado se vuelve al catálogo', () => {
    expect(destinoDeVuelta()).toBe('/');
  });

  it('se vuelve a la última pantalla apuntada, con sus filtros', () => {
    apuntarVuelta('/?etapa=infantil&hechas=no');
    expect(destinoDeVuelta()).toBe('/?etapa=infantil&hechas=no');
    apuntarVuelta('/instrumentos');
    expect(destinoDeVuelta()).toBe('/instrumentos');
  });

  it('la altura del scroll se guarda por pantalla, sin los filtros', () => {
    expect(claveDeScroll('/?etapa=infantil')).toBe(claveDeScroll('/'));
    expect(claveDeScroll('/camino')).not.toBe(claveDeScroll('/'));
  });
});
