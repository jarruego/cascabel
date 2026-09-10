import { useEffect, useRef } from 'react';

/**
 * Volver a donde estabas.
 *
 * «Volver» desde una actividad lleva a la pantalla de la que se salió —el catálogo, el
 * Taller o el Camino— con la misma URL (o sea, los mismos filtros) y a la misma altura de
 * scroll. Antes iba siempre al catálogo, y el autor lo vio al abrir una herramienta del
 * Taller el 2026-09-10.
 *
 * **Por qué no vale `history.back()`**: no lleva a la lista, lleva a la pantalla anterior,
 * que puede ser la ficha que acabas de mirar o la actividad de antes. Volver es volver a la
 * lista, no deshacer un paso. Así que cada lista apunta su URL mientras está en pantalla y
 * la actividad va a esa.
 *
 * **Por qué el scroll no lo repone el navegador**: lo intenta al ir «atrás», pero solo si la
 * página ya mide lo que medía, y estas listas llegan por `fetch`: cuando el navegador
 * intenta restaurar, la lista aún está vacía y mide cero. Se guarda al salir y se repone
 * cuando la lista ya está pintada.
 *
 * Todo en `sessionStorage`: tiene que sobrevivir a que la pantalla se desmonte entera, que
 * es justo lo que pasa al abrir una actividad, y no tiene que sobrevivir a cerrar la
 * pestaña. Sin almacenamiento, «Volver» va al catálogo sin filtros y arriba del todo, que es
 * lo peor que puede pasar.
 */

const CLAVE_URL = 'vuelta:url';

export function apuntarVuelta(url: string): void {
  try {
    sessionStorage.setItem(CLAVE_URL, url);
  } catch {
    // Sin almacenamiento no se apunta nada.
  }
}

export function destinoDeVuelta(): string {
  try {
    return sessionStorage.getItem(CLAVE_URL) || '/';
  } catch {
    return '/';
  }
}

/** La altura se guarda por pantalla, sin los filtros: el scroll del catálogo es uno. */
export function claveDeScroll(url: string): string {
  return `vuelta:scroll:${url.split('?')[0]}`;
}

/**
 * Para las pantallas de lista: apunta su URL mientras están en pantalla, guarda la altura
 * al salir y la repone cuando `listo` dice que la lista ya está pintada.
 *
 * La URL se apunta en un efecto y no al desmontar, y no es un detalle: para cuando corre la
 * limpieza el navegador ya está en la actividad, y `window.location` devolvería su URL.
 */
export function useVuelta(url: string, listo: boolean): void {
  useEffect(() => {
    apuntarVuelta(url);
  }, [url]);

  const clave = claveDeScroll(url);
  useEffect(() => {
    const guardar = () => {
      try {
        sessionStorage.setItem(clave, String(window.scrollY));
      } catch {
        // Se pierde la posición y nada más.
      }
    };
    window.addEventListener('pagehide', guardar);
    return () => {
      window.removeEventListener('pagehide', guardar);
      guardar();
    };
  }, [clave]);

  const yaRepuesto = useRef(false);
  useEffect(() => {
    if (!listo || yaRepuesto.current) return;
    yaRepuesto.current = true;
    try {
      const y = Number(sessionStorage.getItem(clave) ?? '0');
      // Un fotograma de margen: si se repone antes de que el navegador haya colocado la
      // lista, la página aún no es tan alta y el salto se queda corto.
      if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    } catch {
      // Igual que arriba.
    }
  }, [listo, clave]);
}
