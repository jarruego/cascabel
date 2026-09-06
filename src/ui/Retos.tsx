import { useState } from 'react';
import { t } from '@/i18n';

/**
 * Propuestas para un instrumento.
 *
 * **Un instrumento no tiene consigna, y aun así hace falta decir por dónde empezar.** Un
 * piano en blanco delante de un niño de siete años produce treinta segundos de teclas al
 * azar y después aburrimiento; no porque no le interese, sino porque no se le ha ocurrido
 * nada que hacer. Eso no se arregla convirtiéndolo en una actividad —perdería lo que lo
 * hace valioso, que es que no hay respuesta correcta— sino **dándole ideas que pueda
 * ignorar**.
 *
 * De ahí las dos reglas de este componente:
 *
 *  1. **Una sola propuesta a la vez.** Una lista de diez es un menú, y un menú vuelve a
 *     pedir una decisión que era justo lo que faltaba. Una sola es una invitación.
 *  2. **Nunca se comprueba nada.** No hay acierto, no hay final y no hay forma de hacerlo
 *     mal. Si el niño hace otra cosa, ha hecho lo correcto.
 *
 * Las mejores son las que tienen una respuesta que el niño quiere enseñar: «¿cómo suena tu
 * nombre?» funciona porque el resultado es suyo y no hay dos iguales.
 */

interface Props {
  /** Claves de i18n. Se muestran de una en una, en orden. */
  retos: string[];
}

export function Retos({ retos }: Props) {
  const [i, setI] = useState(0);
  if (retos.length === 0) return null;

  return (
    <aside className="retos">
      <p className="retos__titulo">{t('retos.pruebaA')}</p>
      {/* aria-live: al cambiar de propuesta hay que anunciarla sin robar el foco, que
          sigue en el botón de «otra idea» por si quiere seguir mirando. */}
      <p className="retos__texto" aria-live="polite">
        {t(retos[i % retos.length]!)}
      </p>
      {retos.length > 1 && (
        <button type="button" className="retos__otra" onClick={() => setI((n) => n + 1)}>
          {t('retos.otra')}
        </button>
      )}
    </aside>
  );
}
