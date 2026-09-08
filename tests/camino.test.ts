import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El camino sugerido (`content/camino.json`).
 *
 * Lo que se comprueba aquí es lo que se rompe solo: un identificador que cambia, una
 * actividad que se borra, o —lo más probable— una nueva que se escribe y de la que nadie se
 * acuerda al tocar el camino, con lo que queda fuera del recorrido sin que nada avise.
 *
 * Y una comprobación que no es de integridad sino de principio: **que el camino no bloquea**.
 * `CLAUDE.md` §1 dice que esto es una biblioteca y no un método cerrado, así que en el
 * fichero no puede aparecer ninguna noción de requisito previo. Es fácil de añadir sin
 * pensarlo —«nivel», «desbloquea», «requiere»— y difícil de quitar después, cuando ya hay
 * contenido que lo usa.
 */

const RAIZ = join(__dirname, '..');

interface Camino {
  caminos: Array<{
    etapa: string;
    titulo: string;
    resumen: string;
    pasos: Array<{ titulo: string; idea: string; actividades: string[] }>;
  }>;
}

const camino = JSON.parse(
  readFileSync(join(RAIZ, 'content', 'camino.json'), 'utf-8'),
) as Camino;

const referencias = camino.caminos.flatMap((c) => c.pasos.flatMap((p) => p.actividades));

const enDisco = new Set(
  readdirSync(join(RAIZ, 'content', 'actividades'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length)),
);

describe('el camino', () => {
  it('solo enlaza actividades que existen', () => {
    expect(referencias.filter((id) => !enDisco.has(id))).toEqual([]);
  });

  it('no repite ninguna actividad', () => {
    const vistas = new Set<string>();
    const repetidas: string[] = [];
    for (const id of referencias) {
      if (vistas.has(id)) repetidas.push(id);
      vistas.add(id);
    }
    expect(repetidas).toEqual([]);
  });

  it('cubre todas las actividades menos las que no son un ejercicio', () => {
    // Los créditos no son una actividad: no se «hace», se lee. Cualquier otra que se quede
    // fuera del camino es un olvido, y este test es el único sitio donde se nota.
    const FUERA = new Set(['tr-04-creditos-de-donde-sale-esto']);
    const sinCamino = [...enDisco].filter((id) => !referencias.includes(id) && !FUERA.has(id));
    expect(sinCamino.sort()).toEqual([]);
  });

  it('hay un recorrido por cada etapa', () => {
    expect(camino.caminos.map((c) => c.etapa)).toEqual([
      'infantil',
      'primaria-c1',
      'primaria-c2',
      'primaria-c3',
    ]);
  });

  it('cada actividad del recorrido es de la etapa del recorrido, o una herramienta', () => {
    // Una herramienta —el piano, el metrónomo— puede aparecer en cualquier etapa: no tiene
    // nivel, tiene uso. Una actividad de 5.º en el camino de Infantil sí sería un error.
    for (const c of camino.caminos) {
      for (const id of c.pasos.flatMap((p) => p.actividades)) {
        const a = JSON.parse(
          readFileSync(join(RAIZ, 'content', 'actividades', `${id}.json`), 'utf-8'),
        ) as { etapa: string; herramienta?: boolean };
        if (a.herramienta) continue;
        expect(`${id} → ${a.etapa}`).toBe(`${id} → ${c.etapa}`);
      }
    }
  });

  it('toda actividad del camino dice cuánto dura', () => {
    /*
      La pantalla suma las duraciones de cada paso y enseña el total, porque hay pasos de
      noventa minutos que **no son una sesión, son tres** y desde la pantalla parecían uno
      más. Una actividad sin `duracion_min` no rompe nada: suma cero, y entonces el total
      miente hacia abajo, que es la peor dirección para un maestro que está planificando.
    */
    const sinDuracion: string[] = [];
    for (const id of referencias) {
      const a = JSON.parse(
        readFileSync(join(RAIZ, 'content', 'actividades', `${id}.json`), 'utf-8'),
      ) as { duracion_min?: number };
      if (!a.duracion_min) sinDuracion.push(id);
    }
    expect(sinDuracion, `sumarían cero al total de su paso:\n${sinDuracion.join('\n')}`).toEqual([]);
  });

  it('no tiene ninguna noción de requisito ni de desbloqueo', () => {
    const texto = readFileSync(join(RAIZ, 'content', 'camino.json'), 'utf-8').toLowerCase();
    // Se busca en las CLAVES, no en el texto libre: el comentario del propio fichero
    // explica justamente que no bloquea, y esa frase contiene la palabra.
    const claves = [...texto.matchAll(/"([a-zá-ú]+)":/g)].map((m) => m[1]!);
    const prohibidas = ['requiere', 'requisito', 'desbloquea', 'bloqueado', 'nivel', 'puntos'];
    expect(claves.filter((k) => prohibidas.includes(k))).toEqual([]);
  });
});
