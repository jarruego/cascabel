import { Modal } from './Modal';
import { IconoSiguiente } from './Simbolos';
import { BarraAcciones } from './BarraAcciones';
import { Reaccion } from './Reaccion';
import { Personaje } from './Personaje';
import type { Personaje as NombrePersonaje } from './personajes';
import { t } from '@/i18n';
import { ayudaDe } from '@/motor/ayudaPorTipo';
import type { Actividad } from '@/motor/tipos';
import type { Calidad } from '@/motor/serie';
import { codigoDe } from '@/motor/codigo';

/**
 * Los dos modales que rodean a toda actividad: el que explica antes y el que celebra
 * después.
 */

/**
 * Explicación previa.
 *
 * Existe por una razón de aula: un maestro que proyecta una actividad nueva necesita
 * leerle la consigna a la clase antes de que veinticinco niños empiecen a tocar. Y por una
 * de accesibilidad: quien no lee necesita que alguien se la lea, y para eso la frase tiene
 * que estar a la vista de ese alguien.
 *
 * **Aquí hubo un botón de escuchar y ya no está.** Apuntaba a unas locuciones grabadas que
 * nunca se grabaron; el 2026-09-08 se decidió que no las va a haber. Ver `docs/adr/0006`.
 *
 * **Y aquí se elige con qué se hace la actividad, cuando escucha.** Había una segunda
 * modal después de esta —«vamos a escuchar»— con otro «empezar», y la elección solo salía
 * la primera vez de la sesión. El autor lo pidió el 2026-09-12: una sola modal, y poder
 * elegir cada vez. Con palmadas, los dos botones son «tocar en la pantalla» y «con
 * palmas», que es el verde; con voz, «ahora no puedo hacer ruido» —que no entra— y
 * «empezar». Si el navegador ya dijo que no al micrófono, queda solo la pantalla. Y al
 * reabrir la explicación con el personaje, a mitad de actividad, solo hay «empezar»: la
 * elección ya está hecha y cambiarla a medias sería reiniciar.
 *
 * Lo que se cuenta del micrófono es lo único que importa y el navegador no puede decir:
 * **que la voz se queda en este aparato**. Es cierto por construcción —el análisis vive en
 * un `AudioWorklet` y no hay `fetch` ni `MediaRecorder` en el camino— y es lo que hace que
 * jurídicamente no tratemos datos personales de un menor.
 */
