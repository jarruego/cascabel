import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { usePreferencias } from '@/app/preferencias';
import type { Orientacion } from '@/motor/orientacion';

/**
 * Modo lienzo: la actividad ocupa la pantalla entera y desaparece todo lo demás.
 *
 * **Para qué sirve de verdad.** Un piano rodeado de título, enunciado, botón de atrás,
 * barra de navegación y enlace a la ficha es un piano pequeño con muchas cosas alrededor. En
 * una pizarra digital eso es el problema entero: lo que se ve desde el fondo del aula es lo
 * grande, y todo lo que no es la actividad le está robando sitio. En una tablet pequeña,
 * igual.
 *
 * **Por qué no basta con la API de pantalla completa.** `requestFullscreen()` no existe para
 * elementos arbitrarios en Safari de iOS —solo para vídeo—, y ahí es donde más falta hace,
 * porque es donde la barra del navegador se come más pantalla. Así que el modo se aplica
 * **siempre por CSS**, que funciona en todas partes, y *además* se intenta la API nativa
 * para ganar también la barra del navegador donde exista. Si la API falla, no pasa nada: el
 * modo ya está puesto. Es la misma regla que con el micrófono — se intenta y se cae con
 * elegancia, nunca se pregunta al navegador si sabe hacer algo.
 *
 * Lo que se esconde lo decide el CSS, no este componente: cada tipo de actividad sabe qué
 * partes suyas son lienzo y cuáles son explicación.
 */

/**
 * ¿Estamos ya fuera del navegador?
 *
 * Cierto en una PWA instalada, que arranca sin barra de direcciones y ocupando la pantalla.
 * Se pregunta por el **modo de presentación**, que es un estado del documento, no por el
 * aparato: `CLAUDE.md` §8 prohíbe mirar el `user agent` y esto no lo mira.
 *
 * `navigator.standalone` es el equivalente en Safari de iOS, que no implementa la consulta
 * de medios. No está en los tipos estándar porque es propietario.
 */
function fueraDelNavegador(): boolean {
  const comoApp =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  const enIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return comoApp || enIOS;
}

/**
 * ¿Tiene sentido pedirle a alguien que gire esto?
 *
 * Solo si es algo que se sostiene. La comprobación es **el tamaño de la pantalla**, no el
 * aparato: un móvil y una tablet miden menos de 1200 px por su lado mayor y un monitor o una
 * pizarra, más. Es una aproximación y se sabe por dónde falla —un monitor pequeño se comería
 * una línea que no le sirve, una tablet enorme se quedaría sin ella— y aun así es preferible
 * a mirar el `user agent`, que es lo que `CLAUDE.md` §8 prohíbe: los agentes mienten y las
 * versiones cambian, y el tamaño de la pantalla no.
 *
 * Lo peor que pasa si se equivoca es una línea de texto de más o de menos. No bloquea nada.
 */
function sePuedeGirarAMano(): boolean {
  return Math.max(window.screen.width, window.screen.height) <= 1200;
}

interface Props {
  children: React.ReactNode;
  /**
   * En qué postura se ve mejor esta actividad. Lo decide `motor/orientacion.ts`.
   *
   * Por defecto, ninguna: **no tocar la pantalla es la respuesta correcta** cuando da igual,
   * y es la que faltaba. Hasta el 2026-09-09 se pedía apaisado siempre, y eso giraba al
   * revés justo las cinco actividades donde las notas caen de arriba abajo.
   */
  orientacion?: Orientacion;
}

