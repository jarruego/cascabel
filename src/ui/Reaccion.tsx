import { useEffect, useRef, useState } from 'react';
import { Personaje } from './Personaje';
import { NOMBRES, type Personaje as Nombre } from './personajes';
import { duracionMs, seVe, sePuedeCerrar, textoDe, type TonoReaccion } from '@/motor/maquinaReaccion';
import { t } from '@/i18n';

/**
 * Cómo reacciona el personaje a lo que acaba de hacer el niño.
 *
 * Sustituye al párrafo suelto de retroalimentación que repetían siete tipos de motor, cada
 * uno con su propio `<p className="feedback">`.
 *
 * **Dos voces, y el orden importa.** Primero el personaje, con una frase corta y suya; luego
 * **la pista concreta**, que es la que enseña algo. Esa segunda parte no la pone este
 * componente: la trae cada actividad, porque «los dos «ti» entran en el mismo pulso» no lo
 * puede decir un personaje genérico. La frase del personaje acompaña, no explica.
 *
 * **Y al fallar no hay lástima.** `CLAUDE.md` §4: el error nunca castiga. Fara no dice «te
 * has equivocado», dice «sin prisa, escucha otra vez»; Milo no se ríe de nadie. Por eso la
 * pose de este caso es `anima` y no una cara triste, y por eso el recuadro es ámbar y nunca
 * rojo.
 *
 * ## Dos elementos y no uno, que es lo que no se ve leyendo
 *
 * Por fuera hay una caja **que nunca se desmonta**: es la región `aria-live`. Por dentro, la
 * tarjeta, que aparece y desaparece con cada mensaje.
 *
 * Podría ser un solo elemento que se monta y se desmonta, y sería un error de los que no dan
 * la cara: **una región `aria-live` que se crea en el mismo momento que su contenido no se
 * anuncia de forma fiable**. Varios lectores de pantalla solo vigilan las regiones que ya
 * estaban, así que crear el recuadro y su texto a la vez es la forma más común de escribir
 * un aviso que un niño ciego no llega a oír. Estando la caja desde el principio, lo que
 * cambia es lo de dentro, y eso sí se anuncia.
 *
 * Y separarlas arregla de paso lo otro: la tarjeta se monta con cada mensaje, así que su
 * animación de entrada vuelve a correr cada vez. En un solo elemento permanente habría
 * corrido una vez, la primera, y nunca más.
 *
 * ## Qué decide este fichero y qué no
 *
 * Aquí solo hay temporizadores y animación. **Cuánto dura cada clase de mensaje lo decide
 * [`motor/maquinaReaccion.ts`](../motor/maquinaReaccion.ts)**, que es donde está el
 * razonamiento y el test: el elogio lleva reloj, y la pista que enseña no lo lleva porque se
 * va cuando el niño vuelve a responder.
 */

/**
 * Lo que tarda la tarjeta en irse, en milisegundos.
 *
 * El mismo número que `--reaccion-sale` en `tokens.css`, y está en los dos sitios porque una
 * animación no se puede leer desde JavaScript sin medir el DOM. Si se separan, la tarjeta
 * desaparece a medio irse o se queda un rato invisible ocupando sitio.
 */
const SALIDA_MS = 220;

/** Lo que hay pintado ahora mismo, que no siempre es lo que el padre pide. Ver abajo. */
interface Puesto {
  tono: TonoReaccion;
  texto: string;
  personaje: Nombre;
  contenido: React.ReactNode;
}

