import type React from 'react';
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
  /** El id de la actividad: decide qué mancha le toca. */
  id: string;
  figura?: Figura | null;
  personaje?: NombrePersonaje | null;
  tipo?: string;
  eje: Eje;
}

/*
  La mancha de detrás: una forma orgánica y plana, del color VIVO del eje —el autor probó el
  disco rebajado y lo prefirió a todo color (2026-09-12)—. Es lo que hace que un emoji, un
  signo de Bravura y un personaje parezcan de la misma familia. Tres formas distintas, y a
  cada actividad le toca siempre la misma (por su id), para que la lista no sea una fila de
  círculos iguales ni cambie de forma cada vez que se entra.
*/
const MANCHAS = [
  'M50 4C72 2 96 18 96 44S78 96 52 96 4 76 4 50 28 6 50 4Z',
  'M46 6C70 0 98 16 94 44S82 98 54 96 2 74 6 46 24 10 46 6Z',
  'M54 4C80 6 98 30 92 56S66 100 40 94 0 62 8 36 30 2 54 4Z',
];

function manchaDe(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return MANCHAS[h % MANCHAS.length] ?? MANCHAS[0]!;
}

function Mancha({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span className="tarjeta__figura">
      <svg className="tarjeta__mancha" viewBox="0 0 100 100" aria-hidden="true">
        <path d={manchaDe(id)} />
      </svg>
      {children}
    </span>
  );
}

export function FiguraTarjeta({ id, figura, personaje, tipo, eje }: Props) {
  if (tipo === 'presentacion' && personaje) {
    return (
      <Mancha id={id}>
        <Personaje nombre={personaje} pose={poseAlAzar()} tamano={56} />
      </Mancha>
    );
  }
  const f = figura ?? POR_EJE[eje];
  if ('glifo' in f) {
    return (
      <Mancha id={id}>
        <span className="tarjeta__glifo" aria-hidden="true">
          {esGlifo(f.glifo) ? GLIFOS[f.glifo] : GLIFOS['clave-sol']}
        </span>
      </Mancha>
    );
  }
  return (
    <Mancha id={id}>
      <Icono nombre={f.icono} tamano={48} />
    </Mancha>
  );
}