export function Lienzo({ children, orientacion = 'cualquiera' }: Props) {
  const [ampliado, setAmpliado] = useState(false);
  /** Puesto solo si hace falta girar y no se ha podido. Es una sugerencia, no un bloqueo. */
  const [sugerirGiro, setSugerirGiro] = useState(false);
  const caja = useRef<HTMLDivElement | null>(null);
  const pizarra = usePreferencias((e) => e.pizarra);

  const alternar = useCallback(async () => {
    const siguiente = !ampliado;
    setAmpliado(siguiente);
    setSugerirGiro(false);
    try {
      if (siguiente) {
        /*
          Solo se pide pantalla completa si hay algo que ganar con ella.

          En el navegador se gana la barra de direcciones, y a cambio Chrome saca su aviso de
          «para salir, desliza desde arriba». Ese aviso **no se puede silenciar** y está bien
          que no se pueda: impide que una web se haga pasar por el sistema entero.

          Pero en la PWA instalada no hay barra que ganar —la aplicación ya ocupa la
          pantalla—, así que la llamada no aporta nada y el aviso sale igual. El modo lienzo
          no depende de ella: se aplica siempre por CSS, que es lo que hace que funcione
          también en Safari de iOS.
        */
        if (!fueraDelNavegador()) await caja.current?.requestFullscreen?.();

        /*
          Y se pide la postura que necesita ESTA actividad, si es que necesita alguna.

          Tres cosas hacen que no se pida nada, y las tres son razones y no cautelas:

           1. **A la actividad le da igual.** La mayoría. Girar por girar sorprende y deja al
              niño con el aparato en una postura que no eligió.
           2. **Es una pizarra.** Una pizarra no gira. Es una preferencia declarada en
              ajustes, no una adivinanza sobre el aparato — `CLAUDE.md` §8 prohíbe lo
              segundo y con razón.
           3. **Ya está así.** No hay nada que ganar.

          Y si hay que girar pero no se puede —Safari de iOS, escritorio— tampoco es un
          error: la actividad ya ha ganado la pantalla completa, que era la mitad del
          objetivo. Se ofrece girarlo a mano y se sigue. Misma regla que con el micrófono.
        */
        if (orientacion !== 'cualquiera' && !pizarra) {
          const quiereApaisado = orientacion === 'apaisado';
          const yaEsta = window.matchMedia(
            quiereApaisado ? '(orientation: landscape)' : '(orientation: portrait)',
          ).matches;
          if (!yaEsta) {
            let girada = false;
            try {
              const api = screen.orientation as ScreenOrientation & {
                lock?: (orientacion: string) => Promise<void>;
              };
              if (api.lock) {
                await api.lock(quiereApaisado ? 'landscape' : 'portrait');
                girada = true;
              }
            } catch {
              // En el escritorio, Chrome tiene `lock` y lanza: girar un monitor no existe.
            }
            if (!girada && sePuedeGirarAMano()) setSugerirGiro(true);
          }
        }
        // Ojo: sin pantalla completa nativa no hay `fullscreenchange`, así que el efecto de
        // abajo no se entera de nada. No hace falta: de este modo se sale por el botón.
      } else {
        /*
          Al reducir se suelta la orientación SIEMPRE, y salir de pantalla completa solo si
          se entró.

          Estaban las dos cosas juntas dentro de la misma condición, y eso se rompía en
          cuanto la pantalla completa dejó de pedirse en la PWA instalada: ahí
          `fullscreenElement` es nulo, así que no se soltaba nada y el móvil se quedaba
          girado al volver al catálogo. Son dos cosas distintas y ahora se preguntan por
          separado.
        */
        (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.();
        if (document.fullscreenElement) await document.exitFullscreen();
      }
    } catch {
      // Sin API nativa el modo CSS ya está aplicado y se ve igual de grande dentro de la
      // página. No hay nada que avisar ni nada que arreglar.
    }
  }, [ampliado, orientacion, pizarra]);

  // Salir con Escape, o desde el propio navegador, tiene que devolvernos al estado normal.
  // Sin esto, cerrar la pantalla completa con Escape dejaría la página con el CSS de lienzo
  // puesto y sin forma evidente de quitarlo.
  useEffect(() => {
    const alCambiar = () => {
      if (!document.fullscreenElement) {
        setAmpliado(false);
        setSugerirGiro(false);
      }
    };
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  return (
    <div ref={caja} className="lienzo" data-ampliado={ampliado || undefined}>
      {children}

      {/* Una línea, para el adulto, y solo mientras la pantalla tenga la forma contraria: en
          cuanto se gira desaparece sola. No bloquea nada — la actividad se puede hacer
          entera sin girar, solo con menos sitio. */}
      {ampliado && sugerirGiro && (
        <p className="lienzo__giro no-imprimir" role="status">
          {t(orientacion === 'apaisado' ? 'lienzo.mejorApaisado' : 'lienzo.mejorVertical')}
        </p>
      )}
      <button
        type="button"
        className="lienzo__boton no-imprimir"
        onClick={() => void alternar()}
        /* aria-pressed y no dos botones distintos: es un interruptor, y un lector de
           pantalla lo anuncia como tal sin que cambie el nombre debajo del dedo. */
        aria-pressed={ampliado}
        aria-label={t(ampliado ? 'lienzo.restaurar' : 'lienzo.ampliar')}
        title={t(ampliado ? 'lienzo.restaurar' : 'lienzo.ampliar')}
      >
        {/* Los dos iconos son cuatro esquinas: hacia fuera para ampliar, hacia dentro para
            restaurar. Es el símbolo que ya conocen de cualquier reproductor de vídeo. */}
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          {ampliado ? (
            <path
              d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
