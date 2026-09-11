#!/usr/bin/env node
/**
 * Genera content/indice.json a partir de las actividades.
 *
 * El índice es lo único que carga la app al arrancar: pesa unos pocos KB y permite
 * filtrar por curso, eje y criterio curricular sin descargar las actividades enteras.
 * Cada actividad se carga bajo demanda.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'content/actividades';
const ficheros = (await readdir(DIR)).filter((f) => f.endsWith('.json'));

const actividades = [];
for (const f of ficheros) {
  const a = JSON.parse(await readFile(join(DIR, f), 'utf8'));
  actividades.push({
    id: a.id,
    titulo: a.titulo,
    // La descripcion viaja en el indice porque la pantalla de Instrumentos la enseña: once
    // titulos sueltos no se leen, se ojean y no se distingue uno de otro. Son unos siete
    // kilobytes en total, y el indice ya se precachea entero.
    descripcion: a.descripcion ?? '',
    etapa: a.etapa,
    eje: a.eje,
    tipo: a.tipo,
    lugar: a.lugar ?? 'pantalla',
    microfono: String(a.entrada?.modo ?? '').startsWith('microfono'),
    duracion_min: a.duracion_min ?? null,
    curriculo: a.curriculo,
    estado: a.estado ?? 'borrador',
    // Si además es un instrumento: sale en la pantalla de Instrumentos, y si tiene criterio
    // curricular sale también en el catálogo. Ser las dos cosas no es duplicar.
    herramienta: a.herramienta ?? false,
    // Lo que busca el buscador del catálogo además del título: las palabras clave de la
    // actividad y lo que declara de práctica (figuras, compás, método, notas, secuencia).
    // Pedido por el autor el 2026-09-12: «anacrusa» no encontraba la 329 porque el título
    // no lo dice. Son unos pocos bytes por actividad.
    etiquetas: a.etiquetas ?? [],
    practica: {
      figuras: a.practica?.figuras ?? [],
      compas: a.practica?.compas ?? null,
      metodo: a.practica?.metodo ?? [],
      notas: a.practica?.notas ?? [],
      secuencia: a.practica?.secuencia ?? null,
    },
  });
}

actividades.sort((a, b) => a.id.localeCompare(b.id, 'es'));

await writeFile(
  'content/indice.json',
  JSON.stringify({ generado: new Date().toISOString().slice(0, 10), total: actividades.length, actividades }, null, 2) + '\n',
);
console.log(`indice.json: ${actividades.length} actividades`);
