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
 * **Se coloca por altura, no por ancho.** Todas las poses comparten altura y apoyan en la
 * misma línea —lo hace `tools/personajes.mjs`—, y el ancho es el que pida el gesto: cantar
 * con los brazos abiertos ocupa más que estar de pie, y eso es el gesto, no un defecto.
 * Fijar el ancho obligaría a encoger esas poses, y entonces el personaje cambiaría de
 * tamaño al cambiar de gesto, que es justo lo que se quiere evitar.
 */
export function Personaje({
  nombre,
  pose = 'neutro',
  tamano = 120,
  alt = '',
}: {
  nombre: Nombre;
  pose?: Pose;
  /** Altura en píxeles. El ancho lo pone el dibujo. */
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
