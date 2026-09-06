import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarIndice } from '@/datos/cargar';
import { despertarAudio } from '@/audio/AudioEngine';
import { t } from '@/i18n';
import type { Eje } from '@/motor/tipos';

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
  descripcion?: string;
}

export default function Instrumentos() {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [fallo, setFallo] = useState(false);

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

  // Se reconocen por el prefijo `tr-`, que es lo que el catálogo ya usaba para agruparlas.
  // No hace falta un campo nuevo en sesenta ficheros para algo que el id ya dice.
  const herramientas = entradas.filter((e) => e.id.startsWith('tr-'));

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
              {e.descripcion && <span className="tarjeta__meta">{e.descripcion}</span>}
            </Link>
          </li>
        ))}
      </ul>

      {herramientas.length === 0 && <p>{t('catalogo.vacio')}</p>}
    </main>
  );
}
