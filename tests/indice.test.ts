import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Que `content/indice.json` diga lo mismo que las actividades.
 *
 * El índice es lo ÚNICO que carga la aplicación al arrancar: el catálogo filtra por curso,
 * eje y criterio sin descargar ni una actividad entera, y el itinerario saca de ahí los
 * títulos y las duraciones. Se genera con `npm run contenido:indice` y se guarda en el
 * repositorio, así que se queda atrás en cuanto alguien edita un JSON y no lo regenera.
 *
 * Y cuando se queda atrás no falla nada: la actividad se abre bien, porque se lee de su
 * propio fichero. Lo que miente es la lista. Pasó al mover «Ostinato a dos planos» de eje
 * creación a cuerpo: la actividad ya decía «cuerpo» y el catálogo la seguía enseñando entre
 * las de crear, que es donde un maestro no la iba a buscar.
 *
 * Se comparan los campos, no el fichero entero: la fecha de generación cambia sola y no
 * significa nada.
 */

const RAIZ = join(__dirname, '..');
const DIR = join(RAIZ, 'content', 'actividades');

interface Entrada {
  id: string;
  titulo: string;
  descripcion: string;
  etapa: string;
  eje: string;
  tipo: string;
  lugar: string;
  microfono: boolean;
  duracion_min: number | null;
  curriculo: unknown;
  estado: string;
  herramienta: boolean;
  etiquetas: string[];
  practica: {
    figuras: string[];
    compas: string | null;
    metodo: string[];
    notas: string[];
    secuencia: string | null;
  };
}

const indice = JSON.parse(
  readFileSync(join(RAIZ, 'content', 'indice.json'), 'utf-8'),
) as { total: number; actividades: Entrada[] };

const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const actividades = ficheros.map(
  (f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as Record<string, never>,
);

/** Lo que el índice tendría que decir de una actividad. Es lo que hace `tools/indice.mjs`. */
function comoDeberiaSer(a: Record<string, never>): Entrada {
  const entrada = a as unknown as {
    id: string;
    titulo: string;
    descripcion?: string;
    etapa: string;
    eje: string;
    tipo: string;
    lugar?: string;
    entrada?: { modo?: string };
    duracion_min?: number;
    etiquetas?: string[];
    practica?: { figuras?: string[]; compas?: string; metodo?: string[]; notas?: string[]; secuencia?: string };
    curriculo: unknown;
    estado?: string;
    herramienta?: boolean;
  };
  return {
    id: entrada.id,
    titulo: entrada.titulo,
    descripcion: entrada.descripcion ?? '',
    etapa: entrada.etapa,
    eje: entrada.eje,
    tipo: entrada.tipo,
    lugar: entrada.lugar ?? 'pantalla',
    microfono: String(entrada.entrada?.modo ?? '').startsWith('microfono'),
    duracion_min: entrada.duracion_min ?? null,
    curriculo: entrada.curriculo,
    estado: entrada.estado ?? 'borrador',
    herramienta: entrada.herramienta ?? false,
    etiquetas: entrada.etiquetas ?? [],
    practica: {
      figuras: entrada.practica?.figuras ?? [],
      compas: entrada.practica?.compas ?? null,
      metodo: entrada.practica?.metodo ?? [],
      notas: entrada.practica?.notas ?? [],
      secuencia: entrada.practica?.secuencia ?? null,
    },
  };
}

describe('el índice del catálogo', () => {
  it('tiene exactamente las actividades que hay en disco', () => {
    expect(indice.total).toBe(actividades.length);
    expect(indice.actividades.map((e) => e.id).sort()).toEqual(
      actividades.map((a) => (a as unknown as { id: string }).id).sort(),
    );
  });

  it('no se ha quedado atrás: dice de cada una lo que dice su fichero', () => {
    const porId = new Map(indice.actividades.map((e) => [e.id, e]));
    const desfasadas: string[] = [];
    for (const a of actividades) {
      const esperada = comoDeberiaSer(a);
      const real = porId.get(esperada.id);
      if (JSON.stringify(real) !== JSON.stringify(esperada)) desfasadas.push(esperada.id);
    }
    expect(desfasadas, 'falta `npm run contenido:indice`').toEqual([]);
  });
});
