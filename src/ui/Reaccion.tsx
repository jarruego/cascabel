import { useEffect, useState } from 'react';
import { Personaje } from './Personaje';
import { NOMBRES, type Personaje as Nombre } from './personajes';
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
 */
/**
 * Lo que tarda la tarjeta en irse, en milisegundos.
 *
 * El mismo número que `--reaccion-sale` en `tokens.css`, y está en los dos sitios porque una
 * animación no se puede leer desde JavaScript sin medir el DOM. Si se separan, la tarjeta
 * desaparece a medio irse o se queda un rato invisible ocupando sitio.
 */
const SALIDA_MS = 220;

export function Reaccion({
  tono,
  personaje = 'dora',
  children,
}: {
  /** `neutro` para lo que no es un juicio, como «sigue el dibujo mientras suena». */
  tono: 'bien' | 'casi' | 'neutro';
  personaje?: Nombre;
  children?: React.ReactNode;
}) {
  const hayTexto = Boolean(children);

  /*
    Se enseña un rato, avisa de que se va, y se va.

    Un mensaje que se queda hasta que pase otra cosa acaba siendo parte del decorado: deja
    de leerse y sigue ocupando sitio. Se va sola, y el tiempo sale de lo que hay que leer
    —unos tres segundos y medio de base más un poco por cada palabra—, porque no es lo
    mismo «¡Muy bien!» que una pista de dos líneas.

    **Tres estados y no dos.** Antes desaparecía de golpe al cumplirse el tiempo, y un
    parpadeo en el borde de la pantalla no se distingue de un fallo. Para irse animada tiene
    que seguir montada mientras baja, así que hay un estado intermedio: `saliendo` pone la
    animación de salida y un segundo temporizador la desmonta al acabar.

    El segundo temporizador va contra `SALIDA_MS`, que es el mismo número que el CSS: si se
    separaran, la tarjeta desaparecería a medio irse o se quedaría un rato invisible
    ocupando sitio. Y es un temporizador y no `animationend` a propósito, porque con
    `prefers-reduced-motion` no hay animación y ese evento no llegaría nunca.

    Lo que NO se va solo es `neutro`: ahí no hay reacción, hay una instrucción que tiene que
    seguir estando mientras dure la actividad.
  */
  const [fase, setFase] = useState<'dentro' | 'saliendo' | 'fuera'>('dentro');
  const largo = typeof children === 'string' ? children.length : 60;

  useEffect(() => {
    setFase('dentro');
    if (tono === 'neutro') return;
    const ms = 3500 + largo * 45;
    const empiezaASalir = window.setTimeout(() => setFase('saliendo'), ms);
    const seVa = window.setTimeout(() => setFase('fuera'), ms + SALIDA_MS);
    return () => {
      window.clearTimeout(empiezaASalir);
      window.clearTimeout(seVa);
    };
    // `largo` y `tono` bastan: si cambia el mensaje, vuelve a aparecer y a contar de nuevo.
  }, [tono, largo]);

  const hayQueDecir = fase !== 'fuera' && (tono !== 'neutro' || hayTexto);
  const frase = tono === 'neutro' ? '' : t(`reaccion.${personaje}.${tono}`);

  return (
    <div className="reaccion" aria-live="polite">
      {hayQueDecir && (
        /*
          La clave hace que la tarjeta se monte de nuevo cuando cambia el mensaje, y con
          ella vuelve a correr la animación de entrada. Sin clave, dos reacciones seguidas
          del mismo tono cambiarían el texto sin que nada se moviera, y un mensaje que
          aparece sin movimiento en la esquina de la pantalla no se ve.
        */
        <div
          className="reaccion__tarjeta"
          data-tono={tono}
          data-saliendo={fase === 'saliendo' || undefined}
          key={`${tono}-${largo}`}
        >
          {tono !== 'neutro' && (
            <Personaje
              nombre={personaje}
              pose={tono === 'bien' ? 'celebra' : 'anima'}
              tamano={72}
            />
          )}
          <p className="reaccion__texto">
            {frase && (
              <span className="reaccion__frase">
                <span className="reaccion__quien">{NOMBRES[personaje].nombre}:</span> {frase}
              </span>
            )}
            {/* La pista concreta, que es lo que de verdad enseña. Va debajo y con menos peso
                que la frase, pero se lee entera: sin ella la reacción sería un aplauso. */}
            {hayTexto && <span className="reaccion__pista">{children}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
