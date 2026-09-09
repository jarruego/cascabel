import { useEffect } from 'react';
import { Modal } from './Modal';
import { Personaje } from './Personaje';
import type { Personaje as NombrePersonaje } from './personajes';
import { t } from '@/i18n';
import { ayudaDe } from '@/motor/ayudaPorTipo';
import type { Actividad } from '@/motor/tipos';
import type { Calidad } from '@/motor/serie';

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
 */
export function ModalExplicacion({
  abierto,
  actividad,
  alCerrar,
}: {
  abierto: boolean;
  actividad: Actividad;
  alCerrar: () => void;
}) {
  const cerrar = alCerrar;
  const ayuda = ayudaDe(actividad);

  return (
    <Modal abierto={abierto} alCerrar={cerrar} titulo={actividad.titulo}>
      {/* Quién presenta la actividad lo dice su JSON, y por defecto es Dora: la primera de
          la progresión de cocomusic —la base, la seguridad— para una pantalla que es
          exactamente eso, el momento antes de empezar. Ver `docs/14-PERSONAJES.md`. */}
      <Personaje nombre={actividad.personaje ?? 'dora'} pose="saluda" tamano={110} />
      <h2>{actividad.titulo}</h2>

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

      <div className="modal__acciones">
        <button type="button" className="boton-principal modal__empezar" onClick={cerrar}>
          {t('comun.empezar')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * La pantalla que explica para qué vamos a escuchar.
 *
 * `CLAUDE.md` §8: «permiso tardío y contextual, tras una pantalla explicativa ilustrada».
 * Sale **después** de la explicación de la actividad y **solo** en las que usan micrófono,
 * justo antes de que el navegador enseñe su propio aviso — que es una barra gris que dice
 * «quiere usar tu micrófono» y no explica nada.
 *
 * Lo que se cuenta aquí es lo único que de verdad importa y el navegador no puede decir:
 * **que la voz se queda en este aparato**. No la oye nadie, no se sube a ningún sitio y no
 * se guarda. Es cierto por construcción —el análisis vive en un `AudioWorklet` y no hay
 * `fetch` ni `MediaRecorder` en el camino— y es lo que hace que jurídicamente no tratemos
 * datos personales de un menor.
 *
 * **Y el texto depende de lo que se va a escuchar.** Con palmadas, el «no» es «prefiero
 * tocar en la pantalla»: la vía de toque está terminada antes de que se escriba ningún
 * detector y con ella la actividad se hace entera, así que son dos botones de verdad. Con
 * voz no hay nada que tocar: escuchar ES la actividad. Ahí el micrófono no se ofrece como
 * opcional —lo pidió el autor el 2026-09-12: «no des opción a no hacerlo»— y la salida es
 * un «ahora no puedo hacer ruido» que **no entra**: la deja para luego y vuelve al
 * catálogo. §8 se mantiene para lo que no decide el niño —permiso denegado, worklet que no
 * carga—: ahí la actividad sigue y se canta sin que se mida.
 */
export function ModalMicrofono({
  abierto,
  personaje = 'dora',
  modo = 'palmada',
  alAceptar,
  alRechazar,
}: {
  abierto: boolean;
  personaje?: NombrePersonaje;
  /** Qué se va a escuchar: la voz o las palmadas. Cambia lo que se dice y lo que ofrece el «no». */
  modo?: 'voz' | 'palmada';
  alAceptar: () => void;
  alRechazar: () => void;
}) {
  return (
    <Modal abierto={abierto} alCerrar={alRechazar} titulo={t('microfono.permiso.titulo')}>
      <Personaje nombre={personaje} pose="escucha" tamano={110} />
      <h2>{t('microfono.permiso.titulo')}</h2>
      <p className="modal__texto">{t(`microfono.permiso.${modo}`)}</p>

      <div className="modal__acciones">
        <button type="button" className="boton-repetir" onClick={alRechazar}>
          {t(modo === 'voz' ? 'comun.sinEscuchar' : 'comun.sinMicrofono')}
        </button>
        <button type="button" className="boton-principal modal__empezar" onClick={alAceptar}>
          {t('comun.empezar')}
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
 * Indicador entre ejercicios: «vas por el 3 de 6», con una pausa breve.
 *
 * La pausa es deliberada y no es un cronómetro: da un respiro entre estímulos para que el
 * niño no encadene seis sin darse cuenta de que ha cambiado la pregunta. Se puede saltar
 * tocando, porque quien quiere seguir no debe esperar.
 */
export function PasoEntreEjercicios({
  actual,
  total,
  alSeguir,
  calidad,
  personaje = 'dora',
  ms,
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
  ms?: number;
}) {
  // Con frase se lee algo: un poco más de tiempo. Sigue saltándose tocando.
  const espera = ms ?? (calidad ? 1600 : 1100);
  useEffect(() => {
    const id = window.setTimeout(alSeguir, espera);
    return () => window.clearTimeout(id);
  }, [alSeguir, espera]);

  return (
    <button type="button" className="paso" onClick={alSeguir} aria-live="polite">
      {calidad && (
        <>
          <Personaje nombre={personaje} pose={calidad === 'bien' ? 'celebra' : 'anima'} tamano={96} />
          <span className="paso__frase">
            {t(calidad === 'bien' ? 'comun.bien' : `serie.paso.${calidad}`)}
          </span>
        </>
      )}
      <span className="paso__puntos" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="paso__punto" data-estado={i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente'} />
        ))}
      </span>
      <span className="paso__texto">
        {t('paso.vas')} {actual + 1} / {total}
      </span>
    </button>
  );
}
