import { useCallback, useEffect, useRef, useState } from 'react';
import { Metronomo } from '@/audio/metronomo';
import { despertarAudio } from '@/audio/AudioEngine';
import { BarraAcciones } from '@/ui/BarraAcciones';
import {
  IconoAnterior,
  IconoImprimir,
  IconoParar,
  IconoSiguiente,
  IconoTocar,
} from '@/ui/Simbolos';
import { vibrarPulso } from '@/ui/vibracion';
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
 * veinticinco. Y como no tiene final, tampoco tiene botón de terminar: se sale por
 * «Volver», que está siempre en el mismo sitio. Ver `motor/actividadesLibres.ts`.
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
  /** Se da por hecha una sola vez: ver `HECHA_CUANDO` en `motor/actividadesLibres.ts`. */
  const yaHecha = useRef(false);
  const darPorHecha = useCallback(() => {
    if (yaHecha.current) return;
    yaHecha.current = true;
    alTerminar({ actividadId: actividad.id, completada: true });
  }, [actividad.id, alTerminar]);

  // El guion se ha seguido cuando se ha llegado al último paso. Con un solo paso, al abrirlo.
  useEffect(() => {
    if (paso >= contenido.pasos.length - 1) darPorHecha();
  }, [paso, contenido.pasos.length, darPorHecha]);
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
      for (const p of m.pulsosParaPintar()) {
        setPulso(p.pulso);
        // El mismo pulso, en la mano: aquí y no en el planificador, que va 100 ms por
        // delante. Ver `ui/vibracion.ts`.
        vibrarPulso(p.acentuado);
      }
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
      {/* Aquí el título SÍ se ve, y es la única actividad donde pasa: esta pantalla se
          proyecta y esa consigna enorme es justo lo que lee la clase. Las demás la
          esconden porque el niño ya la ha leído en la explicación. */}
      <h1 id="consigna" className="guia__consigna">
        {t(contenido.consigna)}
      </h1>

      <div className="guia__pulso" role="group" aria-label={t('accion.pulso')}>
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

      <ol className="guia__pasos">
        {contenido.pasos.map((x, i) => (
          <li key={x.titulo} data-actual={i === paso} className="guia__paso">
            <h2>{t(x.titulo)}</h2>
            {x.detalle && <p>{t(x.detalle)}</p>}
            {x.duracion && <p className="guia__duracion">{x.duracion}</p>}
          </li>
        ))}
      </ol>

      <BarraAcciones>
        {/* Primero lo que se usa cada minuto: pasar de paso. */}
        <div className="acciones__grupo" role="group" aria-label={t('guia.pasos')}>
          <button
            type="button"
            className="boton-repetir"
            aria-label={t('guia.anterior')}
            aria-disabled={paso === 0 || undefined}
            onClick={() => setPaso((n) => Math.max(0, n - 1))}
          >
            <IconoAnterior />
          </button>
          <span className="acciones__valor" aria-live="polite">
            {paso + 1}/{contenido.pasos.length}
          </span>
          {/* En el último paso se apaga, igual que «Anterior» en el primero. Aquí había un
              «Terminar» que cerraba la guía, y la guía no se cierra: se sale por «Volver»,
              como de todas las pantallas que no tienen final. */}
          <button
            type="button"
            className="boton-repetir"
            aria-label={t('guia.siguiente')}
            aria-disabled={paso + 1 >= contenido.pasos.length || undefined}
            onClick={() => setPaso((n) => Math.min(contenido.pasos.length - 1, n + 1))}
          >
            <IconoSiguiente />
          </button>
        </div>

        <label className="guia__tempo acciones__grupo">
          {t('guia.tempo')}
          <input
            type="range"
            min={40}
            max={160}
            step={2}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <output className="acciones__valor">{bpm}</output>
        </label>

        {/* Lo que se hace una vez. */}
        <button type="button" className="boton-repetir" onClick={() => window.print()}>
          <IconoImprimir />
          {t('guia.imprimir')}
        </button>

        {/* Y el verde, el último: a la derecha, como en todas las botoneras. */}
        <button
          type="button"
          className="boton-principal boton-arranque"
          data-sonando={sonando || undefined}
          onClick={sonando ? parar : arrancar}
        >
          {sonando ? <IconoParar /> : <IconoTocar />}
          {sonando ? t('accion.sinPulso') : t('accion.pulso')}
        </button>
      </BarraAcciones>

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
