import { azarDe, barajado } from './seleccionEstimulos';

/**
 * Las rondas de un pentagrama que dibuja solo un puñado de sitios cada vez.
 *
 * Con dos octavas hay tres «do» y dos de cada una de las demás, así que «¿dónde va el do?»
 * tendría tres respuestas. La regla del autor (2026-09-12): **tú dibujas las notas que te
 * interesan, no las quince; nunca dibujes una nota repetida; si preguntas por una, solo
 * habrá una posibilidad de tocarla porque la has dibujado tú.**
 *
 * Así que cada ronda dibuja `porRonda` sitios sin dos del mismo nombre, y pregunta uno de
 * ellos. Cada sitio se pregunta exactamente una vez a lo largo de la actividad, en orden
 * barajado y sin dos preguntas seguidas del mismo nombre; los demás dibujados salen al azar
 * entre los que no comparten nombre con nadie de la ronda, y su orden en la pauta también
 * se baraja, para que no salgan de grave a agudo. Determinista para una semilla.
 */
export interface RondaPentagrama {
  /** Índice del sitio que se pregunta. */
  pedida: number;
  /** Índices de los sitios dibujados, en el orden en que van en la pauta. Incluye `pedida`. */
  dibujadas: number[];
}

export function rondasPentagrama(
  nombres: readonly string[],
  porRonda: number,
  semilla: number,
): RondaPentagrama[] {
  const azar = azarDe(semilla);
  const indices = nombres.map((_, i) => i);
  const repiteSeguido = (orden: number[]) =>
    orden.some((x, i) => i > 0 && nombres[x] === nombres[orden[i - 1]!]);
  let orden = barajado(indices, azar);
  for (let intento = 0; intento < 20 && repiteSeguido(orden); intento++) orden = barajado(indices, azar);

  return orden.map((pedida) => {
    const usados = new Set([nombres[pedida]!]);
    const dibujadas = [pedida];
    for (const i of barajado(indices, azar)) {
      if (dibujadas.length >= porRonda) break;
      const nombre = nombres[i]!;
      if (usados.has(nombre)) continue;
      usados.add(nombre);
      dibujadas.push(i);
    }
    return { pedida, dibujadas: barajado(dibujadas, azar) };
  });
}
