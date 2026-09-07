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
  // Sin nada que decir no se dibuja nada: un recuadro vacío esperando a que pase algo llena
  // la pantalla de sitio muerto justo donde el niño está mirando.
  if (tono === 'neutro' && !hayTexto) return null;

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
