import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { Percusion, type Golpe } from '@/audio/percusion';
import { compararEco, mensajeEco, type ResultadoEco } from '../eco';
import { IconoParar, IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { Reaccion } from '@/ui/Reaccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «eco»: dos niños en la misma tablet, por turnos.
 *
 * Uno propone un ritmo golpeando el pandero de la pantalla; el otro lo repite. La aplicación
 * compara **las dos ejecuciones entre sí**, no contra un modelo nuestro. Las reglas están en
 * `../eco.ts`, con test.
 *
 * **Lo que aporta y no da ninguna actividad individual: escucharse entre ellos.** Y no
 * necesita red, ni cuentas, ni turnos sincronizados: son dos personas delante del mismo
 * aparato, que es como se hace en un aula.
 *
 * **Nunca dice quién lo ha hecho mejor.** `CLAUDE.md` §4 prohíbe las clasificaciones entre
 * niños, y aquí sería facilísimo colarla sin darse cuenta —basta con enseñar dos números—.
 * El resultado es de la pareja: «os habéis parecido mucho». Si no se parecen, lo que se
 * ofrece es volver a escucharlo, no un veredicto.
 *
 * **Y no hay cuenta atrás para el primero.** El que propone empieza cuando quiere y para
 * cuando quiere: si hubiera un cronómetro, lo que se mediría sería la prisa.
 *
 * **Aquí el tiempo se mide con `performance.now()` y no con el reloj del `AudioContext`**,
 * que es al revés de lo que hace el resto de la aplicación. No es un descuido: en las demás
 * actividades hay que comparar un golpe del niño con algo que hemos programado nosotros para
 * que suene, y ahí la latencia de salida importa y hay que compensarla (`CLAUDE.md` §7). En
 * el eco se comparan **dos entradas** entre sí, y las dos llegan por el mismo camino y con
 * el mismo retraso, así que ese retraso se va solo en la resta.
 */

type Fase = 'esperando' | 'primero' | 'entre' | 'segundo' | 'resultado';

export default function Eco({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Con qué suena el pandero. Uno solo: aquí lo que importa es cuándo, no qué. */
    golpe?: Golpe;
    /** Cuántos golpes como mucho puede proponer el primero. */
    maximoGolpes?: number;
  };

  const carril = useCarril(actividad.etapa);
  const golpe = contenido.golpe ?? 'pandereta';
  const maximo = contenido.maximoGolpes ?? 8;

  const [fase, setFase] = useState<Fase>('esperando');
  const [primero, setPrimero] = useState<number[]>([]);
  const [segundo, setSegundo] = useState<number[]>([]);
  const [resultado, setResultado] = useState<ResultadoEco | null>(null);
  /* El destello del pandero es estado y no un calculo sobre el instante del ultimo
     golpe: eso ultimo solo se apaga si algo vuelve a dibujar, y despues del ultimo
     golpe no vuelve a dibujar nada. Se quedaba encendido. */
  const [destello, setDestello] = useState(false);

  const percusion = useRef<Percusion | null>(null);
  const grabando = useRef<'primero' | 'segundo' | null>(null);

  const sonar = useCallback(async () => {
    try {
      await despertarAudio();
      if (!percusion.current) {
        const p = new Percusion([golpe]);
        await p.cargar();
        percusion.current = p;
      }
      percusion.current.golpear(golpe);
    } catch {
      // Sin muestra, el pandero sigue registrando el golpe. Lo que se mide es cuándo se
      // toca, y eso funciona en silencio.
    }
  }, [golpe]);

  const golpear = useCallback(() => {
    const cuando = performance.now();
    setDestello(true);
    window.setTimeout(() => setDestello(false), 120);
    void sonar();
    if (grabando.current === 'primero') {
      setPrimero((g) => (g.length >= maximo ? g : [...g, cuando]));
    } else if (grabando.current === 'segundo') {
      setSegundo((g) => (g.length >= maximo ? g : [...g, cuando]));
    }
  }, [maximo, sonar]);

  /* La barra espaciadora golpea, igual que el dedo. Es lo que permite hacer la actividad
     entera con teclado y, de paso, jugarla con un ordenador y sin pantalla táctil. */
  useEffect(() => {
    const pulsar = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (grabando.current === null) return;
      e.preventDefault();
      golpear();
    };
    window.addEventListener('keydown', pulsar);
    return () => window.removeEventListener('keydown', pulsar);
  }, [golpear]);

  const empezarPrimero = () => {
    setPrimero([]);
    setSegundo([]);
    setResultado(null);
    grabando.current = 'primero';
    setFase('primero');
  };

  const terminarPrimero = () => {
    grabando.current = null;
    setFase('entre');
  };

  const empezarSegundo = () => {
    grabando.current = 'segundo';
    setFase('segundo');
  };

  const terminarSegundo = () => {
    grabando.current = null;
    setResultado(compararEco(primero, segundo, carril));
    setFase('resultado');
  };

  /** Vuelve a tocar lo que grabó uno de los dos, para poder escucharlo otra vez. */
  const escuchar = useCallback(
    async (golpes: number[]) => {
      if (!golpes.length) return;
      try {
        await despertarAudio();
        if (!percusion.current) {
          const p = new Percusion([golpe]);
          await p.cargar();
          percusion.current = p;
        }
        const ctx = obtenerContexto();
        const desde = ctx.currentTime + 0.15;
        const cero = golpes[0]!;
        for (const g of golpes) percusion.current.golpear(golpe, desde + (g - cero) / 1000);
      } catch {
        // Igual que arriba: no poder oírlo no puede cerrar la actividad.
      }
    },
    [golpe],
  );

  const enTurno = fase === 'primero' || fase === 'segundo';
  const golpesDelTurno = fase === 'primero' ? primero : segundo;

  return (
    <section className="actividad eco" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* Quién va ahora, con el número grande. Dos niños delante de la misma pantalla
          necesitan saberlo de un vistazo y sin leer una frase. */}
      <p className="eco__turno" aria-live="polite">
        {t(
          fase === 'primero'
            ? 'eco.turnoUno'
            : fase === 'segundo'
              ? 'eco.turnoDos'
              : fase === 'entre'
                ? 'eco.ahoraElOtro'
                : fase === 'resultado'
                  ? 'eco.yaEsta'
                  : 'eco.comoVa',
        )}
      </p>

      {/* El pandero. Es el objetivo táctil más grande de la aplicación a propósito: se
          golpea deprisa, sin mirar y a veces con la palma entera. */}
      <button
        type="button"
        className="eco__pandero"
        data-activo={enTurno || undefined}
        data-golpeado={destello || undefined}
        aria-label={t('eco.golpear')}
        aria-disabled={!enTurno || undefined}
        onPointerDown={() => {
          if (enTurno) golpear();
        }}
      >
        <span className="eco__cuenta">{enTurno ? golpesDelTurno.length : ''}</span>
      </button>

      <BarraAcciones>
        {fase === 'esperando' && (
          <button type="button" className="boton-principal boton-arranque" onClick={empezarPrimero}>
            <IconoTocar />
            {t('eco.empiezaUno')}
          </button>
        )}

        {fase === 'primero' && (
          <button
            type="button"
            className="boton-principal"
            aria-disabled={primero.length < 2 || undefined}
            onClick={() => primero.length >= 2 && terminarPrimero()}
          >
            <IconoParar />
            {t('eco.yaLoTengo')}
          </button>
        )}

        {fase === 'entre' && (
          <>
            <button
              type="button"
              className="boton-repetir"
              onClick={() => void escuchar(primero)}
            >
              <IconoTocar />
              {t('eco.escucharlo')}
            </button>
            <button type="button" className="boton-principal" onClick={empezarSegundo}>
              <IconoSiguiente />
              {t('eco.ahoraTu')}
            </button>
          </>
        )}

        {fase === 'segundo' && (
          <button
            type="button"
            className="boton-principal"
            aria-disabled={segundo.length < 1 || undefined}
            onClick={() => segundo.length >= 1 && terminarSegundo()}
          >
            <IconoParar />
            {t('eco.yaEstoy')}
          </button>
        )}

        {fase === 'resultado' && (
          <>
            <button
              type="button"
              className="boton-repetir"
              onClick={() => void escuchar(primero)}
            >
              <IconoTocar />
              {t('eco.oirElUno')}
            </button>
            <button
              type="button"
              className="boton-repetir"
              onClick={() => void escuchar(segundo)}
            >
              <IconoTocar />
              {t('eco.oirElDos')}
            </button>
            <button type="button" className="boton-principal" onClick={empezarPrimero}>
              <IconoRepetir />
              {t('eco.otraVez')}
            </button>
          </>
        )}
      </BarraAcciones>

      {/*
        El veredicto lo dice el personaje, entra deslizando y se va, como en todo lo demás.

        Y **los milisegundos se han ido**. Estaban puestos «para el maestro, en pequeño», y
        aquí eso no se sostiene: el eco lo juegan dos niños delante de la misma tablet y no
        hay ningún maestro mirando esa esquina. El autor lo pidió por su nombre —«tampoco
        tiene sentido que salgan mensajes técnicos como ms, regularidad»— y en esta pantalla
        además sobraba por otra razón: lo que se está diciendo es «os habéis parecido
        mucho», que es de la pareja. Un número al lado invita justo a lo que `CLAUDE.md` §4
        prohíbe, que es comparar a dos niños.
      */}
      {resultado && (
        <Reaccion tono={resultado.seParecen ? 'bien' : 'casi'} personaje={actividad.personaje}>
          {t(mensajeEco(resultado, carril))}
        </Reaccion>
      )}
    </section>
  );
}
