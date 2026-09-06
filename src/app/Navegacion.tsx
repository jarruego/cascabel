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
 * **Tres destinos y ni uno más.** La regla 8 de `docs/04-DISENO-UI.md` dice «una sola
 * navegación», y las navegaciones múltiples confunden a los niños mucho más que a los
 * adultos. Aquí: actividades, comprobar y ajustes. Todo lo demás cuelga de esas tres.
 *
 * **Se esconde dentro de una actividad.** Un niño en mitad de un ejercicio no necesita ver
 * botones que le saquen de él, y el botón «atrás» de la actividad ya existe y está siempre
 * en el mismo sitio. Y desaparece al imprimir.
 */

const DESTINOS = [
  { a: '/', icono: 'nota-musical', clave: 'nav.actividades' },
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
          <Icono nombre={d.icono} tamano={30} />
          <span>{t(d.clave)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
