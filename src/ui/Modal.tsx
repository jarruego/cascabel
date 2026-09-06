import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Modal accesible, construido sobre `<dialog>` nativo.
 *
 * Se usa el elemento nativo y no un `<div>` con `role="dialog"` porque el navegador ya
 * resuelve gratis lo que se suele hacer mal: atrapar el foco dentro, devolverlo al cerrar,
 * cerrar con Escape y ocultar el resto de la página a los lectores de pantalla.
 *
 * **Un modal que no se puede cerrar es una trampa.** Aquí siempre se puede: Escape, el
 * botón, o tocar fuera. Delante de veinticinco niños, un adulto tiene que poder saltarse
 * cualquier cosa en un segundo.
 */

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  /** Etiqueta del diálogo para lectores de pantalla. */
  titulo: string;
  children: ReactNode;
  /** Variante visual. `celebracion` añade el color de acierto; no añade puntuación. */
  tono?: 'normal' | 'celebracion';
}

export function Modal({ abierto, alCerrar, titulo, children, tono = 'normal' }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  // `close` cubre Escape además del botón, así que el estado no se queda descolgado.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const alCerrarNativo = () => alCerrar();
    d.addEventListener('close', alCerrarNativo);
    return () => d.removeEventListener('close', alCerrarNativo);
  }, [alCerrar]);

  return (
    <dialog
      ref={ref}
      className="modal"
      data-tono={tono}
      aria-label={titulo}
      /* Tocar fuera cierra. El backdrop es parte del propio <dialog>, así que se detecta
         comparando el objetivo del clic con el diálogo. */
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
    >
      <div className="modal__caja">{children}</div>
    </dialog>
  );
}
