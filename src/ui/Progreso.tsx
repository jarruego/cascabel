import { t } from '@/i18n';

/**
 * Por dónde se va: una barra con un tramo por pregunta.
 *
 * Sustituye a la barra continua de seis píxeles —«muy fea», dijo el autor— y al paso con
 * botón que la reemplazó un día y tampoco gustó: «prefiero la barra de antes, pero más
 * bonita y con secciones marcadas para ver cuántas faltan». Con tramos, cuántas quedan se
 * cuenta de un vistazo y sobra el «vas por el 2 de 5».
 *
 * Dice cuántas van, nunca cuántas se han fallado: eso sería una puntuación (§4). El tramo
 * actual se distingue por forma además de por color, y la barra entera es una `progressbar`
 * para quien la escuche en vez de verla.
 */
export function Progreso({ hechos, total }: { hechos: number; total: number }) {
  if (total <= 1) return null;
  return (
    <ol
      className="progreso"
      role="progressbar"
      aria-label={t('comun.progreso')}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(hechos, total)}
    >
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className="progreso__tramo"
          data-estado={i < hechos ? 'hecho' : i === hechos ? 'actual' : 'pendiente'}
        />
      ))}
    </ol>
  );
}
