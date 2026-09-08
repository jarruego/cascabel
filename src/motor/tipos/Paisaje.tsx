import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { Grabadora } from '@/escucha/grabadora';
import {
  borrar,
  borrarTodas,
  guardar,
  listar,
  type GrabacionGuardada,
} from '@/datos/grabaciones';
import { IconoGrabar, IconoParar, IconoTocar } from '@/ui/Transporte';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «paisaje»: grabar sonidos del entorno y montarlos.
 *
 * **Es la única actividad del proyecto que guarda audio**, así que lleva las cautelas a la
 * vista y no escondidas en la letra pequeña:
 *
 *  - Nunca se graba solo: hay que pulsar el botón, y el botón dice lo que hace.
 *  - Mientras graba se ve **y** se dice, con un indicador que no se puede confundir.
 *  - Todo se queda en el dispositivo. Se dice en la pantalla, no solo en la política.
 *  - Cada grabación tiene su botón de borrar, y hay uno para borrarlas todas. **Sin
 *    confirmación**: quien quiere borrar, borra, y poner una pregunta en medio solo sirve
 *    para que borrar dé pereza.
 *  - Al salir de la actividad se suelta el micrófono, pase lo que pase.
 *
 * **Y hay actividad sin micrófono.** Si no hay permiso o no hay `MediaRecorder`, se puede
 * hacer igual: el guion de escucha —salir, callarse y anotar qué se oye— es la mitad
 * importante del ejercicio, y grabarlo es la otra mitad, no el requisito.
 */

export default function Paisaje({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Cosas que buscar, como claves de i18n. Es el guion de escucha. */
    buscar?: string[];
    /** Segundos máximos por grabación. Corto a propósito. */
    maximoSegundos?: number;
  };

  const carril = useCarril(actividad.etapa);
  const maximo = contenido.maximoSegundos ?? 15;

  const grabadora = useRef(new Grabadora());
  const [grabando, setGrabando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [grabaciones, setGrabaciones] = useState<GrabacionGuardada[]>([]);
  const [sonando, setSonando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const limite = useRef<number | null>(null);

  const refrescar = useCallback(async () => {
    setGrabaciones(await listar(actividad.id));
  }, [actividad.id]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  // Al salir: se suelta el micrófono y se para lo que estuviera sonando. Un micrófono
  // encendido después de cerrar la pantalla es lo que hace que nadie vuelva a fiarse.
  useEffect(
    () => () => {
      grabadora.current.cancelar();
      if (limite.current !== null) window.clearTimeout(limite.current);
      audio.current?.pause();
    },
    [],
  );

  const detener = useCallback(async () => {
    if (limite.current !== null) window.clearTimeout(limite.current);
    limite.current = null;
    const r = await grabadora.current.parar();
    setGrabando(false);
    if (!r || r.audio.size === 0) return;
    const g: GrabacionGuardada = {
      id: `${actividad.id}-${Date.now()}`,
      actividadId: actividad.id,
      cuando: Date.now(),
      duracionMs: r.duracionMs,
      audio: r.audio,
    };
    const guardada = await guardar(g);
    // Si no hay almacenamiento se queda solo en memoria: se puede escuchar ahora y se
    // pierde al salir. Es preferible a bloquear la actividad, y más privado además.
    setGrabaciones((previas) => [g, ...previas]);
    if (!guardada) setAviso('paisaje.sinGuardar');
  }, [actividad.id]);

  const empezar = useCallback(async () => {
    setAviso(null);
    try {
      await grabadora.current.empezar();
      setGrabando(true);
      // Tope duro de duración. No es un cronómetro que puntúe: es lo que evita que un
      // micrófono se quede abierto media hora porque nadie se acordó de pararlo.
      limite.current = window.setTimeout(() => void detener(), maximo * 1000);
    } catch (e) {
      const err = e as Error;
      setGrabando(false);
      setAviso(err.message === 'sin-grabadora' ? 'paisaje.sinGrabadora' : 'paisaje.sinPermiso');
    }
  }, [detener, maximo]);

  const escuchar = (g: GrabacionGuardada) => {
    audio.current?.pause();
    const a = new Audio(URL.createObjectURL(g.audio));
    audio.current = a;
    setSonando(g.id);
    a.onended = () => setSonando(null);
    void a.play().catch(() => setSonando(null));
  };

  return (
    <section className="actividad paisaje" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* Qué buscar. Es el guion de escucha, y es la mitad del ejercicio que funciona
          también sin micrófono. */}
      {contenido.buscar && (
        <ul className="paisaje__buscar">
          {contenido.buscar.map((c) => (
            <li key={c}>{t(c)}</li>
          ))}
        </ul>
      )}

      <div className="paisaje__acciones">
        <button
          type="button"
          className="boton-principal boton-arranque paisaje__grabar"
          data-grabando={grabando || undefined}
          aria-pressed={grabando}
          onClick={() => void (grabando ? detener() : empezar())}
        >
          {grabando ? <IconoParar tamano={30} /> : <IconoGrabar tamano={30} />}
          {t(grabando ? 'paisaje.parar' : 'paisaje.grabar')}
        </button>
      </div>

      {/* Mientras graba se ve Y se dice. Un indicador que se pueda confundir con otra cosa
          no sirve para esto. */}
      {grabando && (
        <p className="paisaje__enMarcha" role="status">
          {t('paisaje.enMarcha').replace('{s}', String(maximo))}
        </p>
      )}

      {aviso && (
        <p className="paisaje__aviso" role="status">
          {t(aviso)}
        </p>
      )}

      {grabaciones.length > 0 && (
        <>
          <h2 className="paisaje__titulo">{t('paisaje.tuyas')}</h2>
          <ul className="paisaje__lista">
            {grabaciones.map((g) => (
              <li key={g.id}>
                <button type="button" className="boton-repetir" onClick={() => escuchar(g)}>
                  <IconoTocar />
                  {sonando === g.id ? t('teclado.sonando') : t('paisaje.escuchar')}
                  {/* «12 segundos» y no «12 s»: la abreviatura hay que sabérsela, y esto lo lee un
                      niño de nueve años que está eligiendo cuál de sus grabaciones oír. */}
                  <span className="paisaje__duracion">
                    {Math.round(g.duracionMs / 1000)} {t('paisaje.duracion')}
                  </span>
                </button>
                {/* Borrar a un clic y sin preguntar: una confirmación en medio solo sirve
                    para que borrar dé pereza, y aquí borrar tiene que ser fácil. */}
                <button
                  type="button"
                  className="boton-repetir paisaje__borrar"
                  onClick={() => {
                    void borrar(g.id);
                    setGrabaciones((p) => p.filter((x) => x.id !== g.id));
                  }}
                >
                  {t('paisaje.borrar')}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="boton-repetir"
            onClick={() => {
              void borrarTodas();
              setGrabaciones([]);
            }}
          >
            {t('paisaje.borrarTodas')}
          </button>
        </>
      )}

      {/* Se dice en la pantalla, no solo en la política de privacidad. Quien tiene que
          entenderlo es el niño y el maestro que está a su lado, no un abogado. */}
      <p className="paisaje__promesa">{t('paisaje.sePuedeBorrar')}</p>
    </section>
  );
}
