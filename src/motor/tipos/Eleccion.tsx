import { useCallback, useEffect, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Boton } from '@/ui/Boton';
import { BotonRepetir } from '@/ui/BotonRepetir';

/**
 * Tipo «elección»: suena o se muestra un estímulo y el niño elige entre 2-4 opciones.
 * Cubre 10 de las 54 actividades del catálogo (¿largo o corto?, agudo o grave,
 * ¿quién ha sonado?, adagio/andante/allegro, mayor o menor...).
 *
 * Reglas que se aplican aquí y no se negocian:
 *  - Sin cronómetro, sin vidas, sin puntuación visible durante la actividad.
 *  - El fallo repite el estímulo y ofrece una pista. No hay pantalla de error.
 *  - Objetivo táctil según la etapa (75 px en Infantil).
 */

interface Estimulo {
  audio: string;
  respuesta: string;
}
interface Opcion {
  clave: string;
  icono: string;
  color: string;
}

export default function Eleccion({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    opciones: Opcion[];
    estimulos: Estimulo[];
  };

  const [indice, setIndice] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [intentos, setIntentos] = useState(0);
  const [feedback, setFeedback] = useState<'ninguno' | 'bien' | 'casi'>('ninguno');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const estimulo = contenido.estimulos[indice];
  const tam = OBJETIVO_TACTIL[actividad.etapa];

  const reproducir = useCallback(() => {
    if (!estimulo) return;
    audioRef.current?.pause();
    const a = new Audio(`/audio/${estimulo.audio}`);
    audioRef.current = a;
    void a.play().catch(() => {
      // Sin gesto previo el navegador bloquea la reproducción: no es un error del niño.
    });
  }, [estimulo]);

  useEffect(() => {
    reproducir();
  }, [reproducir]);

  function elegir(clave: string) {
    if (!estimulo) return;
    setIntentos((n) => n + 1);

    if (clave === estimulo.respuesta) {
      setAciertos((n) => n + 1);
      setFeedback('bien');
      window.setTimeout(() => {
        setFeedback('ninguno');
        if (indice + 1 >= contenido.estimulos.length) {
          alTerminar({
            actividadId: actividad.id,
            completada: true,
            aciertos: aciertos + 1,
            intentos: intentos + 1,
          });
        } else {
          setIndice((i) => i + 1);
        }
      }, 900);
    } else {
      // Nunca «has fallado»: se repite el estímulo y se ofrece la pista.
      setFeedback('casi');
      window.setTimeout(() => {
        setFeedback('ninguno');
        reproducir();
      }, 1200);
    }
  }

  return (
    <section className="actividad" aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <BotonRepetir onClick={reproducir} />

      <div className="opciones" role="group" aria-label={t(contenido.consigna)}>
        {contenido.opciones.map((o) => (
          <Boton
            key={o.clave}
            icono={o.icono}
            color={o.color}
            tamano={tam}
            etiqueta={t(`opcion.${o.clave}`)}
            onClick={() => elegir(o.clave)}
          />
        ))}
      </div>

      {/* aria-live para que un lector de pantalla anuncie el resultado. */}
      <p className="feedback" aria-live="polite">
        {feedback === 'bien' && t('comun.bien')}
        {feedback === 'casi' && (actividad.pistas?.[0] ? t(actividad.pistas[0]) : t('comun.casi'))}
      </p>

      <progress
        value={indice}
        max={contenido.estimulos.length}
        aria-label="Progreso de la actividad"
      />
    </section>
  );
}
