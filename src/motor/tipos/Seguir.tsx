import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { Metronomo } from '@/audio/metronomo';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { rejillaDesdeSilabas } from '../rejillaRitmica';

/**
 * Tipo «seguir»: reproducción con cursor sincronizado. Musicograma y karaoke.
 *
 * El niño no responde nada: **mira y sigue**. Es la actividad más pasiva del catálogo y a
 * la vez una de las más útiles, porque es donde se aprende que la música avanza en el
 * tiempo y que lo que se oye se puede representar.
 *
 * No hay acierto ni error: por eso no usa ninguna máquina de estados con solución. Termina
 * cuando acaba la pieza o cuando el maestro lo decide.
 *
 * **El cursor va por `requestAnimationFrame` y no por el planificador de audio.** Animar
 * dentro del planificador adelanta el destello respecto al sonido hasta cien milisegundos,
 * que a esta edad es la diferencia entre entender el pulso y no entenderlo.
 */

interface Bloque {
  /** Texto o sílaba que se muestra. */
  texto?: string;
  icono?: string;
  color?: string;
  /** Pulsos que dura este bloque. */
  pulsos?: number;
}

export default function Seguir({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    bloques: Bloque[];
    tempo?: number;
    /** Sílabas rítmicas si el musicograma es de ritmo; si no, se usa `pulsos` por bloque. */
    silabas?: string[];
    /** Nota que suena en cada bloque, si se quiere sonido melódico. */
    notas?: string[];
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 92;
  const bloques = contenido.bloques;

  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(-1);
  const sampler = useRef<Sampler | null>(null);
  const metronomo = useRef<Metronomo | null>(null);
  const rafId = useRef<number | null>(null);
  const hitos = useRef<number[]>([]);
  const yaTerminada = useRef(false);

  const parar = useCallback(() => {
    metronomo.current?.parar();
    metronomo.current = null;
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    setSonando(false);
    setActual(-1);
  }, []);

  useEffect(() => parar, [parar]);

  const arrancar = useCallback(async () => {
    if (sonando) return;
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras el musicograma se sigue viendo: el cursor avanza igual y el
        // metrónomo marca el pulso. Se pierde la melodía, no la actividad.
      }
    }

    const ctx = obtenerContexto();
    const msPorPulso = 60000 / bpm;
    const inicio = ctx.currentTime * 1000 + 500;

    // Cada bloque empieza donde acaba el anterior. Si hay sílabas rítmicas se usan sus
    // duraciones; si no, cada bloque dura lo que declare, y por defecto un pulso.
    const duraciones = contenido.silabas
      ? rejillaDesdeSilabas(contenido.silabas).golpes.map((_, i, a) =>
          i + 1 < a.length ? a[i + 1]! - a[i]! : 1,
        )
      : bloques.map((b) => b.pulsos ?? 1);

    let acumulado = 0;
    hitos.current = duraciones.map((d) => {
      const ms = inicio + acumulado * msPorPulso;
      acumulado += d;
      return ms;
    });

    // El sonido se programa contra el reloj de audio; el cursor lo consume aparte.
    hitos.current.forEach((ms, i) => {
      const nota = contenido.notas?.[i];
      if (nota) sampler.current?.tocar(nota, ms / 1000, msPorPulso / 1000);
    });

    const m = new Metronomo(bpm, 4, !contenido.notas);
    metronomo.current = m;
    m.arrancar();
    setSonando(true);

    const seguirCursor = () => {
      const ahora = obtenerContexto().currentTime * 1000;
      let indice = -1;
      for (let i = 0; i < hitos.current.length; i++) {
        if (ahora >= hitos.current[i]!) indice = i;
      }
      setActual(indice);

      const fin = inicio + acumulado * msPorPulso;
      if (ahora >= fin) {
        parar();
        if (!yaTerminada.current) {
          yaTerminada.current = true;
          alTerminar({ actividadId: actividad.id, completada: true });
        }
        return;
      }
      rafId.current = requestAnimationFrame(seguirCursor);
    };
    rafId.current = requestAnimationFrame(seguirCursor);
  }, [sonando, bpm, bloques, contenido.silabas, contenido.notas, parar, actividad.id, alTerminar]);

  return (
    <section className="actividad seguir" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      {/* El musicograma. Cada bloque se ilumina cuando le toca: es lo que enseña que la
          música avanza en el tiempo y que lo que suena se puede dibujar. */}
      <ol className="seguir__tira" aria-label={t(contenido.consigna)}>
        {bloques.map((b, i) => (
          <li
            key={`${b.texto ?? b.icono ?? i}-${i}`}
            className="seguir__bloque"
            data-actual={i === actual || undefined}
            data-pasado={i < actual || undefined}
            style={b.color ? { borderColor: `var(--eje-${b.color})` } : undefined}
          >
            {b.icono && <Icono nombre={b.icono} tamano={44} />}
            {b.texto && <span className="seguir__texto">{t(b.texto)}</span>}
          </li>
        ))}
      </ol>

      <div className="seguir__acciones">
        <button
          type="button"
          className="boton-actividad seguir__play"
          onClick={() => (sonando ? parar() : void arrancar())}
        >
          <Icono nombre={sonando ? 'pausa' : 'reproducir'} tamano={36} />
          {sonando ? t('seguir.parar') : t('seguir.empezar')}
        </button>
      </div>

      <p className="feedback" aria-live="polite">
        {sonando ? t('seguir.sigue') : t('seguir.listo')}
      </p>
    </section>
  );
}
