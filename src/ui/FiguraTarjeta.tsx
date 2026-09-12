import { useState, type ReactNode } from 'react';
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

/*
  La mancha de detrás: una forma orgánica y plana, del color VIVO del eje —el autor probó el
  disco rebajado y lo prefirió a todo color, y después «hasta aleatoria» (2026-09-12)—. Es
  lo que hace que un emoji, un signo de Bravura y un personaje parezcan de la misma familia.
  Se genera al azar en cada tarjeta y en cada visita, como la pose de los personajes: siete
  puntos alrededor de un círculo, cada uno a una distancia distinta del centro, unidos con
  curvas suaves. El radio nunca baja del 80 % para que la figura de encima quede dentro.
*/
export function manchaAlAzar(azar: () => number = Math.random): string {
  const N = 7;
  const puntos = Array.from({ length: N }, (_, i) => {
    const angulo = (i / N) * Math.PI * 2 + azar() * 0.35;
    const radio = 40 + azar() * 8; // entre 40 y 48 sobre un lienzo de 100
    return { x: 50 + Math.cos(angulo) * radio, y: 50 + Math.sin(angulo) * radio };
  });
  // Catmull-Rom cerrado convertido a Bézier cúbicas: pasa por los puntos sin picos.
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(puntos[0]!.x)} ${f(puntos[0]!.y)}`;
  for (let i = 0; i < N; i++) {
    const p0 = puntos[(i - 1 + N) % N]!;
    const p1 = puntos[i]!;
    const p2 = puntos[(i + 1) % N]!;
    const p3 = puntos[(i + 2) % N]!;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d + 'Z';
}

function Mancha({ children }: { children: ReactNode }) {
  // Una por montaje: no cambia mientras la tarjeta esté en pantalla.
  const [d] = useState(manchaAlAzar);
  return (
    <span className="tarjeta__figura">
      <svg className="tarjeta__mancha" viewBox="0 0 100 100" aria-hidden="true">
        <path d={d} />
      </svg>
      {children}
    </span>
  );
}

export function FiguraTarjeta({ figura, personaje, tipo, eje }: Props) {
  if (tipo === 'presentacion' && personaje) {
    return (
      <Mancha>
        <Personaje nombre={personaje} pose={poseAlAzar()} tamano={56} />
      </Mancha>
    );
  }
  const f = figura ?? POR_EJE[eje];
  if ('glifo' in f) {
    return (
      <Mancha>
        <span className="tarjeta__glifo" aria-hidden="true">
          {esGlifo(f.glifo) ? GLIFOS[f.glifo] : GLIFOS['clave-sol']}
        </span>
      </Mancha>
    );
  }
  return (
    <Mancha>
      <Icono nombre={f.icono} tamano={48} />
    </Mancha>
  );
}
