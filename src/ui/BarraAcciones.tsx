import { useEffect, useRef } from 'react';
import { t } from '@/i18n';

/**
 * La botonera de la actividad: un sitio fijo, el mismo en las veintiuna pantallas.
 *
 * ## Por qué existe
 *
 * Lo describió el autor el 2026-09-09, y era exacto: «según la altura de la actividad o la
 * propia actividad salen unos botones u otros, con icono, sin icono, centrado, a la
 * izquierda, de un color, tamaño de fuente... No existe ningún criterio común». Lo había
 * mirado en cuatro actividades y las cuatro eran distintas.
 *
 * La causa: **quince contenedores** haciendo lo mismo —`.seguir__acciones`,
 * `.cantar__acciones`, `.rejilla__acciones`…— cada uno con su margen y su hueco, dos sin
 * centrar, y **tres tipos que ni siquiera metían su botón en un contenedor**, así que colgaba
 * del flujo y salía a la izquierda. Eso no se arregla repasando quince reglas: se arregla
 * quitando las quince.
 *
 * ## Qué entra y qué no
 *
 * Entra **lo que actúa sobre la actividad**: empezar, parar, escuchar, comprobar, otra vez,
 * limpiar, grabar, exportar, «Idea».
 *
 * No entra **lo que ES la actividad**: la diana de palmear, el pandero del eco, las teclas
 * del piano, los pads, las tarjetas de opción, las casillas del pentagrama. Esas superficies
 * son grandes a propósito —la diana mide entre 180 y 300 px porque se golpea con la mano y a
 * veces sin mirar— y meterlas en una barra sería encogerlas hasta que dejaran de servir.
 *
 * ## Dónde se pone
 *
 * Fija abajo, **justo encima** de la barra de volver-personaje-ficha. Dos barras y no una:
 * lo eligió el autor, y tiene sentido —una es de la aplicación y otra de la actividad—.
 *
 * **En apaisado comparten renglón**, decidido el 2026-09-09 al medir: las dos ocupaban
 * 110 px de los 360 de alto de un móvil girado, el 31 %, en la postura donde menos altura
 * hay. Siguen siendo dos barras y cada una en su sitio —el trío de la aplicación encogido y
 * pegado a la derecha, esta ocupando lo que queda— pero en una sola fila. Y si los botones
 * no caben, `flex-wrap` los baja de línea, que es exactamente como estaba antes: el peor
 * caso del cambio es el caso de siempre.
 *
 * Si no caben en una línea, salta a dos. También decisión suya, y sobre las alternativas que
 * garantizan una sola línea: un menú de «Más» esconde botones que un niño no va a buscar, y
 * una fila que se arrastra de lado no avisa de que hay algo más a la derecha.
 *
 * ## El hueco de abajo se mide, no se adivina
 *
 * La barra cambia de alto: dos líneas en un móvil, una en una tablet, más fina en apaisado.
 * Así que se mide con `ResizeObserver` y se publica en `--alto-acciones`, de donde cuelgan
 * dos cosas: el relleno inferior de la actividad —para que la barra no tape el final— y la
 * altura a la que se apoya la tarjeta de reacción. Con un número fijo, cualquiera de las dos
 * se descuadraba en cuanto la barra saltaba de línea.
 */
export function BarraAcciones({ children }: { children?: React.ReactNode }) {
  const caja = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = caja.current;
    const raiz = document.documentElement;
    if (!el) return;

    const publicar = (alto: number) => raiz.style.setProperty('--alto-acciones', `${alto}px`);

    if (typeof ResizeObserver === 'undefined') {
      publicar(el.offsetHeight);
    } else {
      const ro = new ResizeObserver(([e]) => publicar(e?.contentRect.height ?? 0));
      ro.observe(el);
      return () => {
        ro.disconnect();
        // Al salir de la actividad el hueco sobra: si se quedara puesto, el catálogo
        // arrastraría un palmo de blanco al final sin que nada lo explique.
        raiz.style.removeProperty('--alto-acciones');
      };
    }
    return () => raiz.style.removeProperty('--alto-acciones');
  }, []);

  /*
    Sin botones no hay barra, y son dos casos distintos.

    El fácil: hay tipos que no tienen ninguna acción sobre ellos —emparejar, pentagrama— y
    ni siquiera la montan. Eso lo resuelve este `return null`.

    El otro no lo puede resolver: lo que llega aquí son **condiciones**, no botones, y
    mientras suena el ritmo las tres valen `false`. `children` sigue siendo verdadero —es la
    expresión, no su resultado— y desde aquí no hay forma de saber que no va a pintar nada
    sin ejecutar el renderizado. Ése lo resuelve el CSS con `:empty`, que mira el resultado
    en vez de la intención, y al esconderla el observador publica 0 y el hueco de abajo se
    va con ella.
  */
  if (!children) return null;

  return (
    <div
      ref={caja}
      className="barra-acciones no-imprimir"
      role="group"
      aria-label={t('acciones.grupo')}
    >
      {children}
    </div>
  );
}
