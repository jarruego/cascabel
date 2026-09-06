import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio } from '@/audio/AudioEngine';
import { MARIMBA, Sampler, aMidi } from '@/audio/sampler';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { letraDeNota, notaDeTecla } from '@/ui/tecladoQwerty';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «teclado»: un piano en la pantalla del móvil o de la tablet.
 *
 * **No usa ninguna librería de piano.** Se miraron `x-piano`, `Open-Web-Piano` y
 * `virtual-keyboard-display` (ver `docs/11-RECURSOS-Y-REFERENTES.md`): todas traen su propia
 * gestión de audio, y eso chocaría con la regla de un solo `AudioContext` de
 * `CLAUDE.md` §7. Sobre el `Sampler` que ya existe, un teclado son cien líneas.
 *
 * Dos decisiones que no son evidentes:
 *
 *  - **Las teclas negras se pueden quitar.** En Infantil estorban: el niño busca el do y se
 *    encuentra un bosque. Con `soloBlancas` queda una escala diatónica, que es lo que hay
 *    en un metalófono Orff de aula.
 *  - **Se puede tocar deslizando** el dedo por las teclas (*glissando*), porque es lo
 *    primero que hace un niño con un piano y prohibírselo sería raro. Pero cada tecla es un
 *    `<button>`, así que el teclado entero funciona con Tab y Enter.
 */

const BLANCAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Qué blancas llevan una negra a su derecha. Mi y si no la tienen: es lo que da al piano
 *  su patrón de dos y tres, y lo que permite orientarse sin mirar. */
const CON_NEGRA = [true, true, false, true, true, true, false];

