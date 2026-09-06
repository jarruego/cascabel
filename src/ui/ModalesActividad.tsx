import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icono } from './Icono';
import { t } from '@/i18n';
import type { Actividad } from '@/motor/tipos';

/**
 * Los dos modales que rodean a toda actividad: el que explica antes y el que celebra
 * después.
 */

/**
 * Explicación previa.
 *
 * Existe porque la regla 1 de `docs/04-DISENO-UI.md` dice que nada esencial vive solo en
 * texto: la instrucción tiene que estar **en audio**, con voz humana grabada. Mientras no
 * haya locuciones grabadas —van en `public/audio/es/` y no existen todavía— el botón de
 * escuchar aparece deshabilitado con su motivo, en vez de fingir que funciona.
 *
 * Y existe también por una razón de aula: un maestro que proyecta una actividad nueva
 * necesita leerle la consigna a la clase antes de que veinticinco niños empiecen a tocar.
 */
export function ModalExplicacion({
  actividad,
  alEmpezar,
}: {
  actividad: Actividad;
  alEmpezar: () => void;
}) {
  const [abierto, setAbierto] = useState(true);
  const hayLocucion = Boolean(actividad.locucion?.audio);

  function cerrar() {
    setAbierto(false);
    alEmpezar();
  }

  return (
    <Modal abierto={abierto} alCerrar={cerrar} titulo={actividad.titulo}>
      <Icono nombre="hola" tamano={72} />
      <h2>{actividad.titulo}</h2>

      {actividad.locucion?.enunciado && <p className="modal__texto">{t(actividad.locucion.enunciado)}</p>}

      <div className="modal__acciones">
        {/*
          El botón solo existe si HAY algo que escuchar. Antes aparecía siempre,
          deshabilitado y sin explicación: un botón que no hace nada es peor que no
          tenerlo, porque el niño lo toca y concluye que la app está rota.

          Cuando haya locuciones grabadas —voz humana, nunca síntesis— volverá a salir.
        */}
        {hayLocucion && (
          <button
            type="button"
            className="boton-repetir"
            onClick={() => {
              void new Audio(`/audio/${actividad.locucion!.audio!}`).play().catch(() => {});
            }}
          >
            <Icono nombre="altavoz" tamano={28} /> {t('modal.escucharConsigna')}
          </button>
        )}

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
  alRepetir,
  alVolver,
}: {
  abierto: boolean;
  alRepetir: () => void;
  alVolver: () => void;
}) {
  return (
    <Modal abierto={abierto} alCerrar={alVolver} titulo={t('comun.completada')} tono="celebracion">
      <Icono nombre="chispas" tamano={88} />
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
