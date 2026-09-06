import { useCallback, useEffect, useRef, useState } from 'react';
import { Metronomo } from '@/audio/metronomo';
import { despertarAudio } from '@/audio/AudioEngine';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «guía de aula»: la pantalla del maestro.
 *
 * El aula española de música típica tiene **un proyector y ningún dispositivo por niño**.
 * El dosier lo marca como el riesgo «muy alta probabilidad: es la norma», y por eso este
 * tipo es de primera clase y no un extra. Es además el más barato de construir y el más
 * valioso: una consigna enorme, un pulso que se ve desde el fondo del aula, y los pasos.
 *
 * Aquí no hay evaluación ni acierto: no la usa un niño, la usa un adulto delante de
 * veinticinco. Termina cuando el maestro decide.
 */

interface Paso {
  titulo: string;
  detalle?: string;
  /** Compases o repeticiones sugeridas. Es orientación para el maestro, no un cronómetro. */
  duracion?: string;
}

export default function GuiaAula({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    pasos: Paso[];
    tempo?: number;
    pulsosPorCompas?: number;
    materiales?: string[];
  };

  const [paso, setPaso] = useState(0);
  const [sonando, setSonando] = useState(false);
  const [pulso, setPulso] = useState<number | null>(null);
  const [bpm, setBpm] = useState(contenido.tempo ?? 84);
  const metronomo = useRef<Metronomo | null>(null);
  const rafId = useRef<number | null>(null);

  // Lo visual va SEPARADO del planificador de audio. Si se animara dentro del
  // planificador, el destello se vería hasta 100 ms antes de oírse el clic.
  const bucleVisual = useCallback(() => {
    const m = metronomo.current;
    if (m) {
      for (const p of m.pulsosParaPintar()) setPulso(p.pulso);
    }
    rafId.current = requestAnimationFrame(bucleVisual);
  }, []);

  const arrancar = useCallback(async () => {
    await despertarAudio();
    const m = new Metronomo(bpm, contenido.pulsosPorCompas ?? 4, true);
    metronomo.current = m;
    m.arrancar();
    setSonando(true);
    rafId.current = requestAnimationFrame(bucleVisual);
  }, [bpm, contenido.pulsosPorCompas, bucleVisual]);

  const parar = useCallback(() => {
    metronomo.current?.parar();
    metronomo.current = null;
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    setSonando(false);
    setPulso(null);
  }, []);

  useEffect(() => parar, [parar]);

  useEffect(() => {
    metronomo.current?.cambiarTempo(bpm);
  }, [bpm]);

  const pulsosPorCompas = contenido.pulsosPorCompas ?? 4;
  const actual = pulso === null ? -1 : pulso % pulsosPorCompas;
  const p = contenido.pasos[paso];

  return (
    <section className="guia" aria-labelledby="consigna">
      {/* Modo proyector: todo lo de esta pantalla se lee a ocho metros. Los tamaños
          salen de --proyector-*, no del carril: aquí el usuario es un adulto de pie
          al fondo del aula, no el niño que tiene delante. */}
      <h1 id="consigna" className="guia__consigna">
        {t(contenido.consigna)}
      </h1>

      <div className="guia__pulso" role="group" aria-label={t('guia.pulso')}>
        {Array.from({ length: pulsosPorCompas }, (_, i) => (
          <span
            key={i}
            className="guia__punto"
            data-activo={i === actual}
            data-acentuado={i === 0}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="guia__controles no-imprimir">
        <button type="button" className="boton-repetir" onClick={sonando ? parar : arrancar}>
          {sonando ? t('guia.parar') : t('guia.arrancar')}
        </button>

        <label className="guia__tempo">
          {t('guia.tempo')}
          <input
            type="range"
            min={40}
            max={160}
            step={2}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <output>{bpm}</output>
        </label>

        <button type="button" className="boton-repetir" onClick={() => window.print()}>
          {t('guia.imprimir')}
        </button>
      </div>

      <ol className="guia__pasos">
        {contenido.pasos.map((x, i) => (
          <li key={x.titulo} data-actual={i === paso} className="guia__paso">
            <h2>{t(x.titulo)}</h2>
            {x.detalle && <p>{t(x.detalle)}</p>}
            {x.duracion && <p className="guia__duracion">{x.duracion}</p>}
          </li>
        ))}
      </ol>

      <div className="guia__navegacion no-imprimir">
        <button
          type="button"
          className="boton-repetir"
          aria-disabled={paso === 0 || undefined}
          onClick={() => setPaso((n) => Math.max(0, n - 1))}
        >
          {t('guia.anterior')}
        </button>
        <span aria-live="polite">
          {paso + 1} / {contenido.pasos.length}
        </span>
        {paso + 1 < contenido.pasos.length ? (
          <button type="button" className="boton-repetir" onClick={() => setPaso((n) => n + 1)}>
            {t('guia.siguiente')}
          </button>
        ) : (
          // No hay acierto ni evaluación: termina cuando el maestro lo dice.
          <button
            type="button"
            className="boton-repetir"
            onClick={() => {
              parar();
              alTerminar({ actividadId: actividad.id, completada: true });
            }}
          >
            {t('guia.terminar')}
          </button>
        )}
      </div>

      {contenido.materiales && contenido.materiales.length > 0 && (
        <aside className="guia__materiales">
          <h2>{t('guia.materiales')}</h2>
          <ul>
            {contenido.materiales.map((m) => (
              <li key={m}>{t(m)}</li>
            ))}
          </ul>
        </aside>
      )}

      {p && <p className="solo-imprimir">{t(p.titulo)}</p>}
    </section>
  );
}
