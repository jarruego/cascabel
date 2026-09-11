import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { pararTodo } from '@/audio/AudioEngine';
import { Icono } from '@/ui/Icono';
import { Reaccion } from '@/ui/Reaccion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { pararMuestra, sonarMuestra, sonarNota } from '../sonarMuestra';
import {
  INICIAL_MEMORIA,
  barajar,
  destapada,
  reducirMemoria,
  tocable,
  type AccionMemoria,
  type Carta,
  type EstadoMemoria,
} from '../maquinaMemoria';

/**
 * Tipo «memoria»: cartas boca abajo, y cada pareja es un dibujo y su sonido.
 *
 * Lo propuso el autor cuando vio que «emparejar» no era un memory: aquí sí lo es. Las reglas
 * están en `maquinaMemoria.ts`, con test; esto solo pinta el tablero y programa el tiempo
 * que las dos cartas se quedan a la vista antes de taparse.
 *
 * **Una carta de sonido no enseña nada al destaparse salvo un altavoz**, y suena. Es lo que
 * hace que el juego sea de oído: para encontrar la pareja del perro hay que acordarse de en
 * qué carta sonó un perro, no de dónde había un dibujo parecido.
 */

interface Pareja {
  clave: string;
  icono: string;
  etiqueta?: string;
  audio?: string;
  nota?: string;
}

export default function Memoria({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    parejas: Pareja[];
    /** Columnas del tablero. Por defecto, cuatro. */
    columnas?: number;
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const tam = OBJETIVO_TACTIL[carril];
  const columnas = contenido.columnas ?? 4;
  const yaTerminada = useRef(false);

  // La semilla se fija al montar: el tablero no se rebaraja en cada repintado.
  const [semilla] = useState(() => Math.floor(Math.random() * 1_000_000) + 1);
  const cartas = useMemo<Carta[]>(
    () =>
      barajar(
        contenido.parejas.flatMap((p) => [
          { id: `${p.clave}-imagen`, pareja: p.clave, cara: 'imagen' as const },
          { id: `${p.clave}-sonido`, pareja: p.clave, cara: 'sonido' as const },
        ]),
        semilla,
      ),
    [contenido.parejas, semilla],
  );

  const [estado, despachar] = useReducer(
    (e: EstadoMemoria, a: AccionMemoria) => reducirMemoria(e, a, cartas),
    INICIAL_MEMORIA,
  );

  const parejaDe = useCallback(
    (clave: string) => contenido.parejas.find((p) => p.clave === clave),
    [contenido.parejas],
  );

  const sonar = useCallback(
    (p: Pareja | undefined) => {
      if (!p) return;
      pararTodo();
      if (p.audio) sonarMuestra(p.audio);
      else if (p.nota) void sonarNota(p.nota, contenido.instrumento);
    },
    [contenido.instrumento],
  );

  // Las dos cartas del turno se quedan a la vista un momento y luego se decide: si
  // encajan siguen así, si no se tapan. El tiempo es para mirarlas, no para castigar.
  useEffect(() => {
    if (estado.fase !== 'comprobando') return;
    // Pareja hecha: el sonido se corta, que ya ha dicho lo suyo (autor, 2026-09-12).
    if (estado.turno?.acierto) {
      pararMuestra();
      pararTodo();
    }
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), estado.turno?.acierto ? 900 : 1400);
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.turno]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      aciertos: contenido.parejas.length,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar, contenido.parejas.length]);


  return (
    <section className="actividad memoria" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <ul
        className="memoria__tablero"
        style={{ '--columnas': columnas, '--lado': `${tam}px` } as React.CSSProperties}
        aria-label={t(contenido.consigna)}
      >
        {cartas.map((c) => {
          const p = parejaDe(c.pareja);
          const seVe = destapada(estado, c.id);
          const resuelta = estado.resueltas.includes(c.id);
          const seToca = tocable(estado, c, cartas);
          const nombre = p?.etiqueta ? t(p.etiqueta) : c.pareja;
          return (
            <li key={c.id}>
              <button
                type="button"
                className="boton-actividad memoria__carta"
                data-cara={c.cara}
                data-estado={resuelta ? 'resuelta' : seVe ? 'destapada' : 'tapada'}
                /*
                  Para un lector de pantalla, una carta tapada no dice qué es —sería hacer
                  trampa— y una destapada sí. Las de sonido dicen «sonido» y su nombre solo
                  cuando ya están resueltas: hasta entonces, lo que hay que hacer es oírlas.
                */
                aria-label={
                  !seVe
                    ? t('memoria.tapada')
                    : c.cara === 'imagen' || resuelta
                      ? nombre
                      : t('memoria.sonido')
                }
                aria-disabled={!seToca || undefined}
                onClick={() => {
                  if (!seToca) return;
                  if (c.cara === 'sonido') sonar(p);
                  despachar({ tipo: 'destapar', id: c.id });
                }}
              >
                {seVe && c.cara === 'imagen' && p && (
                  <Icono nombre={p.icono} tamano={Math.round(tam * 0.55)} />
                )}
                {seVe && c.cara === 'sonido' && (
                  <Icono nombre="altavoz" tamano={Math.round(tam * 0.55)} />
                )}
                {/*
                  La tapa dice qué hay debajo: un altavoz en las de sonido y un marco en
                  las de dibujo, con colores distintos. Lo pidió el autor al probarlo: sin
                  eso, dos sonidos seguidos o dos dibujos seguidos confunden, y saber de
                  qué clase es cada carta tapada es parte del juego, no una pista de más.
                */}
                {!seVe && (
                  <Icono nombre={c.cara === 'sonido' ? 'altavoz' : 'lupa'} tamano={Math.round(tam * 0.4)} />
                )}
                {resuelta && <span className="boton__texto">{nombre}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Solo el elogio, y solo en el acierto. Un fallo se tapa y ya: no hay nada que
          decir, porque no hay nada que corregir. */}
      <Reaccion tono={estado.turno?.acierto ? 'bien' : 'neutro'} personaje={actividad.personaje}>
        {estado.fase === 'comprobando' && estado.turno?.acierto && t('comun.bien')}
      </Reaccion>
    </section>
  );
}
