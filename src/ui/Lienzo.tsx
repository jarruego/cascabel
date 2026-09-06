import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';

/**
 * Modo lienzo: la actividad ocupa la pantalla entera y desaparece todo lo demás.
 *
 * **Para qué sirve de verdad.** Un piano rodeado de título, enunciado, botón de atrás,
 * barra de navegación y enlace a la ficha es un piano pequeño con muchas cosas alrededor. En
 * una pizarra digital eso es el problema entero: lo que se ve desde el fondo del aula es lo
 * grande, y todo lo que no es la actividad le está robando sitio. En una tablet pequeña,
 * igual.
 *
 * **Por qué no basta con la API de pantalla completa.** `requestFullscreen()` no existe para
 * elementos arbitrarios en Safari de iOS —solo para vídeo—, y ahí es donde más falta hace,
 * porque es donde la barra del navegador se come más pantalla. Así que el modo se aplica
 * **siempre por CSS**, que funciona en todas partes, y *además* se intenta la API nativa
 * para ganar también la barra del navegador donde exista. Si la API falla, no pasa nada: el
 * modo ya está puesto. Es la misma regla que con el micrófono — se intenta y se cae con
 * elegancia, nunca se pregunta al navegador si sabe hacer algo.
 *
 * Lo que se esconde lo decide el CSS, no este componente: cada tipo de actividad sabe qué
 * partes suyas son lienzo y cuáles son explicación.
 */

interface Props {
  children: React.ReactNode;
}

export function Lienzo({ children }: Props) {
  const [ampliado, setAmpliado] = useState(false);
  const caja = useRef<HTMLDivElement | null>(null);

  const alternar = useCallback(async () => {
    const siguiente = !ampliado;
    setAmpliado(siguiente);
    try {
      if (siguiente) {
        await caja.current?.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Sin API nativa el modo CSS ya está aplicado y se ve igual de grande dentro de la
      // página. No hay nada que avisar ni nada que arreglar.
    }
  }, [ampliado]);

  // Salir con Escape, o desde el propio navegador, tiene que devolvernos al estado normal.
  // Sin esto, cerrar la pantalla completa con Escape dejaría la página con el CSS de lienzo
  // puesto y sin forma evidente de quitarlo.
  useEffect(() => {
    const alCambiar = () => {
      if (!document.fullscreenElement) setAmpliado(false);
    };
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  return (
    <div ref={caja} className="lienzo" data-ampliado={ampliado || undefined}>
      {children}
      <button
        type="button"
        className="lienzo__boton no-imprimir"
        onClick={() => void alternar()}
        /* aria-pressed y no dos botones distintos: es un interruptor, y un lector de
           pantalla lo anuncia como tal sin que cambie el nombre debajo del dedo. */
        aria-pressed={ampliado}
        aria-label={t(ampliado ? 'lienzo.restaurar' : 'lienzo.ampliar')}
        title={t(ampliado ? 'lienzo.restaurar' : 'lienzo.ampliar')}
      >
        {/* Los dos iconos son cuatro esquinas: hacia fuera para ampliar, hacia dentro para
            restaurar. Es el símbolo que ya conocen de cualquier reproductor de vídeo. */}
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          {ampliado ? (
            <path
              d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
