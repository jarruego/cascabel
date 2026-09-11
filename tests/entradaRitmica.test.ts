import { describe, expect, it } from 'vitest';
import { CUENTA_PULSOS, entradaDeVuelta } from '@/motor/entradaRitmica';

describe('la entrada de «tocar a tiempo»', () => {
  // A 60 ppm cada pulso es un segundo: se lee de un vistazo.
  const e = entradaDeVuelta(10000, 60);

  it('el ¡ya! es el último pulso del compás de entrada, y es la entrada', () => {
    // La cuenta atrás muestra 3, 2, 1 en los pulsos 0, 1 y 2 y el ¡ya! en el 3.
    expect(e.cuentaDesde).toBe(3);
    expect(e.entradaMs).toBe(10000 + (CUENTA_PULSOS - 1) * 1000);
  });

  it('el fallo que hubo: la palmada dada con el ¡ya! entra en la ventana', () => {
    expect(e.ventanaDesdeMs).toBeLessThanOrEqual(e.entradaMs);
    // Y también la que se adelanta medio pulso, que es anticipar bien.
    expect(e.ventanaDesdeMs).toBe(e.entradaMs - 500);
  });

  it('la pantalla de responder llega después del ¡ya!, no antes', () => {
    expect(e.respondiendoDesdeMs).toBeGreaterThan(e.entradaMs);
    expect(e.respondiendoDesdeMs).toBe(e.entradaMs + 500);
  });
});
