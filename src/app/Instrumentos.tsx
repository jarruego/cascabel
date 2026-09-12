import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarIndice } from '@/datos/cargar';
import { despertarAudio } from '@/audio/AudioEngine';
import { t } from '@/i18n';
import { useVuelta } from './vuelta';
import type { Eje } from '@/motor/tipos';
import { Personaje } from '@/ui/Personaje';
import { POSES, type Personaje as NombrePersonaje, type Pose } from '@/ui/personajes';

/**
 * Los instrumentos y las herramientas del aula, en su propia pantalla.
 *
 * **Por qué tienen sitio propio y no una sección dentro del catálogo**, que es donde
 * estuvieron primero. Un piano, un afinador o un metrónomo no son actividades: no tienen
 * consigna, ni solución, ni final. Pero la razón de fondo es otra y es de uso: **el catálogo
 * es la pantalla del maestro y los instrumentos son la del niño**. Un niño que quiere tocar
 * el piano no puede tener que bajar por sesenta actividades y sus filtros curriculares para
 * llegar.
 *
 * Y sí, esto sube la barra de tres destinos a cuatro. La regla 8 de `docs/04-DISENO-UI.md`
 * pide **una sola navegación**, y sigue habiendo una sola: lo que prohíbe es tener varias
 * compitiendo, no contar hasta tres. Cuatro botones grandes en una barra siguen cabiendo con
 * los objetivos táctiles de Infantil.
 */

interface Entrada {
  id: string;
  titulo: string;
  eje: Eje;
  tipo?: string;
  descripcion?: string;
  herramienta?: boolean;
  personaje?: NombrePersonaje | null;
}

/** Una pose al azar por tarjeta y por visita: cada vez que se entra, la pandilla cambia. */
function poseAlAzar(): Pose {
  return POSES[Math.floor(Math.random() * POSES.length)] ?? 'neutro';
}

export default function Instrumentos() {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [fallo, setFallo] = useState(false);
  useVuelta('/instrumentos', entradas !== null);

  useEffect(() => {
    let vivo = true;
    cargarIndice()
      .then((i) => vivo && setEntradas(i.actividades as unknown as Entrada[]))
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, []);

  if (fallo) {
    return (
      <main className="catalogo">
        <p role="alert">{t('catalogo.fallo')}</p>
      </main>
    );
  }
  if (!entradas) {
    return (
      <main className="catalogo">
        <p>{t('catalogo.cargando')}</p>
      </main>
    );
  }

  /*
    Se reconocen por el campo `herramienta`, no por el prefijo del identificador.

    El prefijo era un atajo: dice de qué familia viene el id, no qué es la cosa. Y hay
    actividades que son las dos cosas —el editor de melodías tiene criterio curricular y a la
    vez es un instrumento sin solución— que con el prefijo se quedaban fuera de aquí y
    enterradas entre sesenta y siete actividades del catálogo.
  */
  const herramientas = entradas.filter((e) => e.herramienta);

  return (
    <main className="catalogo instrumentos">
      <h1>{t('nav.instrumentos')}</h1>
      <p className="catalogo__aclaracion">{t('catalogo.herramientasQueSon')}</p>

      <ul className="catalogo__lista">
        {herramientas.map((e) => (
          <li key={e.id}>
            <Link
              to={`/actividad/${e.id}`}
              className={`tarjeta tarjeta--${e.eje}`}
              /* El AudioContext nace suspendido y solo se reanuda dentro de un gesto. Este
                 clic es el gesto: para cuando el instrumento se monte, ya no lo hay. */
              onClick={() => void despertarAudio().catch(() => {})}
            >
              <span className="tarjeta__titulo">{e.titulo}</span>
              {/* Las presentaciones de la pandilla llevan el texto a la izquierda y al
                  personaje en pequeño a la derecha, en una pose al azar (2026-09-12). */}
              {e.tipo === 'presentacion' && e.personaje ? (
                <span className="tarjeta__conFigura">
                  {e.descripcion && <span className="tarjeta__meta">{e.descripcion}</span>}
                  <Personaje nombre={e.personaje} pose={poseAlAzar()} tamano={64} />
                </span>
              ) : (
                e.descripcion && <span className="tarjeta__meta">{e.descripcion}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {herramientas.length === 0 && <p>{t('catalogo.vacio')}</p>}
    </main>
  );
}
