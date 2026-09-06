/**
 * Iconos de transporte: grabar, parar y reproducir.
 *
 * **Dibujados aquí y no traídos de OpenMoji**, que es de donde vienen los otros cuarenta y
 * ocho. El motivo: un círculo rojo, un cuadrado y un triángulo son **símbolos universales**,
 * no ilustraciones. Los reconoce cualquiera que haya visto un reproductor —y un niño de seis
 * años ha visto muchos— y necesitan exactamente el mismo tamaño, el mismo grosor y el mismo
 * centro óptico para leerse como un juego. Un emoji de cada cosa no daría eso.
 *
 * Además pesan cero y heredan el color del texto, así que funcionan igual sobre un botón
 * claro y sobre uno rojo.
 */

interface Props {
  tamano?: number;
}

/** Círculo relleno. Rojo siempre: es el código de «grabando» desde antes que la informática. */
export function IconoGrabar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  );
}

/** Cuadrado relleno: parar. */
export function IconoParar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Triángulo hacia la derecha: reproducir. */
export function IconoTocar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.5 20 12 7 19.5Z" fill="currentColor" />
    </svg>
  );
}
