interface Props {
  icono: string;
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
export function Boton({ icono, color, tamano, etiqueta, inactivo = false, onClick }: Props) {
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
      <span className="boton__icono" aria-hidden="true" data-icono={icono} />
      <span className="boton__texto">{etiqueta}</span>
    </button>
  );
}