export function Reaccion({
  tono,
  personaje = 'dora',
  children,
  alCerrar,
}: {
  /** `neutro` para lo que no es un juicio, como «sigue el dibujo mientras suena». */
  tono: TonoReaccion;
  personaje?: Nombre;
  children?: React.ReactNode;
  /**
   * Si la tarjeta está bloqueando la actividad —la pista de un fallo mientras se espera a
   * que se lea—, quien la monta pasa aquí qué hacer cuando el niño la cierra: seguir con
   * la pregunta, empezar la escala de nuevo. Con esto, desde los dos segundos
   * (`sePuedeCerrar`) un toque en cualquier sitio, o Escape, la cierra. Sin esto la
   * tarjeta no se cierra tocando: es el caso de las que no bloquean nada.
   */
  alCerrar?: () => void;
}) {
  const texto = textoDe(children);
  const pedida = seVe(tono, texto);
  const ms = duracionMs(tono, texto);

  /*
    Dos estados, y el primero no es el que parece.

    `puesto` es lo que hay pintado, y **sobrevive a que el padre deje de pedirlo**. Hace
    falta porque ahora la pista se va cuando el niño responde, no cuando vence un reloj: en
    ese momento el tipo de motor cambia de fase, deja de pasar texto y el tono vuelve a
    `neutro`. Si la tarjeta leyera las props en ese instante se vaciaría a media animación de
    salida —o peor, desaparecería de golpe, que es el parpadeo que se arregló el 2026-09-09—.
    Guardando lo último que se enseñó, sale con su contenido puesto.

    `saliendo` es el estado intermedio de siempre: pone la animación de salida y deja la
    tarjeta montada mientras baja. El desmontaje va contra `SALIDA_MS` con un temporizador y
    no con `animationend`, porque con `prefers-reduced-motion` no hay animación y ese evento
    no llegaría nunca.
  */
  const [puesto, setPuesto] = useState<Puesto | null>(
    pedida ? { tono, texto, personaje, contenido: children } : null,
  );
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (pedida) {
      setPuesto({ tono, texto, personaje, contenido: children });
      setSaliendo(false);
      // Sin reloj se queda hasta que el padre deje de pedirla, y de eso se encarga la otra
      // rama. Es el caso de `casi` —la pista que enseña— y el de `neutro`.
      if (ms === null) return;
      const empiezaASalir = window.setTimeout(() => setSaliendo(true), ms);
      const seVaDelTodo = window.setTimeout(() => setPuesto(null), ms + SALIDA_MS);
      return () => {
        window.clearTimeout(empiezaASalir);
        window.clearTimeout(seVaDelTodo);
      };
    }

    // Ha dejado de pedirse: el niño ha respondido, o la actividad ha pasado de fase.
    setSaliendo(true);
    const seVaDelTodo = window.setTimeout(() => setPuesto(null), SALIDA_MS);
    return () => window.clearTimeout(seVaDelTodo);

    /*
      `children` NO está en las dependencias, y es a propósito: es un JSX nuevo en cada
      render y reiniciaría la animación sin parar. Lo que identifica un mensaje es su texto,
      así que dos reacciones con las mismas palabras son la misma y la tarjeta no se mueve.
    */
  }, [pedida, tono, texto, personaje, ms]);

  /*
    El toque que cierra.

    Se escucha el `click` en captura, en el documento entero, y **se le para la propagación**
    cuando cae dentro de la actividad: si no, el mismo toque que cierra la pista llegaría al
    botón de debajo como respuesta a la pregunta siguiente, que ya estaría en marcha. Fuera de
    la actividad —«volver», los ajustes— el toque sigue su camino y además cierra.

    La función va en una referencia para que el efecto no se rehaga con cada repintado del
    padre, que la pasa como una flecha nueva cada vez; lo que arma y desarma el oído es que
    haya tarjeta y que sea de las que se cierran.
  */
  const alCerrarRef = useRef(alCerrar);
  alCerrarRef.current = alCerrar;
  const cerrable = Boolean(alCerrar);
  useEffect(() => {
    if (!puesto || saliendo || !cerrable) return;
    const desde = performance.now();
    const cerrar = () => {
      setSaliendo(true);
      alCerrarRef.current?.();
    };
    const alTocar = (ev: MouseEvent) => {
      if (!sePuedeCerrar(performance.now() - desde)) return;
      if (ev.target instanceof Element && ev.target.closest('.actividad')) {
        ev.stopPropagation();
        ev.preventDefault();
      }
      cerrar();
    };
    const alTeclear = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cerrar();
    };
    document.addEventListener('click', alTocar, true);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('click', alTocar, true);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [puesto, saliendo, cerrable]);

  const frase =
    puesto && puesto.tono !== 'neutro' ? t(`reaccion.${puesto.personaje}.${puesto.tono}`) : '';

  return (
    <div className="reaccion" aria-live="polite">
      {puesto && (
        /*
          La clave hace que la tarjeta se monte de nuevo cuando cambia el mensaje, y con
          ella vuelve a correr la animación de entrada. Sin clave, dos reacciones seguidas
          del mismo tono cambiarían el texto sin que nada se moviera, y un mensaje que
          aparece sin movimiento en la esquina de la pantalla no se ve.
        */
        <div
          className="reaccion__tarjeta"
          data-tono={puesto.tono}
          data-saliendo={saliendo || undefined}
          key={`${puesto.tono}-${puesto.texto.length}`}
        >
          {puesto.tono !== 'neutro' && (
            <Personaje
              nombre={puesto.personaje}
              pose={puesto.tono === 'bien' ? 'celebra' : 'anima'}
              tamano={72}
            />
          )}
          <p className="reaccion__texto">
            {frase && (
              <span className="reaccion__frase">
                <span className="reaccion__quien">{NOMBRES[puesto.personaje].nombre}:</span>{' '}
                {frase}
              </span>
            )}
            {/* La pista concreta, que es lo que de verdad enseña. Va debajo y con menos peso
                que la frase, pero se lee entera: sin ella la reacción sería un aplauso. */}
            {puesto.texto !== '' && <span className="reaccion__pista">{puesto.contenido}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
