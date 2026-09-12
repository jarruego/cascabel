import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerContexto, pararTodo } from '@/audio/AudioEngine';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoAnterior, IconoParar, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { duracionDe, type Estimulo } from '../estimulo';
import { sonarEstimulo } from '../sonarEstimulo';
import { Personaje } from '@/ui/Personaje';
import type { Personaje as NombrePersonaje, Pose } from '@/ui/personajes';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «presentación»: láminas seguidas para proyectar, cada una con un personaje en una
 * pose, un título grande y un texto para leer en voz alta.
 *
 * Nació para presentar a Milo a la clase (2026-09-12): «diez modales seguidas, una para
 * cada uno de sus dibujos, explicando quién es, su carácter y cómo puede ayudarte». Es la
 * pantalla del maestro, como la guía de aula: se lee a ocho metros, se pasa con dos botones
 * o con las flechas del teclado, y no hay nada que acertar. Cada personaje tendrá la suya
 * escribiendo un JSON, no un componente.
 */

interface Lamina {
  personaje: NombrePersonaje;
  pose: Pose;
  /** Clave de i18n del título, que es lo que dice el personaje. */
  titulo: string;
  /** Clave de i18n del texto que lee el maestro. */
  texto: string;
  /**
   * Lo que el personaje pide escuchar en esa lámina, si pide algo: su nota, tres palmas,
   * una campana que se apaga, dos notas para comparar. Se describe como un estímulo de
   * elección (`motor/estimulo.ts`) y sale un botón de escuchar y parar. Lo pidió el autor
   * el 2026-09-12: «dicen escucha esta canción, busca el sonido…».
   */
  sonido?: Estimulo;
  /** El sonido se repite hasta que se para: es lo que pide un pulso. */
  bucle?: boolean;
}

