import { useEffect, useState } from 'react';
import { rutaDe, type Personaje as Nombre, type Pose } from './personajes';

/**
 * Un personaje de cocomusic, en una pose.
 *
 * **Va con `<img>` y no con el SVG incrustado**, y es a propósito: son ilustraciones a todo
 * color que no hay que recolorear desde el CSS, y así el navegador las cachea como cualquier
 * imagen y el service worker las tiene sin hacer nada especial. Incrustarlas metería
 * veinte kilobytes de trazos en el árbol del documento cada vez.
 *
 * **Si el fichero no está, se cae a `neutro`; si tampoco, no se dibuja nada.** Es lo que
 * permite ir añadiendo poses de una en una sin romper ninguna pantalla, y lo que evita el
 * icono roto del navegador, que en una aplicación para niños es peor que no enseñar nada.
 *
 * Todas las poses comparten lienzo y apoyan en la misma línea —lo hace
 * `tools/personajes.mjs`—, así que dos poses del mismo personaje salen del mismo tamaño y
 * con los pies a la misma altura. Sin eso, el personaje da un salto al cambiar de gesto.
 */
export function Personaje({
  nombre,
  pose = 'neutro',
  tamano = 120,
  alt = '',
}: {
  nombre: Nombre;
  pose?: Pose;
  /** Lado en píxeles. El dibujo es cuadrado. */
  tamano?: number;
  /**
   * Texto alternativo. **Vacío por defecto**: el personaje casi siempre acompaña a un
   * título que ya dice lo mismo, y repetirlo hace que un lector de pantalla lo lea dos
   * veces. Se rellena solo cuando el personaje es la única información.
   */
  alt?: string;
}) {
  const [actual, setActual] = useState<Pose | null>(pose);

  // Al cambiar de pose se vuelve a intentar la pedida: si antes se cayó a `neutro` por un
  // fichero que faltaba, no tiene por qué faltar el de la pose nueva.
  useEffect(() => setActual(pose), [pose, nombre]);

  if (!actual) return null;

  return (
    <img
      src={rutaDe(nombre, actual)}
      width={tamano}
      height={tamano}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      className="personaje"
      /* Sin carga diferida: cuando se pone un personaje es porque se está mirando. */
      decoding="async"
      onError={() => setActual((p) => (p === 'neutro' ? null : 'neutro'))}
    />
  );
}
