import { GLIFOS, cuadroDe, type NombreGlifo } from './glifos';

interface Props {
  nombre: NombreGlifo;
  /** Lado del cuadrado, en píxeles. */
  tamano: number;
  className?: string;
  alt?: string;
}

/**
 * Un signo musical centrado de verdad: un SVG cuadrado cuyo `viewBox` es la caja medida
 * del glifo (ver `glifos.ts`), con el carácter de Bravura dibujado en el origen. Vale igual
 * para una clave, una negra o una cifra de compás, y el signo llena el cuadrado sin
 * depender de la altura de línea ni de las métricas de la fuente.
 */
export function Glifo({ nombre, tamano, className, alt = '' }: Props) {
  const { viewBox } = cuadroDe(nombre);
  return (
    <svg
      className={className}
      width={tamano}
      height={tamano}
      viewBox={viewBox}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt === '' ? true : undefined}
    >
      <text x="0" y="0" fontSize="1" fontFamily="Bravura, serif" fill="currentColor">
        {GLIFOS[nombre].codigo}
      </text>
    </svg>
  );
}
