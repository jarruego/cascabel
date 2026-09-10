import { useEffect, type RefObject } from 'react';

/**
 * Insinuar que hay más a la derecha.
 *
 * Una pauta, una cuadrícula o un teclado que no caben se desplazan de lado, pero nada lo
 * dice: la barra de desplazamiento no se ve en un móvil y el borde cortado no se lee como
 * «sigue». Al entrar, la caja se mueve sola un trecho hacia la derecha y vuelve, con
 * aceleración y frenada, en poco más de un segundo. Es lo que hace un carrusel bien hecho,
 * y lo pidió el autor el 2026-09-10 para «todas las que tienen desplazamiento horizontal».
 *
 * Reglas: solo si de verdad sobra contenido; solo si la caja está al principio; se
 * respeta `prefers-reduced-motion`; y cualquier gesto del usuario —tocar, rueda, tecla—
 * lo corta en seco, porque insinuar no es quitarle el control a nadie.
 *
 * **No va en las cajas que se desplazan solas al reproducir** —constructor, pistas,
 * percusión corporal, seguir—: ahí la propia reproducción enseña que hay más, y dos
 * movimientos automáticos seguidos marean. Lo pidió el autor el 2026-09-10. Va en las que
 * solo se mueven con el dedo: pautas, teclados y botones por bandas.
 */

/** Cuánto dura el ida y vuelta. */
export const DURACION_MS = 1600;
/** Cuánto se espera tras montar, para que el contenido haya medido. */
export const ESPERA_MS = 500;

/**
 * La curva del movimiento: 0 al principio, 1 a mitad, 0 al final, y suave en los tres
 * puntos. Es medio coseno, que acelera y frena solo.
 */
export function curvaDeInsinuacion(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return (1 - Math.cos(2 * Math.PI * u)) / 2;
}

/**
 * Cuánto se desplaza, en píxeles: un tercio de la caja, nunca menos de 72 px para que se
 * note, y nunca más de lo que sobra. Si apenas sobra nada, no se mueve.
 */
export function distanciaDeInsinuacion(sobrante: number, anchoCaja: number): number {
  if (sobrante <= 8) return 0;
  return Math.min(sobrante, Math.max(72, anchoCaja * 0.3));
}

/**
 * @param ref la caja que se desplaza de lado (`overflow-x: auto`).
 * @param clave si cambia, se vuelve a insinuar: el ejercicio siguiente de una serie.
 */
export function useInsinuarDesplazamiento(ref: RefObject<HTMLElement | null>, clave?: unknown): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelado = false;
    let rafId = 0;
    const cancelar = () => {
      cancelado = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
    const gestos = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
    gestos.forEach((g) => window.addEventListener(g, cancelar, { passive: true }));

    const temporizador = window.setTimeout(() => {
      if (cancelado || el.scrollLeft > 0) return;
      const distancia = distanciaDeInsinuacion(el.scrollWidth - el.clientWidth, el.clientWidth);
      if (distancia === 0) return;
      const inicio = performance.now();
      const paso = (ahora: number) => {
        if (cancelado) return;
        const t = (ahora - inicio) / DURACION_MS;
        el.scrollLeft = distancia * curvaDeInsinuacion(t);
        if (t < 1) rafId = requestAnimationFrame(paso);
        else el.scrollLeft = 0;
      };
      rafId = requestAnimationFrame(paso);
    }, ESPERA_MS);

    return () => {
      cancelar();
      window.clearTimeout(temporizador);
      gestos.forEach((g) => window.removeEventListener(g, cancelar));
    };
  }, [ref, clave]);
}
