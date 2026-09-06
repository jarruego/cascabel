import { useEffect, useState } from 'react';
import { t } from '@/i18n';

/**
 * Cuenta atrás antes de empezar un ejercicio: tres, dos, uno, ¡ya!
 *
 * No es decoración. Un niño que entra en una actividad de ritmo o de canto necesita saber
 * **cuándo** empieza a contar lo que hace, y sin aviso la mitad de las respuestas se pierden
 * porque todavía estaba mirando la pantalla. En clase entera es aún más claro: veinticinco
 * niños tienen que arrancar a la vez, y para eso hace falta una señal.
 *
 * **No es un cronómetro.** La regla 6 prohíbe los cronómetros por defecto, y con razón: un
 * niño de cuatro años tarda ocho segundos en decidir. Esto no mide cuánto tardas en
 * responder, solo dice cuándo se empieza. Y se puede saltar tocando.
 *
 * Suena además de verse, y se ve además de sonar: en un aula con veinticinco tablets el
 * sonido se pierde, y un alumno sordo necesita la cuenta igual que los demás.
 */

interface Props {
  desde?: number;
  alTerminar: () => void;
  /** Se llama en cada número, para que quien quiera pueda sonar un clic. */
  alContar?: (queda: number) => void;
}

export function CuentaAtras({ desde = 3, alTerminar, alContar }: Props) {
  const [queda, setQueda] = useState(desde);

  useEffect(() => {
    if (queda <= 0) {
      const id = window.setTimeout(alTerminar, 450);
      return () => window.clearTimeout(id);
    }
    alContar?.(queda);
    const id = window.setTimeout(() => setQueda((n) => n - 1), 800);
    return () => window.clearTimeout(id);
  }, [queda, alTerminar, alContar]);

  return (
    <button
      type="button"
      className="cuenta"
      onClick={alTerminar}
      aria-label={t('cuenta.saltar')}
    >
      <span className="cuenta__numero" key={queda} aria-live="assertive">
        {queda > 0 ? queda : t('cuenta.ya')}
      </span>
      <span className="cuenta__pista">{t('cuenta.saltar')}</span>
    </button>
  );
}
