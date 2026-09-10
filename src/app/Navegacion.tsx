import { NavLink, useLocation } from 'react-router';
import { t } from '@/i18n';
import { Personaje } from '@/ui/Personaje';

/**
 * Barra de navegación permanente, abajo, como una app de móvil.
 *
 * Va **abajo y no arriba** por una razón física: el pulgar de un niño no llega a la parte
 * superior de una tablet que sostiene con las dos manos. Es la misma razón por la que todas
 * las apps móviles serias movieron la navegación abajo hace años.
 *
 * **Cuatro destinos**: actividades, camino, instrumentos y ajustes. Todo lo demás cuelga de
 * esos cuatro.
 *
 * Fueron cinco hasta el 2026-09-08: había uno para comprobar los códigos de verificación, y
 * los códigos se retiraron. Daban por hecho que cada niño tiene un dispositivo y que se lo
 * enseña al maestro uno a uno, y en la mayoría de las clases hay una pizarra y el maestro
 * hace salir a los niños.
 *
 * Fueron tres, y las dos que se añadieron el 2026-09-07 lo hicieron por la misma razón de
 * uso: **el catálogo es la pantalla del maestro**, con sus filtros curriculares, y hay dos
 * preguntas que no contesta. La de un niño que quiere tocar el piano y no puede bajar por
 * setenta actividades para llegar —los **instrumentos**—, y la de cualquiera que llega sin
 * saber por dónde empezar —el **camino**, que por eso va el segundo y no el último: esa
 * pregunta se hace al entrar, y un enlace al final la contesta a quien ya no la tiene.
 *
 * La regla 8 de `docs/04-DISENO-UI.md` pide **una sola navegación**, y sigue habiendo una
 * sola: lo que prohíbe es tener varias compitiendo, no contar hasta tres.
 *
 * **Se esconde dentro de una actividad.** Un niño en mitad de un ejercicio no necesita ver
 * botones que le saquen de él, y el botón «atrás» de la actividad ya existe y está siempre
 * en el mismo sitio. Y desaparece al imprimir.
 */

/*
  Cada destino lo presenta un personaje, con su pose y su color. Los iconos grises de antes
  eran «muy feos y poco rollo infantil», dijo el autor el 2026-09-10, y la pandilla estaba
  sin usar en la mitad de sus poses. El reparto sigue el criterio de `docs/14-PERSONAJES.md`,
  qué trabaja cada sitio:

   - Actividades: **Dora** saluda. La base, por donde se entra.
   - Camino: **Sol** baila. El recorrido es moverse por él.
   - Taller: **Milo** palmea. Ahí se toca.
   - Criterios: **Rex** busca. Es la pantalla de encontrar.

  El color es el disco de detrás, y la sección actual se marca por color, por fondo y por
  grosor de letra: tres señales, nunca solo el color.
*/
const DESTINOS = [
  { a: '/', personaje: 'dora', pose: 'saluda', color: 'rojo', clave: 'nav.actividades' },
  { a: '/camino', personaje: 'sol', pose: 'baila', color: 'verde', clave: 'nav.camino' },
  { a: '/instrumentos', personaje: 'milo', pose: 'palmea', color: 'amarillo', clave: 'nav.instrumentos' },
  /* Provisional, a petición del autor el 2026-09-10: los criterios del currículo con sus
     actividades ocupan el sitio de Ajustes mientras se revisa el etiquetado. A Ajustes se
     llega por la rueda dentada junto al título del catálogo. */
  { a: '/criterios', personaje: 'rex', pose: 'busca', color: 'azul', clave: 'nav.criterios' },
] as const;

export function Navegacion() {
  const { pathname } = useLocation();

  // Dentro de una actividad o de una ficha, fuera: la pantalla es del ejercicio.
  if (pathname.startsWith('/actividad/') || pathname.startsWith('/ficha/')) return null;

  return (
    <nav className="nav no-imprimir" aria-label={t('nav.titulo')}>
      {DESTINOS.map((d) => (
        <NavLink
          key={d.a}
          to={d.a}
          end={d.a === '/'}
          className="nav__enlace"
          data-color={d.color}
          /* aria-current lo pone react-router solo, y es lo que un lector de pantalla usa
             para decir «página actual». No hace falta añadir nada. */
        >
          <span className="nav__disco" aria-hidden="true">
            <Personaje nombre={d.personaje} pose={d.pose} tamano={44} />
          </span>
          <span>{t(d.clave)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
