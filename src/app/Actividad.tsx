import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { cargarActividad } from '@/datos/cargar';
import { componenteDe } from '@/motor/registro';
import { Lienzo } from '@/ui/Lienzo';
import { Personaje } from '@/ui/Personaje';
import { anotar } from '@/datos/progreso';
import { esLibre, hayCelebracion } from '@/motor/actividadesLibres';
import { orientacionDe } from '@/motor/orientacion';
import { ModalExito, ModalExplicacion, ModalMicrofono } from '@/ui/ModalesActividad';
import { aceptarMicrofono, hayQuePreguntar, rechazarMicrofono } from '@/escucha/permiso';
import { usePreferencias } from './preferencias';
import { t } from '@/i18n';
import type { Actividad as TipoActividad, ResultadoActividad } from '@/motor/tipos';

/**
 * Ruta /actividad/:id. Carga el JSON y se lo entrega al componente del tipo que declare.
 *
 * Aquí se ve por qué el proyecto está montado así: este fichero no sabe nada de música ni
 * de pedagogía. Busca el tipo en el registro y delega. Añadir una actividad no lo toca.
 *
 * **El marco lo ocupa todo lo que NO es la actividad, y por eso es tan poco.** Rediseñado el
 * 2026-09-08 sobre una idea del autor: mientras se juega, la pantalla es de la actividad. La
 * explicación se lee una vez al entrar y desaparece; no se queda arriba comiéndose sitio.
 *
 * Lo que queda en pantalla son cuatro cosas, siempre en el mismo sitio:
 *
 *  - **Arriba a la derecha**, ampliar y reducir. Lo pone `ui/Lienzo.tsx`.
 *  - **Abajo a la izquierda**, «Volver».
 *  - **Abajo en el centro**, el personaje de la actividad. Al tocarlo vuelve la explicación:
 *    es la respuesta a «¿qué había que hacer?», y un niño la busca donde está la cara, no
 *    donde está un icono de interrogación.
 *  - **Abajo a la derecha**, la ficha para imprimir.
 */