export default function Presentacion({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as { consigna: string; laminas: Lamina[] };
  const [lamina, setLamina] = useState(0);
  const total = contenido.laminas.length;

  /** Se da por hecha al llegar a la última lámina, una sola vez. Ver `HECHA_CUANDO`. */
  const yaHecha = useRef(false);
  const darPorHecha = useCallback(() => {
    if (yaHecha.current) return;
    yaHecha.current = true;
    alTerminar({ actividadId: actividad.id, completada: true });
  }, [actividad.id, alTerminar]);
  useEffect(() => {
    if (lamina >= total - 1) darPorHecha();
  }, [lamina, total, darPorHecha]);

  const anterior = useCallback(() => setLamina((n) => Math.max(0, n - 1)), []);
  const siguiente = useCallback(() => setLamina((n) => Math.min(total - 1, n + 1)), [total]);

  // Con el teclado, que es lo que hay al lado de un proyector: flechas y espacio.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        siguiente();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        anterior();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [anterior, siguiente]);

  /*
    El personaje mide casi media pantalla: es el protagonista y se mira desde el fondo del
    aula. Su alto es un dato del componente `Personaje`, así que se calcula del alto de la
    ventana y se recalcula al girar la tablet.
  */
  const [altoPersonaje, setAltoPersonaje] = useState(() => alturaPersonaje());
  useEffect(() => {
    const medir = () => setAltoPersonaje(alturaPersonaje());
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  /*
    El botón de escuchar: suena lo que la lámina pide, y el mismo botón para. Las notas y
    los ritmos van por `sonarEstimulo`, contra el reloj de audio; los sonidos grabados, por
    un elemento de audio. Al cambiar de lámina se para todo: lo que suena es de esa lámina.
  */
  const [sonando, setSonando] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const fin = useRef<number | null>(null);
  /** Mientras es verdad, un sonido en bucle vuelve a empezar al acabar. */
  const activo = useRef(false);
  const parar = useCallback(() => {
    activo.current = false;
    if (fin.current !== null) window.clearTimeout(fin.current);
    fin.current = null;
    audio.current?.pause();
    audio.current = null;
    pararTodo();
    setSonando(false);
  }, []);
  useEffect(() => parar, [lamina, parar]);
  const escuchar = useCallback(async (l: Lamina) => {
    const sonido = l.sonido;
    if (!sonido) return;
    parar();
    activo.current = true;
    setSonando(true);
    if (sonido.audio) {
      const a = new Audio(`/audio/${sonido.audio}`);
      a.volume = Math.max(0, Math.min(1, sonido.volumen ?? 1));
      a.loop = Boolean(l.bucle);
      a.onended = () => setSonando(false);
      audio.current = a;
      await a.play().catch(() => setSonando(false));
      return;
    }
    /*
      El bucle se encadena CONTRA EL RELOJ DE AUDIO, no contra el temporizador: cada vuelta
      empieza exactamente donde acaba la anterior (`desde`), y el temporizador solo sirve
      para programar la siguiente un poco antes. Arrancar cada vuelta «ahora» cojeaba lo
      que tardara el temporizador, y un pulso que cojea no es un pulso (2026-09-12).
    */
    const periodo = duracionDe(sonido, sonido.tempo);
    const unaVuelta = async (desde: number) => {
      const acaba = await sonarEstimulo(sonido, { tempo: sonido.tempo, desde });
      if (acaba === null || !activo.current) {
        setSonando(false);
        return;
      }
      if (!l.bucle) {
        fin.current = window.setTimeout(
          () => setSonando(false),
          Math.max(0, (acaba - obtenerContexto().currentTime) * 1000),
        );
        return;
      }
      // La vuelta siguiente empieza donde acaba el patrón entero, silencios incluidos.
      const arranque = desde + periodo;
      fin.current = window.setTimeout(
        () => {
          if (activo.current) void unaVuelta(arranque);
        },
        Math.max(0, (arranque - obtenerContexto().currentTime) * 1000 - 250),
      );
    };
    await unaVuelta(obtenerContexto().currentTime + 0.1);
  }, [parar]);

  const l = contenido.laminas[lamina];
  if (!l) return null;

  return (
    <section className="presentacion" aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* La clave hace que el personaje vuelva a entrar con cada lámina: cambia el dibujo
          Y se mueve, que es lo que hace que veinticinco niños miren. */}
      <div className="presentacion__figura" key={lamina}>
        <Personaje nombre={l.personaje} pose={l.pose} tamano={altoPersonaje} alt="" />
      </div>
      <h2 className="presentacion__titulo">{t(l.titulo)}</h2>
      <p className="presentacion__texto">{t(l.texto)}</p>

      {/* Dónde vas, en puntos: la lámina actual llena, las demás vacías. */}
      <ol className="presentacion__puntos" aria-hidden="true">
        {contenido.laminas.map((x, i) => (
          <li key={x.pose + i} data-actual={i === lamina || undefined} />
        ))}
      </ol>

      <BarraAcciones>
        {/* Siempre en la fila de arriba y del mismo ancho diga lo que diga: si cambiara de
            sitio entre «escuchar» y «parar», el dedo no lo encontraría. */}
        {l.sonido && (
          <button
            type="button"
            className="boton-repetir presentacion__escuchar"
            data-sonando={sonando || undefined}
            onClick={() => (sonando ? parar() : void escuchar(l))}
          >
            {sonando ? <IconoParar /> : <IconoTocar />}
            {sonando ? t('accion.parar') : t('accion.escuchar')}
          </button>
        )}
        <div className="acciones__grupo" role="group" aria-label={t('presentacion.laminas')}>
          <button
            type="button"
            className="boton-repetir"
            aria-label={t('presentacion.anterior')}
            aria-disabled={lamina === 0 || undefined}
            onClick={anterior}
          >
            <IconoAnterior />
          </button>
          <span className="acciones__valor" aria-live="polite">
            {lamina + 1}/{total}
          </span>
          <button
            type="button"
            className="boton-principal"
            aria-label={t('serie.siguiente')}
            aria-disabled={lamina + 1 >= total || undefined}
            onClick={siguiente}
          >
            <IconoSiguiente />
            {t('serie.siguiente')}
          </button>
        </div>
      </BarraAcciones>
    </section>
  );
}

/** Media pantalla de alto, entre lo que cabe en un móvil y lo que aguanta un dibujo. */
function alturaPersonaje(): number {
  if (typeof window === 'undefined') return 260;
  return Math.round(Math.max(160, Math.min(420, window.innerHeight * 0.42)));
}
