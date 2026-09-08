import { useState } from 'react';
import { t } from '@/i18n';
import { Icono } from '@/ui/Icono';
import { Modal } from '@/ui/Modal';

/**
 * Propuestas para un instrumento.
 *
 * **Un instrumento no tiene consigna, y aun así hace falta decir por dónde empezar.** Un
 * piano en blanco delante de un niño de siete años produce treinta segundos de teclas al
 * azar y después aburrimiento; no porque no le interese, sino porque no se le ha ocurrido
 * nada que hacer. Eso no se arregla convirtiéndolo en una actividad —perdería lo que lo
 * hace valioso, que es que no hay respuesta correcta— sino **dándole ideas que pueda
 * ignorar**.
 *
 * De ahí las tres reglas de este componente:
 *
 *  1. **Es un botón, no un cartel.** La primera versión mostraba la propuesta siempre
 *     visible encima del instrumento, y eso le quitaba sitio al instrumento en la pantalla
 *     donde menos sobra. Como botón ocupa lo que ocupa un botón, se abre cuando se quiere,
 *     y dentro del modal la letra cabe al tamaño al que de verdad se lee.
 *  2. **Una sola propuesta a la vez.** Una lista de diez es un menú, y un menú vuelve a
 *     pedir una decisión que era justo lo que faltaba. Una sola es una invitación.
 *  3. **Nunca se comprueba nada.** No hay acierto, no hay final y no hay forma de hacerlo
 *     mal. Si el niño hace otra cosa, ha hecho lo correcto.
 *
 * Las mejores son las que tienen una respuesta que el niño quiere enseñar: «¿cómo suena tu
 * nombre?» funciona porque el resultado es suyo y no hay dos iguales.
 */

interface Props {
  /** Claves de i18n. Se muestran de una en una, en orden. */
  retos: string[];
}

export function Retos({ retos }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [i, setI] = useState(0);
  if (retos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="boton-repetir retos__boton"
        onClick={() => setAbierto(true)}
      >
        <Icono nombre="bombilla" tamano={26} />
        {t('retos.pruebaA')}
      </button>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={t('retos.pruebaA')}
        tono="normal"
      >
        <Icono nombre="bombilla" tamano={72} />
        <p className="retos__texto">{t(retos[i % retos.length]!)}</p>

        <div className="modal__acciones">
          {retos.length > 1 && (
            <button type="button" className="boton-repetir" onClick={() => setI((n) => n + 1)}>
              {t('retos.otra')}
            </button>
          )}
          <button
            type="button"
            className="boton-principal modal__empezar"
            onClick={() => setAbierto(false)}
          >
            {t('retos.aTocar')}
          </button>
        </div>
      </Modal>
    </>
  );
}