export default function Teclado({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Octava más grave que se muestra. */
    desde?: number;
    octavas?: number;
    soloBlancas?: boolean;
    /** Nombres bajo cada tecla: 'latino' (do re mi), 'ingles' (C D E) o 'ninguno'. */
    nombres?: 'latino' | 'ingles' | 'ninguno';
    /** Enseñar qué tecla del ordenador toca cada nota. Estorba donde no hay teclado. */
    letrasQwerty?: boolean;
  };

  const carril = useCarril(actividad.etapa);
  const desde = contenido.desde ?? 4;
  const octavas = contenido.octavas ?? (carril === 'infantil' ? 1 : 2);
  const soloBlancas = contenido.soloBlancas ?? carril === 'infantil';
  const nombres = contenido.nombres ?? (carril === 'autonomos' ? 'ingles' : 'latino');
  // En Infantil no se enseñan: se toca con el dedo, y una letra más en cada tecla es ruido.
  const letrasQwerty = contenido.letrasQwerty ?? carril !== 'infantil';

  const sampler = useRef<Sampler | null>(null);
  const deslizando = useRef(false);
  const ultima = useRef<string | null>(null);
  const [sonando, setSonando] = useState<Set<string>>(new Set());
  /** Nota que se acaba de tocar, para enseñarla grande encima del teclado. */
  const [ultimaTocada, setUltimaTocada] = useState<string | null>(null);

  const sonar = useCallback(async (nota: string) => {
    setSonando((s) => new Set(s).add(nota));
    setUltimaTocada(nota);
    window.setTimeout(() => setSonando((s) => {
      const n = new Set(s);
      n.delete(nota);
      return n;
    }), 260);
    try {
      await despertarAudio();
      if (!sampler.current) {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      }
      sampler.current.tocar(nota, undefined, 1.1);
    } catch {
      // Sin muestras el teclado sigue respondiendo visualmente. No se cierra nada.
    }
  }, []);

  // Deslizar el dedo por las teclas. Se sigue con pointermove global porque el puntero
  // sale del botón donde empezó, y sin capturarlo a nivel de ventana se pierde.
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!deslizando.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nota = el?.getAttribute('data-nota');
      if (nota && nota !== ultima.current) {
        ultima.current = nota;
        void sonar(nota);
      }
    };
    const soltar = () => {
      deslizando.current = false;
      ultima.current = null;
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [sonar]);

  /*
   * Tocar con el teclado del ordenador.
   *
   * Se ignora `e.repeat` porque al mantener una tecla el sistema la repite decenas de veces
   * por segundo, y eso no es un trémolo: es una ametralladora. Y se ignora cuando hay una
   * tecla modificadora pulsada, para no secuestrar los atajos del navegador.
   */
  useEffect(() => {
    const pulsar = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const nota = notaDeTecla(e.code, desde);
      if (!nota) return;
      if (soloBlancas && nota.includes('#')) return;
      // Fuera del rango dibujado no suena nada: lo que se oye es lo que se ve.
      const octavaNota = Number(nota.replace(/[^0-9]/g, ''));
      if (octavaNota < desde || octavaNota >= desde + octavas) return;
      e.preventDefault();
      void sonar(nota);
    };
    window.addEventListener('keydown', pulsar);
    return () => window.removeEventListener('keydown', pulsar);
  }, [desde, octavas, soloBlancas, sonar]);

  const anchoBlanca = Math.max(36, Math.round(OBJETIVO_TACTIL[carril] * 0.85));
  const teclas: Array<{ nota: string; negra: boolean; indice: number }> = [];
  for (let o = 0; o < octavas; o++) {
    BLANCAS.forEach((letra, i) => {
      teclas.push({ nota: `${letra}${desde + o}`, negra: false, indice: o * 7 + i });
      if (!soloBlancas && CON_NEGRA[i]) {
        teclas.push({ nota: `${letra}#${desde + o}`, negra: true, indice: o * 7 + i });
      }
    });
  }

  return (
    <section className="actividad teclado" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      {/* La nota que suena, grande. Es lo que convierte el piano en algo de lo que se
          aprende: se toca, suena y se ve cómo se llama. */}
      <p
        className="teclado__ultima"
        aria-live="polite"
        style={ultimaTocada ? { color: colorDe(ultimaTocada) } : undefined}
      >
        {ultimaTocada ? nombreDe(ultimaTocada, nombres === 'ingles' ? 'ingles' : 'latino') : ''}
      </p>

      <div
        className="teclado__caja"
        role="group"
        aria-label={t('teclado.teclas')}
        onPointerDown={() => {
          deslizando.current = true;
        }}
      >
        {teclas.map((k) => {
          const letra = k.nota[0]!;
          const etiqueta = nombres === 'ninguno' ? '' : nombreDe(letra, nombres);
          const qwerty = letrasQwerty ? letraDeNota(k.nota, desde) : '';
          const suena = sonando.has(k.nota);
          return (
            <button
              key={k.nota}
              type="button"
              data-nota={k.nota}
              className={k.negra ? 'teclado__negra' : 'teclado__blanca'}
              data-sonando={suena || undefined}
              style={
                k.negra
                  ? {
                      left: (k.indice + 1) * anchoBlanca - anchoBlanca * 0.3,
                      width: anchoBlanca * 0.6,
                      // Al pulsarla, la negra también se tiñe de su color.
                      background: suena ? colorDe(letra) : undefined,
                    }
                  : {
                      width: anchoBlanca,
                      // Una franja del color del grado en la parte baja de la tecla: se
                      // ve sin que la tecla deje de parecer una tecla de piano. Al
                      // pulsarla se tiñe entera, para que el color y el sonido lleguen
                      // juntos y el niño ate uno al otro.
                      borderBottom: `10px solid ${colorDe(letra)}`,
                      background: suena ? colorDe(letra) : undefined,
                    }
              }
              aria-label={`${etiqueta || letra}${k.negra ? ' sostenido' : ''} ${aMidi(k.nota)}`}
              onPointerDown={() => {
                ultima.current = k.nota;
                void sonar(k.nota);
              }}
              /* onClick además de onPointerDown: es lo que hace que Enter funcione
                 desde el teclado del ordenador sin escribir nada más. */
              onClick={() => {
                if (!deslizando.current) void sonar(k.nota);
              }}
            >
              {qwerty && <span className="teclado__qwerty">{qwerty}</span>}
              {!k.negra && etiqueta && <span className="teclado__nombre">{etiqueta}</span>}
            </button>
          );
        })}
      </div>

      <p className="pista-fija">
        {t('teclado.libre')}
        {letrasQwerty && ` ${t('teclado.qwerty')}`}
      </p>

      <button
        type="button"
        className="boton-repetir"
        onClick={() => alTerminar({ actividadId: actividad.id, completada: true })}
      >
        {t('lienzo.terminar')}
      </button>
    </section>
  );
}
