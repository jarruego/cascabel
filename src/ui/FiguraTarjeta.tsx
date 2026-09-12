import type { Eje } from '@/motor/tipos';
import { Icono } from './Icono';
import { Personaje } from './Personaje';
import { GLIFOS, esGlifo } from './glifos';
import { POSES, type Personaje as NombrePersonaje, type Pose } from './personajes';

/**
 * Lo que una actividad enseña en su tarjeta, a la derecha del texto: un icono de
 * `public/iconos`, un signo musical de Bravura o, en las presentaciones de la pandilla, el
 * personaje en una pose al azar. Lo declara el JSON en `figura`; si no lo dice, va la del
 * eje, que nunca deja la tarjeta sin dibujo. Lo pidió el autor el 2026-09-12: «todas las
 * tarjetas con un icono, imagen, símbolo musical o svg representativo».
 */
export type Figura = { icono: string } | { glifo: string };

/** La de reserva, por eje: solo para una actividad que aún no haya elegido la suya. */
const POR_EJE: Record<Eje, Figura> = {
  pulso: { icono: 'tambor' },
  altura: { icono: 'flecha-arriba' },
  timbre: { icono: 'altavoz' },
  notacion: { glifo: 'clave-sol' },
  cuerpo: { icono: 'palmas' },
  creacion: { icono: 'bombilla' },
  cultura: { icono: 'castillo' },
};

/** Una pose al azar por tarjeta y por visita: cada vez que se entra, la pandilla cambia. */
function poseAlAzar(): Pose {
  return POSES[Math.floor(Math.random() * POSES.length)] ?? 'neutro';
}

interface Props {
  figura?: Figura | null;
  personaje?: NombrePersonaje | null;
  tipo?: string;
  eje: Eje;
}

export function FiguraTarjeta({ figura, personaje, tipo, eje }: Props) {
  if (tipo === 'presentacion' && personaje) {
    return <Personaje nombre={personaje} pose={poseAlAzar()} tamano={64} />;
  }
  const f = figura ?? POR_EJE[eje];
  if ('glifo' in f) {
    return (
      <span className="tarjeta__glifo" aria-hidden="true">
        {esGlifo(f.glifo) ? GLIFOS[f.glifo] : GLIFOS['clave-sol']}
      </span>
    );
  }
  return <Icono nombre={f.icono} tamano={64} />;
}
