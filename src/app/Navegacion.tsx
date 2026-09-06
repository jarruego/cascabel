import { NavLink, useLocation } from 'react-router';
import { t } from '@/i18n';
import { Icono } from '@/ui/Icono';

/**
 * Barra de navegación permanente, abajo, como una app de móvil.
 *
 * Va **abajo y no arriba** por una razón física: el pulgar de un niño no llega a la parte
 * superior de una tablet que sostiene con las dos manos. Es la misma razón por la que todas
 * las apps móviles serias movieron la navegación abajo hace años.
 *
 * **Cinco destinos**: actividades, camino, instrumentos, comprobar y ajustes. Todo lo demás
 * cuelga de esos cinco.
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

const DESTINOS = [
  { a: '/', icono: 'nota-musical', clave: 'nav.actividades' },
  { a: '/camino', icono: 'andando', clave: 'nav.camino' },
  { a: '/instrumentos', icono: 'teclado', clave: 'nav.instrumentos' },
  { a: '/comprobar', icono: 'lupa', clave: 'nav.comprobar' },
  { a: '/ajustes', icono: 'diana', clave: 'nav.ajustes' },
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
          /* aria-current lo pone react-router solo, y es lo que un lector de pantalla usa
             para decir «página actual». No hace falta añadir nada. */
        >
          <Icono nombre={d.icono} tamano={26} />
          <span>{t(d.clave)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
