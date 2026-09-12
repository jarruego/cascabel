import { Icono } from './Icono';

interface Props {
  /** Dibujo de `ui/Icono`. Si no hay, el botón lo dice con el signo o con el texto. */
  icono?: string;
  /**
   * Un signo musical en Unicode —una negra, un sostenido, un «2/4»— dibujado con Bravura.
   * Para las opciones que SON notación: en un dictado de figuras la respuesta es una
   * corchea, y una corchea no tiene emoji ni tiene por qué tenerlo.
   */
  signo?: string;
  color: string;
  /** Lado mínimo en píxeles CSS. Sale de OBJETIVO_TACTIL, nunca de un valor mágico. */
  tamano: number;
  etiqueta: string;
  /** Marca el botón como no operable sin quitarle el foco (aria-disabled, no disabled). */
  inactivo?: boolean;
  onClick: () => void;
}

/**
 * Botón grande de actividad. El texto de `etiqueta` es para lectores de pantalla y
 * para los que ya leen; el icono y el color son la información real para los que no.
 * El color nunca informa solo: siempre va acompañado de forma y de sonido.
 */
export function Boton({
  icono,
  signo,
  color,
  tamano,
  etiqueta,
  inactivo = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className={`boton-actividad boton--${color}`}
      style={{ minWidth: tamano, minHeight: tamano }}
      // Se conserva el foco a propósito: quitarlo mientras se muestra el feedback dejaría
      // perdido a quien navega con teclado. El manejador ignora la pulsación igualmente.
      aria-disabled={inactivo || undefined}
      onClick={inactivo ? undefined : onClick}
      aria-label={etiqueta}
    >
      {icono && (
        <span className="boton__icono" aria-hidden="true">
          {/*
            La ilustración ocupa el 62 % del botón y no el 50 %. Es lo que separa un icono
            de una tarjeta: en Kahoot lo que se toca es el dibujo, y el texto solo confirma.
            Para un niño que no lee, el texto no está: solo hay dibujo.
          */}
          <Icono nombre={icono} tamano={Math.round(tamano * 0.62)} />
        </span>
      )}
      {!icono && signo && (
        <span
          className="boton__signo"
          aria-hidden="true"
          style={{ fontSize: Math.round(tamano * 0.5) }}
        >
          {signo}
        </span>
      )}
      {/* Sin dibujo ni signo, el texto es lo único que hay y se lee de lejos. Solo pasa en
          actividades de lectores: nombres de compositores, de épocas, de intervalos. */}
      <span className="boton__texto" data-solo={!icono && !signo ? '' : undefined}>
        {etiqueta}
      </span>
    </button>
  );
}
