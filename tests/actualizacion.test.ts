import { describe, expect, it } from 'vitest';
import { UMBRAL_ARRANQUE_MS, decidirActualizacion } from '../src/motor/actualizacion';

describe('qué se hace con una versión nueva', () => {
  it('nada más arrancar y en el catálogo, se aplica sin preguntar', () => {
    expect(decidirActualizacion({ msDesdeArranque: 800, ruta: '/' })).toBe('aplicar');
    expect(decidirActualizacion({ msDesdeArranque: 800, ruta: '/ajustes' })).toBe('aplicar');
  });

  it('pasado el arranque, se avisa: puede haber alguien a mitad de algo', () => {
    expect(decidirActualizacion({ msDesdeArranque: UMBRAL_ARRANQUE_MS, ruta: '/' })).toBe('avisar');
    expect(decidirActualizacion({ msDesdeArranque: 60_000, ruta: '/' })).toBe('avisar');
  });

  it('dentro de una actividad nunca se recarga sola, ni recién abierta', () => {
    // Una PWA instalada puede arrancar directamente en una actividad desde un enlace.
    expect(decidirActualizacion({ msDesdeArranque: 100, ruta: '/actividad/inf-01-sube-y-baja' })).toBe('avisar');
    expect(decidirActualizacion({ msDesdeArranque: 100, ruta: '/calibracion' })).toBe('avisar');
  });
});
