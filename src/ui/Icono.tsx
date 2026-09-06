/**
 * Iconos de actividad.
 *
 * Regla 3 de `docs/04-DISENO-UI.md`: **iconos concretos**. Un tambor dibujado vale más que
 * un icono de corchea, y este más que la palabra «ritmo». Nada de metáforas de oficina: el
 * disquete de «guardar» no significa nada para alguien nacido en 2020.
 *
 * Van como SVG en línea y no como fuente de iconos ni imagen externa: la regla 1 del
 * proyecto prohíbe cualquier petición fuera de nuestro origen, y así además heredan el
 * color del texto y escalan sin pixelarse.
 *
 * La forma nunca es lo único que distingue a dos opciones — siempre forma + color + sonido
 * (regla 4). Por eso «suena» y «silencio» no son el mismo dibujo en dos colores.
 */

interface Props {
  nombre: string;
  tamano?: number;
}

export function Icono({ nombre, tamano = 48 }: Props) {
  const comun = {
    width: tamano,
    height: tamano,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  switch (nombre) {
    // Altavoz con ondas: algo está sonando.
    case 'altavoz':
      return (
        <svg {...comun}>
          <path d="M6 19h7l9-7v24l-9-7H6z" fill="currentColor" fillOpacity="0.18" />
          <path d="M29 17c2.6 2 2.6 12 0 14" />
          <path d="M35 12c5 4.5 5 19.5 0 24" />
        </svg>
      );

    // Altavoz tachado: silencio. La barra diagonal es la diferencia de FORMA, no de color.
    case 'silencio':
      return (
        <svg {...comun}>
          <path d="M6 19h7l9-7v24l-9-7H6z" fill="currentColor" fillOpacity="0.18" />
          <path d="M30 19l10 10M40 19L30 29" />
        </svg>
      );

    case 'tambor':
      return (
        <svg {...comun}>
          <ellipse cx="24" cy="17" rx="15" ry="6" />
          <path d="M9 17v14c0 3.3 6.7 6 15 6s15-2.7 15-6V17" />
          <path d="M12 21l24 6M36 21l-24 6" />
        </svg>
      );

    case 'mano':
      return (
        <svg {...comun}>
          <path d="M17 24V12a3 3 0 016 0v10V9a3 3 0 016 0v13V13a3 3 0 016 0v18c0 5.5-4.5 10-10 10h-3c-5 0-8-3-10-7l-5-9a3 3 0 015-3l2 3" />
        </svg>
      );

    default:
      // Nunca se deja un hueco: un círculo es mejor que nada, y se ve en revisión.
      return (
        <svg {...comun}>
          <circle cx="24" cy="24" r="14" />
        </svg>
      );
  }
}
