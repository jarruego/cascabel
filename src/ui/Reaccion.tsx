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
 */
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
    Se enseña un rato y se va sola.

    Un mensaje que se queda hasta que pase otra cosa acaba siendo parte del decorado: deja
    de leerse y sigue ocupando sitio. Se va sola, y el tiempo sale de lo que hay que leer
    —unos tres segundos y medio de base más un poco por cada palabra—, porque no es lo
    mismo «¡Muy bien!» que una pista de dos líneas.

    Lo que NO se va solo es `neutro`: ahí no hay reacción, hay una instrucción que tiene que
    seguir estando mientras dure la actividad.
  */
  const [visible, setVisible] = useState(true);
  const largo = typeof children === 'string' ? children.length : 60;

  useEffect(() => {
    setVisible(true);
    if (tono === 'neutro') return;
    const ms = 3500 + largo * 45;
    const id = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(id);
    // `largo` y `tono` bastan: si cambia el mensaje, vuelve a aparecer y a contar de nuevo.
  }, [tono, largo]);

  // Sin nada que decir no se dibuja nada: un recuadro vacío esperando a que pase algo llena
  // la pantalla de sitio muerto justo donde el niño está mirando.
  if (tono === 'neutro' && !hayTexto) return null;
  if (!visible) return null;

  const frase = tono === 'neutro' ? '' : t(`reaccion.${personaje}.${tono}`);

  return (
    <div className="reaccion" data-tono={tono} aria-live="polite">
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
  );
}