export function ModalExplicacion({
  abierto,
  actividad,
  empezada,
  microfono = null,
  microfonoDenegado = false,
  alEmpezar,
  alSalir,
  alCerrar,
}: {
  abierto: boolean;
  actividad: Actividad;
  /** Si ya se está jugando, la modal solo se cierra: no se vuelve a elegir. */
  empezada: boolean;
  /** Qué escucha la actividad, si escucha y tiene vía por toque. `null`: no elige nada. */
  microfono?: 'voz' | 'palmada' | null;
  /** El navegador ha dicho que no en esta sesión: no se vuelve a ofrecer. */
  microfonoDenegado?: boolean;
  /** Arranca la actividad, con micrófono o tocando en la pantalla. */
  alEmpezar: (eleccion: 'microfono' | 'toque') => void;
  /** «Ahora no puedo hacer ruido»: se deja para luego. */
  alSalir: () => void;
  /** Cerrar la explicación a mitad de actividad. */
  alCerrar: () => void;
}) {
  const ayuda = ayudaDe(actividad);
  const elige = microfono !== null && !empezada;
  const conMicrofono = microfono !== null && !microfonoDenegado;
  const cerrar = empezada ? alCerrar : () => alEmpezar(conMicrofono ? 'microfono' : 'toque');

  return (
    <Modal abierto={abierto} alCerrar={cerrar} titulo={actividad.titulo}>
      {/* Quién presenta la actividad lo dice su JSON, y por defecto es Dora: la primera de
          la progresión de cocomusic —la base, la seguridad— para una pantalla que es
          exactamente eso, el momento antes de empezar. Ver `docs/14-PERSONAJES.md`. */}
      <Personaje nombre={actividad.personaje ?? 'dora'} pose="saluda" tamano={110} />
      <h2>
        <span className="codigo">{codigoDe(actividad.id)}</span> {actividad.titulo}
      </h2>

      {actividad.enunciado && <p className="modal__texto">{t(actividad.enunciado)}</p>}

      {/*
        Cómo se maneja la pantalla, que es igual en todas las de su tipo.

        Estas frases estaban antes fijas ENCIMA de la actividad —«sigue el dibujo con el
        dedo mientras suena», «aquí no hay nada que acertar»— y el autor pidió que dejaran
        de estar ahí: ya se han contado al entrar, y mientras se juega la pantalla es de la
        actividad. Su sitio es este, y se vuelven a leer pulsando al personaje.
      */}
      {ayuda.comoVa && <p className="modal__texto">{t(ayuda.comoVa, ayuda.valores)}</p>}

      {/* Y lo que necesita el adulto y el niño no: que el piano también se toca con el
          teclado del ordenador, que el eco es para dos. Va aparte y en pequeño porque no
          es para quien está a punto de jugar. */}
      {ayuda.paraElAdulto && (
        <p className="modal__adulto">{t(ayuda.paraElAdulto, ayuda.valores)}</p>
      )}

      {/* Para qué se escucha y dónde se queda lo escuchado. Solo mientras se elige. */}
      {elige && conMicrofono && <p className="modal__texto">{t(`microfono.permiso.${microfono}`)}</p>}

      <div className="modal__acciones">
        {elige && microfono === 'palmada' && conMicrofono && (
          <button type="button" className="boton-repetir" onClick={() => alEmpezar('toque')}>
            {t('comun.sinMicrofono')}
          </button>
        )}
        {elige && microfono === 'voz' && conMicrofono && (
          <button type="button" className="boton-repetir" onClick={alSalir}>
            {t('comun.sinEscuchar')}
          </button>
        )}
        <button type="button" className="boton-principal modal__empezar" onClick={cerrar}>
          {elige && microfono === 'palmada' && conMicrofono ? t('comun.conPalmas') : t('comun.empezar')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Celebración al terminar.
 *
 * **No lleva puntuación, ni porcentaje, ni racha, ni estrellas.** La regla 4 de `CLAUDE.md`
 * lo prohíbe, y no por purismo: el dosier lo llama la mitad tóxica de Duolingo. Un contador
 * hunde justo a quien peor va, y quien peor va es quien más necesita volver a abrirlo.
 *
 * Lo que sí hay es reconocimiento de que se ha terminado, que es lo que un niño espera, y
 * dos salidas claras: otra vez, o volver.
 */
export function ModalExito({
  abierto,
  personaje = 'dora',
  alRepetir,
  alVolver,
}: {
  abierto: boolean;
  /** El mismo que presentó la actividad: quien te la explicó es quien te despide. */
  personaje?: NombrePersonaje;
  alRepetir: () => void;
  alVolver: () => void;
}) {
  return (
    <Modal abierto={abierto} alCerrar={alVolver} titulo={t('comun.completada')} tono="celebracion">
      {/* Celebra el mismo personaje que presentó la actividad. Estuvo Doby siempre, por
          ser el del cierre en la metodología, y se cambió el 2026-09-08: quien te ha
          acompañado toda la actividad es quien tiene que despedirte, y Doby cierra el
          recorrido entero, no cada ejercicio. */}
      <Personaje nombre={personaje} pose="celebra" tamano={120} />
      <h2>{t('comun.completada')}</h2>
      <p className="modal__texto">{t('modal.exitoTexto')}</p>

      <div className="modal__acciones">
        <button type="button" className="boton-repetir" onClick={alRepetir}>
          {t('tocar.otraVez')}
        </button>
        <button type="button" className="boton-principal modal__empezar" onClick={alVolver}>
          {t('modal.volver')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * El paso entre ejercicios de una serie: cómo ha ido, «vas por el 3 de 6», y seguir.
 *
 * **Abajo, como todo lo demás.** Estaba encima del tablero, con el personaje y el botón en
 * medio de la pantalla, y en «Cada instrumento con su sonido» se veía raro: el autor pidió
 * dejarlo «como en el resto». Ahora la reacción es la tarjeta del personaje de siempre, y
 * los puntos y el botón verde de «siguiente» van en la botonera de abajo. El tablero del
 * ejercicio que acaba se queda a la vista, con su propia botonera escondida mientras tanto.
 *
 * **Se sigue pulsando, no esperando**: el niño decide cuándo viene el siguiente.
 */
export function PasoEntreEjercicios({
  actual,
  total,
  alSeguir,
  calidad,
  personaje = 'dora',
}: {
  actual: number;
  total: number;
  alSeguir: () => void;
  /**
   * Cómo ha ido el ejercicio que acaba de terminar. Con ella, la pausa es también el
   * «¡muy bien!» que en una actividad de un solo ejercicio pone la modal: sin esto, «La
   * escalera de notas» felicitaba al fallar —la pista— y al final —el cierre—, y al acertar
   * a la primera pasaba al siguiente sin decir nada. Lo vio el autor el 2026-09-12.
   */
  calidad?: Calidad;
  personaje?: NombrePersonaje;
}) {
  return (
    <>
      {calidad && (
        <Reaccion tono={calidad === 'bien' ? 'bien' : calidad === 'casi' ? 'casi' : 'neutro'} personaje={personaje}>
          {t(calidad === 'bien' ? 'comun.bien' : `serie.paso.${calidad}`)}
        </Reaccion>
      )}
      <BarraAcciones>
        <span className="paso acciones__grupo" aria-live="polite">
          <span className="paso__puntos" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="paso__punto" data-estado={i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente'} />
            ))}
          </span>
          <span className="paso__texto">
            {t('paso.vas')} {actual + 1} / {total}
          </span>
        </span>
        <button type="button" className="boton-principal" onClick={alSeguir}>
          <IconoSiguiente />
          {t('serie.siguiente')}
        </button>
      </BarraAcciones>
    </>
  );
}
