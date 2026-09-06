import type { Carril } from '@/config';

/**
 * Arrastrar y soltar, **como vía adicional y nunca como única**.
 *
 * WCAG 2.5.7 no prohíbe arrastrar: prohíbe que arrastrar sea el único camino. Y la regla 9
 * de `docs/04-DISENO-UI.md` prohíbe el arrastre por debajo de 6 años, donde la motricidad
 * fina no da para soltar con precisión.
 *
 * De ahí las dos reglas de este módulo:
 *
 *  1. **En el carril `infantil` no se activa nunca.** No es configurable.
 *  2. **El toque sucesivo sigue funcionando siempre**, en los tres carriles. Quien arrastra
 *     lo hace porque quiere; quien va con el dedo, con teclado o con un ratón que se le
 *     resiste, toca. Ninguna interacción existe solo en la versión arrastrable.
 *
 * Se usan eventos de puntero y no la API de arrastre de HTML5: `dragstart`/`drop` no
 * funciona con dedo en móvil sin polyfill, y el móvil es la mitad del parque.
 */

export function permiteArrastre(carril: Carril): boolean {
  return carril !== 'infantil';
}

export interface OpcionesArrastre {
  carril: Carril;
  /** Clave del elemento que se arrastra. */
  clave: string;
  /** Se llama al soltar encima de una zona válida. */
  alSoltar: (clave: string, destino: string) => void;
  /** Devuelve la clave de la zona que hay bajo el punto, o null. */
  zonaEn: (x: number, y: number) => string | null;
}

/**
 * Devuelve los props que hay que poner en el elemento arrastrable.
 *
 * Si el carril no permite arrastre, devuelve un objeto vacío: el elemento sigue siendo un
 * botón normal y el toque hace todo el trabajo.
 */
export function propsArrastre({ carril, clave, alSoltar, zonaEn }: OpcionesArrastre) {
  if (!permiteArrastre(carril)) return {};

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      // Solo botón principal, y no con teclado: el teclado ya tiene su camino por toque.
      if (e.button !== 0) return;
      const elemento = e.currentTarget;
      const inicioX = e.clientX;
      const inicioY = e.clientY;
      let arrastrando = false;

      const mover = (ev: PointerEvent) => {
        const dx = ev.clientX - inicioX;
        const dy = ev.clientY - inicioY;
        // Umbral de 8 px: por debajo es un toque tembloroso, no un arrastre. Sin esto,
        // un niño que toca con el dedo apoyado dispara arrastres sin querer.
        if (!arrastrando && Math.hypot(dx, dy) < 8) return;
        if (!arrastrando) {
          arrastrando = true;
          elemento.setPointerCapture(ev.pointerId);
          elemento.dataset.arrastrando = 'true';
        }
        elemento.style.transform = `translate(${dx}px, ${dy}px)`;
        elemento.style.zIndex = '10';
      };

      const soltar = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', soltar);
        elemento.style.transform = '';
        elemento.style.zIndex = '';
        delete elemento.dataset.arrastrando;
        if (!arrastrando) return; // Fue un toque: que lo maneje el onClick de siempre.
        const destino = zonaEn(ev.clientX, ev.clientY);
        if (destino) alSoltar(clave, destino);
      };

      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', soltar);
    },
  };
}

/**
 * Busca una zona de destino bajo un punto de la pantalla.
 *
 * Se hace por `elementsFromPoint` y no guardando rectángulos: los rectángulos se quedan
 * obsoletos en cuanto algo se mueve o la página hace scroll, y en móvil hace scroll todo
 * el rato.
 */
export function zonaBajoPunto(x: number, y: number, atributo = 'data-zona'): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const zona = el.getAttribute(atributo);
    if (zona) return zona;
  }
  return null;
}
