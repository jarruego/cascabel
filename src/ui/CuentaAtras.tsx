import { useEffect, useState } from 'react';
import { clic } from '@/audio/clic';
import { obtenerContexto } from '@/audio/AudioEngine';
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
 * **Suena, y suena EN TEMPO.** Con `bpm`, los números caen al pulso de la actividad, así que
 * la cuenta atrás deja de ser un aviso y pasa a ser lo que un músico llama una entrada: no
 * solo dice cuándo se empieza, sino a qué velocidad. Una cuenta a un tempo cualquiera seguida
 * de una melodía a otro es peor que no contar, porque enseña una velocidad falsa justo antes
 * de pedir la buena.
 *
 * El «¡ya!» va acentuado, como el primer tiempo de un compás, que es lo que hace un director
 * y lo que un niño reconoce sin que se lo expliquen.
 *
 * Y se ve además de sonar: en un aula con veinticinco tablets el sonido se pierde, y un
 * alumno sordo necesita la cuenta igual que los demás.
 */

interface Props {
  desde?: number;
  alTerminar: () => void;
  /** Pulsos por minuto de la actividad. Sin esto, la cuenta va a un paso cómodo por defecto. */
  bpm?: number;
  /** Se llama en cada número, por si alguien quiere añadir algo más. */
  alContar?: (queda: number) => void;
}

/** Sin tempo declarado, 75 ppm: un paso andando, ni agobiante ni lento. */
const MS_POR_DEFECTO = 800;

export function CuentaAtras({ desde = 3, alTerminar, bpm, alContar }: Props) {
  const [queda, setQueda] = useState(desde);

  // Se acota entre 400 y 1200 ms. Un tempo de 40 dejaría una cuenta de seis segundos y uno
  // de 200 la haría ininteligible: en los extremos, la cuenta deja de servir para lo suyo.
  const intervalo = bpm ? Math.min(1200, Math.max(400, 60000 / bpm)) : MS_POR_DEFECTO;

  useEffect(() => {
    // El clic va dentro del mismo efecto que pinta el número, no en un planificador aparte:
    // aquí lo que importa es que el sonido y el dígito lleguen juntos, y son cuatro eventos,
    // no una rejilla rítmica. Para eso sí haría falta el `lookahead` (CLAUDE.md §7).
    try {
      clic(obtenerContexto().currentTime, queda <= 0);
    } catch {
      // Sin audio la cuenta se ve igual. Nunca es motivo para no empezar.
    }

    if (queda <= 0) {
      const id = window.setTimeout(alTerminar, Math.min(450, intervalo * 0.6));
      return () => window.clearTimeout(id);
    }
    alContar?.(queda);
    const id = window.setTimeout(() => setQueda((n) => n - 1), intervalo);
    return () => window.clearTimeout(id);
  }, [queda, alTerminar, alContar, intervalo]);

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
