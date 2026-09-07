import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio } from '@/audio/AudioEngine';
import { Acompanamiento, transponer, type Patron } from '@/audio/acompanamiento';
import { nombreDe } from '@/ui/coloresNota';
import { IconoParar, IconoTocar } from '@/ui/Transporte';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «acompanamientos»: bases en bucle para cantar o tocar encima.
 *
 * **Es lo que un maestro sin piano no tiene.** Ocho compases que suenan solos mientras la
 * clase canta encima resuelven media sesión, y hasta ahora la única forma de conseguirlos
 * aquí era montarlos a mano en el editor por pistas cada vez.
 *
 * **El transporte es la mitad del valor.** Una canción que en do queda alta se canta en la
 * bemol y ya está: es lo primero que hace cualquiera que acompañe a un grupo, y ajustar la
 * tonalidad a la voz de los niños importa bastante más que el arreglo. Aquí es un par de
 * botones porque el bordón se transporta con una suma — ver `audio/acompanamiento.ts`—, no
 * con un procesado de audio.
 *
 * **Solo suena uno a la vez, y eso es deliberado.** Dos bases sonando juntas no son un
 * arreglo, son ruido; y un botón de parar que hay que buscar entre seis es un botón que no
 * se encuentra. Arrancar una para la anterior.
 */

interface Base {
  /** Cómo se llama. Contenido, no clave de traducción. */
  nombre: string;
  /** Para qué sirve: una línea, la que el maestro necesita para elegir. */
  para: string;
  patron: Patron;
}

/** Hasta dónde se deja transportar: una quinta arriba y otra abajo. */
const TOPE = 7;

export default function Acompanamientos({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as { consigna: string; bases: Base[] };
  const carril = useCarril(actividad.etapa);

  const motores = useRef(new Map<string, Acompanamiento>());
  const [sonando, setSonando] = useState<string | null>(null);
  const [semitonos, setSemitonos] = useState(0);

  const parar = useCallback(() => {
    for (const m of motores.current.values()) m.parar();
    setSonando(null);
  }, []);

  useEffect(() => parar, [parar]);

  const arrancar = useCallback(
    async (base: Base) => {
      if (sonando === base.nombre) {
        parar();
        return;
      }
      parar();
      try {
        await despertarAudio();
        let motor = motores.current.get(base.nombre);
        if (!motor) {
          motor = new Acompanamiento(base.patron);
          await motor.cargar();
          motores.current.set(base.nombre, motor);
        }
        motor.transportar(semitonos);
        motor.arrancar();
        setSonando(base.nombre);
      } catch {
        // Sin muestras la pantalla se sigue leyendo. Nada se cierra.
      }
    },
    [parar, semitonos, sonando],
  );

  /* Cambiar de tonalidad con algo sonando lo cambia en el sitio: parar y volver a dar al
     play rompe la frase que la clase esté cantando, que es justo cuando hace falta subir. */
  const cambiar = (delta: number) => {
    const nuevo = Math.max(-TOPE, Math.min(TOPE, semitonos + delta));
    setSemitonos(nuevo);
    for (const m of motores.current.values()) m.transportar(nuevo);
  };

  return (
    <section className="actividad acompanamientos" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div className="acompanamientos__tono" role="group" aria-label={t('acomp.tonalidad')}>
        <button type="button" className="boton-repetir" onClick={() => cambiar(-1)}>
          {t('acomp.masGrave')}
        </button>
        {/* La tonalidad se dice con el nombre de la nota, no con «+2 semitonos»: quien
            acompaña a un grupo piensa en «en re», no en aritmética. */}
        <output className="acompanamientos__nota" aria-live="polite">
          {nombreDe(transponer('C4', semitonos).replace(/-?\d+$/, ''))}
        </output>
        <button type="button" className="boton-repetir" onClick={() => cambiar(1)}>
          {t('acomp.masAgudo')}
        </button>
      </div>

      <ul className="acompanamientos__lista">
        {contenido.bases.map((b) => {
          const activa = sonando === b.nombre;
          return (
            <li key={b.nombre} className="acompanamientos__base" data-sonando={activa || undefined}>
              <div className="acompanamientos__texto">
                <h2>{b.nombre}</h2>
                <p>{b.para}</p>
                <p className="acompanamientos__datos">
                  {t('acomp.tempo')} {b.patron.tempo} · {b.patron.pulsosPorVuelta}{' '}
                  {t('acomp.pulsos')}
                </p>
              </div>
              <button
                type="button"
                className="boton-actividad"
                aria-pressed={activa}
                onClick={() => void arrancar(b)}
              >
                {activa ? <IconoParar /> : <IconoTocar />}
                {t(activa ? 'accion.parar' : 'accion.empezar')}
              </button>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
