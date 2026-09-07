import { useEffect } from 'react';
import { Modal } from './Modal';
import { Personaje } from './Personaje';
import type { Personaje as NombrePersonaje } from './personajes';
import { t } from '@/i18n';
import type { Actividad, } from '@/motor/tipos';

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

  return (
    <Modal abierto={abierto} alCerrar={cerrar} titulo={actividad.titulo}>
      {/* Quién presenta la actividad lo dice su JSON, y por defecto es Dora: la primera de
          la progresión de cocomusic —la base, la seguridad— para una pantalla que es
          exactamente eso, el momento antes de empezar. Ver `docs/14-PERSONAJES.md`. */}
      <Personaje nombre={actividad.personaje ?? 'dora'} pose="saluda" tamano={110} />
      <h2>{actividad.titulo}</h2>

      {actividad.enunciado && <p className="modal__texto">{t(actividad.enunciado)}</p>}

      <div className="modal__acciones">

        <button type="button" className="boton-actividad modal__empezar" onClick={cerrar}>
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
          {t('modal.otraVez')}
        </button>
        <button type="button" className="boton-actividad modal__empezar" onClick={alVolver}>
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
  ms = 1100,
}: {
  actual: number;
  total: number;
  alSeguir: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const id = window.setTimeout(alSeguir, ms);
    return () => window.clearTimeout(id);
  }, [alSeguir, ms]);

  return (
    <button type="button" className="paso" onClick={alSeguir} aria-live="polite">
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
