import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Personaje } from './Personaje';
import { t } from '@/i18n';
import type { Actividad, ResultadoActividad } from '@/motor/tipos';
import { diaDeHoy, generarCodigo } from '@/datos/compartir';

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
  actividad,
  alEmpezar,
}: {
  actividad: Actividad;
  alEmpezar: () => void;
}) {
  const [abierto, setAbierto] = useState(true);

  function cerrar() {
    setAbierto(false);
    alEmpezar();
  }

  return (
    <Modal abierto={abierto} alCerrar={cerrar} titulo={actividad.titulo}>
      {/* Dora abre, igual que Doby cierra. Es la primera de la progresión de cocomusic —la
          base, la seguridad— y esta pantalla es exactamente eso: el momento antes de
          empezar. Ver `docs/14-PERSONAJES.md`. */}
      <Personaje nombre="dora" pose="saluda" tamano={110} />
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
  resultado,
  alRepetir,
  alVolver,
}: {
  abierto: boolean;
  resultado: ResultadoActividad | null;
  alRepetir: () => void;
  alVolver: () => void;
}) {
  // Código de verificación: el maestro lo comprueba en /comprobar y ve qué se hizo, sin
  // cuentas de alumno y sin tratar un dato personal. Es el patrón de musictheory.net.
  const codigo =
    resultado && resultado.completada
      ? generarCodigo({
          actividadId: resultado.actividadId,
          aciertos: resultado.aciertos ?? 0,
          intentos: resultado.intentos ?? 0,
          dia: diaDeHoy(),
        })
      : null;

  return (
    <Modal abierto={abierto} alCerrar={alVolver} titulo={t('comun.completada')} tono="celebracion">
      {/* Doby celebra el final, y no es una elección estética: en la metodología cocomusic
          es el personaje del cierre, el que integra lo que han hecho los otros siete. Ver
          `docs/14-PERSONAJES.md`. Si su dibujo aún no está, no se dibuja nada y la modal
          sigue entera. */}
      <Personaje nombre="doby" pose="celebra" tamano={120} />
      <h2>{t('comun.completada')}</h2>
      <p className="modal__texto">{t('modal.exitoTexto')}</p>

      {codigo && (
        <p className="modal__codigo">
          <span className="modal__codigoEtiqueta">{t('modal.codigo')}</span>
          <strong>{codigo.slice(0, 3)} {codigo.slice(3, 6)} {codigo.slice(6)}</strong>
        </p>
      )}

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