export default function Actividad() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const verFicha = usePreferencias((e) => e.verFicha);

  const [actividad, setActividad] = useState<TipoActividad | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoActividad | null>(null);
  /**
   * La explicación se enseña al entrar y se puede volver a abrir con el personaje.
   *
   * `empezada` y `explicacion` son dos cosas distintas a propósito: la primera vez, cerrar
   * la explicación **arranca** la actividad —si no, empezaría a sonar detrás del modal y el
   * niño oiría algo que no ve—; las veces siguientes solo cierra el modal, sin reiniciar
   * nada. Un niño que consulta qué había que hacer no quiere volver a empezar.
   */
  const [empezada, setEmpezada] = useState(false);
  const [explicacion, setExplicacion] = useState(true);
  /**
   * La pantalla que explica para qué vamos a escuchar, entre la explicación y la actividad.
   *
   * Solo en las que usan micrófono y solo la primera vez de la sesión: `CLAUDE.md` §8 pide
   * permiso «tardío y contextual, tras una pantalla explicativa ilustrada», y que si se
   * deniega no se vuelva a insistir. Lo que se acuerda de eso es `escucha/permiso.ts`.
   */
  const [permiso, setPermiso] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setActividad(null);
    setFallo(null);
    setResultado(null);
    setEmpezada(false);
    setExplicacion(true);
    setPermiso(false);
    cargarActividad(id)
      .then((a) => vivo && setActividad(a))
      .catch((e: Error) => vivo && setFallo(e.message));
    return () => {
      vivo = false;
    };
  }, [id]);

  /**
   * Las actividades libres se dan por hechas al abrirlas.
   *
   * El piano, la caja de sonidos o el kit de percusión no tienen final: se tocan hasta que
   * se deja de tocar. Antes eso lo resolvía un botón de «Terminar» dentro de cada una, que
   * además abría la modal de celebración — felicitar a alguien por dejar de tocar el piano
   * es raro — y competía con «Volver». Se quitó, y con él la única forma que había de
   * anotarlas: de ahí este efecto. Qué tipos son libres lo dice
   * `motor/actividadesLibres.ts`, que es donde vive la regla y donde está su test.
   *
   * Se anota directamente, sin pasar por `setResultado`: eso abriría la celebración nada
   * más entrar, que es justo lo que no queremos.
   */
  useEffect(() => {
    if (!actividad || !esLibre(actividad.tipo)) return;
    void anotar({ actividadId: actividad.id, completada: true });
  }, [actividad]);

  /**
   * Volver al catálogo **tal como estaba**: mismos filtros y misma posición.
   *
   * Ir a `/` a secas construía una pantalla nueva, sin filtros y desde arriba del todo. Con
   * setenta y ocho actividades eso significaba volver a filtrar y a bajar cada vez que se
   * abría una, que es la forma más segura de que nadie explore nada.
   *
   * **Se probó retrocediendo en el historial y estaba mal.** `history.back()` no lleva al
   * catálogo: lleva a la pantalla anterior, que puede ser la ficha que acabas de mirar o la
   * actividad de antes. El autor lo vio enseguida — «Volver» le abría la ficha —, y tenía
   * razón en el fondo del asunto: volver es volver al catálogo, no deshacer un paso.
   *
   * Así que el catálogo apunta su propia URL al salir y aquí se va a esa. Filtros intactos y
   * un solo destino. Si no hay nada apuntado —se ha entrado por un enlace directo—, `/`.
   */
  const volver = () => {
    let destino = '/';
    try {
      destino = sessionStorage.getItem('catalogo:url') || '/';
    } catch {
      // Sin almacenamiento se va al catálogo sin filtros, que es lo peor que puede pasar.
    }
    navegar(destino);
  };

  if (fallo) {
    return (
      <main className="actividad-marco">
        <p role="alert">{t('actividad.noEncontrada')}</p>
        <BarraActividad id={id} volver={volver} verFicha={verFicha} />
      </main>
    );
  }
  if (!actividad) {
    return (
      <main className="actividad-marco">
        <p>{t('catalogo.cargando')}</p>
      </main>
    );
  }

  const Componente = componenteDe(actividad.tipo);
  const quien = actividad.personaje ?? 'dora';
  const conMicrofono = actividad.entrada.modo.startsWith('microfono');
  /* En la guía de aula no sale personaje: esa pantalla es el guion del maestro proyectado, y
     ahí una cara es decoración que le roba sitio a lo que mira la clase entera. */
  const conPersonaje = actividad.tipo !== 'guia-aula';

  return (
    <main className="actividad-marco">
      <ModalExplicacion
        abierto={explicacion}
        actividad={actividad}
        alCerrar={() => {
          setExplicacion(false);
          /*
            Si la actividad escucha, y en esta sesión aún no se ha preguntado, va primero la
            pantalla del micrófono. Reabrir la explicación pulsando al personaje no la vuelve
            a sacar: `empezada` ya está puesta y la pregunta ya se hizo.
          */
          if (!empezada && conMicrofono && hayQuePreguntar()) setPermiso(true);
          else setEmpezada(true);
        }}
      />

      <ModalMicrofono
        abierto={permiso}
        personaje={quien}
        alAceptar={() => {
          aceptarMicrofono();
          setPermiso(false);
          setEmpezada(true);
        }}
        alRechazar={() => {
          // Decir que no NO cancela la actividad: se hace entera tocando en la pantalla.
          rechazarMicrofono();
          setPermiso(false);
          setEmpezada(true);
        }}
      />

      <ModalExito
        abierto={Boolean(resultado)}
        personaje={quien}
        alRepetir={() => {
          // Cambiar la clave remonta el componente desde cero: es más fiable que pedirle
          // a cada motor que sepa reiniciarse, y son veintiún motores distintos.
          setResultado(null);
          setIntento((n) => n + 1);
        }}
        alVolver={volver}
      />

      {/* La actividad va dentro del lienzo: es lo que le da el botón de ampliar y lo que
          permite que, al ampliarla, desaparezca todo lo que no es la actividad. */}
      {!empezada ? null : Componente ? (
        <Lienzo orientacion={orientacionDe(actividad)}>
          <Componente
            key={intento}
            actividad={actividad}
            alTerminar={(r) => {
              /*
                Anotar y celebrar son dos cosas distintas.

                Se anota siempre; se celebra solo si la actividad tiene un final que el niño
                alcanza. Un musicograma en bucle no lo tiene: da vueltas hasta que alguien lo
                para, y la modal de «¡Muy bien!» encima con la música sonando es la misma
                rareza que felicitar a alguien por dejar de tocar el piano. La regla vive en
                `motor/actividadesLibres.ts`, al lado de la de las actividades sin final.
              */
              if (hayCelebracion(actividad)) setResultado(r);
              // Si el almacenamiento está bloqueado esto no hace nada y no pasa nada:
              // la actividad ya se ha jugado, que es lo que importa.
              void anotar(r);
            }}
          />
        </Lienzo>
      ) : (
        // No es un error del niño ni del maestro: es que ese tipo de motor aún no existe.
        <p role="status">{t('actividad.tipoPendiente')}</p>
      )}

      <BarraActividad
        id={id}
        volver={volver}
        verFicha={verFicha}
        personaje={conPersonaje ? quien : undefined}
        alPersonaje={() => setExplicacion(true)}
      />
    </main>
  );
}

/**
 * La barra de abajo: volver, el personaje y la ficha.
 *
 * Tres sitios fijos y nada más. Va abajo por la misma razón que la barra de navegación: el
 * pulgar de un niño no llega arriba en una tablet que sostiene con las dos manos.
 */
function BarraActividad({
  id,
  volver,
  verFicha,
  personaje,
  alPersonaje,
}: {
  id: string;
  volver: () => void;
  verFicha: boolean;
  personaje?: string;
  alPersonaje?: () => void;
}) {
  return (
    <div className="barra-actividad no-imprimir">
      {/* Sigue siendo un enlace y no un botón: así se puede abrir en otra pestaña y un
          lector de pantalla lo anuncia como enlace. Lo que cambia es a dónde va: al catálogo
          con los filtros que tuviera, no a `/` pelado. */}
      <Link
        to="/"
        className="barra-actividad__volver"
        onClick={(ev) => {
          if (ev.metaKey || ev.ctrlKey || ev.button !== 0) return;
          ev.preventDefault();
          volver();
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t('comun.volver')}
      </Link>

      {personaje ? (
        <button
          type="button"
          className="barra-actividad__personaje"
          onClick={alPersonaje}
          aria-label={t('actividad.verExplicacion')}
          title={t('actividad.verExplicacion')}
        >
          <Personaje nombre={personaje as never} pose="saluda" tamano={56} />
        </button>
      ) : (
        <span />
      )}

      {verFicha ? (
        <Link to={`/ficha/${id}`} className="barra-actividad__ficha">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('actividad.ficha')}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
