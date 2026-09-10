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

  /**
   * Cierre propio contra cierre del usuario, y por qué hay que distinguirlos.
   *
   * `<dialog>` lanza el evento `close` **también cuando lo cierra el código**, no solo
   * cuando lo cierra la persona. Sin distinguirlos pasaba esto: pulsar «otra vez» ponía
   * `abierto` a false, el efecto llamaba a `d.close()`, saltaba `close`, y `close` estaba
   * conectado a `alCerrar`... que en el modal de éxito es «volver al menú». **Resultado: el
   * botón de repetir sacaba de la actividad, en todos los modales.** No fallaba nada y no
   * había forma de verlo leyendo ninguno de los dos ficheros por separado.
   *
   * Esta bandera dice «este cierre lo he provocado yo», y entonces no se avisa a nadie.
   */
  const cerrandoNosotros = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      d.showModal();
      /*
        El foco va a la caja, no al primer botón. `showModal()` enfoca el primer elemento
        pulsable, y si la página acaba de abrirse desde un enlace —sin ningún toque antes—
        el navegador lo pinta con el anillo de foco: el autor vio el 2026-09-10 el icono de
        compartir «rodeado con un círculo rojo». Enfocar la caja hace que el lector de
        pantalla empiece por el título y que el anillo solo salga cuando alguien pulse Tab,
        que es para quien existe.
      */
      d.querySelector<HTMLElement>('.modal__caja')?.focus();
    }
    if (!abierto && d.open) {
      cerrandoNosotros.current = true;
      d.close();
    }
  }, [abierto]);

  // `close` cubre Escape además del botón, así que el estado no se queda descolgado.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const alCerrarNativo = () => {
      if (cerrandoNosotros.current) {
        cerrandoNosotros.current = false;
        return;
      }
      alCerrar();
    };
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
      <div className="modal__caja" tabIndex={-1}>
        {children}
      </div>
    </dialog>
  );
}
