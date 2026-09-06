import { useCallback, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';

/**
 * Tipo «lienzo»: creación libre, sin evaluación.
 *
 * Ocho de las cincuenta y cuatro actividades del catálogo son de este tipo, y es el que más
 * fácil sería estropear: **aquí no hay respuesta correcta, no hay comprobación, no hay
 * puntuación y no se puede fallar**. Es la regla de Incredibox que el dosier señala como el
 * mejor modelo de motivación infantil del sector — que explorar sea más divertido que
 * acertar — y es lo contrario de Duolingo.
 *
 * Por eso este componente **no tiene máquina de estados con solución**. Si algún día alguien
 * quiere añadirle un «comprobar», que lo piense dos veces: dejaría de ser un lienzo.
 *
 * Termina cuando el niño dice que ha terminado. No hay otra condición.
 */

interface Trazo {
  x: number;
  y: number;
  fila: number;
}

export default function Lienzo({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Notas disponibles, de aguda a grave. La altura en pantalla es la altura del sonido. */
    notas?: string[];
    /** Colores por fila, para que el dibujo tenga sentido visual además de sonoro. */
    colores?: string[];
  };

  const carril = useCarril(actividad.etapa);
  const notas = contenido.notas ?? ['C6', 'G5', 'E5', 'C5', 'G4', 'E4', 'C4'];
  const colores = contenido.colores ?? [
    'vivo-rosa', 'vivo-rojo', 'vivo-naranja', 'vivo-amarillo',
    'vivo-verde', 'vivo-turquesa', 'vivo-azul',
  ];

  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const lienzo = useRef<HTMLDivElement | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const dibujando = useRef(false);
  const ultimaFila = useRef(-1);

  const sonar = useCallback(async (fila: number) => {
    try {
      await despertarAudio();
      if (!sampler.current) {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      }
      sampler.current.tocar(notas[fila] ?? 'C4', undefined, 0.9);
    } catch {
      // Sin sonido se sigue dibujando. Media actividad es visual.
    }
  }, [notas]);

  /**
   * Cuanto más arriba se dibuja, más aguda es la nota. Es la metáfora que usan todos los
   * métodos —el caracol que sube y baja— y la que un niño entiende sin que se la expliquen.
   */
  const puntoDe = useCallback(
    (clientX: number, clientY: number): Trazo | null => {
      const caja = lienzo.current?.getBoundingClientRect();
      if (!caja) return null;
      const x = ((clientX - caja.left) / caja.width) * 100;
      const y = ((clientY - caja.top) / caja.height) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) return null;
      const fila = Math.min(notas.length - 1, Math.max(0, Math.floor((y / 100) * notas.length)));
      return { x, y, fila };
    },
    [notas.length],
  );

  const anadir = useCallback(
    (clientX: number, clientY: number) => {
      const p = puntoDe(clientX, clientY);
      if (!p) return;
      setTrazos((t) => [...t, p]);
      // Suena solo al CAMBIAR de fila: si sonara en cada píxel sería una ametralladora.
      if (p.fila !== ultimaFila.current) {
        ultimaFila.current = p.fila;
        void sonar(p.fila);
      }
    },
    [puntoDe, sonar],
  );

  return (
    <section className="actividad lienzo" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <div
        ref={lienzo}
        className="lienzo__area"
        role="application"
        aria-label={t(contenido.consigna)}
        onPointerDown={(e) => {
          dibujando.current = true;
          ultimaFila.current = -1;
          e.currentTarget.setPointerCapture(e.pointerId);
          anadir(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dibujando.current) anadir(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dibujando.current = false;
        }}
        onPointerCancel={() => {
          dibujando.current = false;
        }}
      >
        {/* Franjas de altura: se ven, así que el niño sabe dónde está cada sonido antes
            de tocarlo. Sin ellas el lienzo sería una caja negra. */}
        {notas.map((n, i) => (
          <div
            key={n}
            className="lienzo__franja"
            style={{
              top: `${(i / notas.length) * 100}%`,
              height: `${100 / notas.length}%`,
              background: `var(--suave-${['azul', 'verde', 'amarillo', 'rojo', 'morado'][i % 5]})`,
            }}
          />
        ))}

        <svg className="lienzo__dibujo" viewBox="0 0 100 100" preserveAspectRatio="none">
          {trazos.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.4}
              fill={`var(--${colores[p.fila % colores.length]})`}
            />
          ))}
        </svg>
      </div>

      {/* Botonera de altura: la vía por TOQUE, para quien no puede o no quiere arrastrar
          el dedo. Es lo que hace que el lienzo cumpla WCAG 2.5.7. */}
      <div className="lienzo__teclas" role="group" aria-label={t('lienzo.notas')}>
        {notas.map((n, i) => (
          <button
            key={n}
            type="button"
            className="lienzo__tecla"
            style={{
              minWidth: OBJETIVO_TACTIL[carril] * 0.7,
              minHeight: OBJETIVO_TACTIL[carril],
              background: `var(--${colores[i % colores.length]})`,
            }}
            aria-label={n}
            onClick={() => {
              void sonar(i);
              setTrazos((t) => [...t, { x: (t.length * 3) % 100, y: (i / notas.length) * 100 + 5, fila: i }]);
            }}
          />
        ))}
      </div>

      <div className="lienzo__acciones">
        <button type="button" className="boton-repetir" onClick={() => setTrazos([])}>
          {t('lienzo.limpiar')}
        </button>
        <button
          type="button"
          className="boton-repetir"
          onClick={() => alTerminar({ actividadId: actividad.id, completada: true })}
        >
          <Icono nombre="pulgar" tamano={26} /> {t('lienzo.terminar')}
        </button>
      </div>

      {/* Pista FIJA, no feedback: no cambia nunca, así que no necesita aria-live —un
          lector de pantalla ya la lee al llegar—. No hay marcador, ni porcentaje, ni
          «bien hecho»: aquí no se evalúa nada. */}
      <p className="pista-fija">{t('lienzo.libre')}</p>
    </section>
  );
}
