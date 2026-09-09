/**
 * Cómo varía un ejercicio cuando se vuelve a hacer.
 *
 * «Otra vez» no repite lo mismo: la vuelta N es la variación N, determinista, y siempre
 * dentro de lo que la actividad declara —mismas figuras, mismas notas, mismo número de
 * cosas—. Por eso la ficha del maestro y el validador siguen diciendo la verdad después de
 * variar. Cada tipo tiene su forma de variar, y es una regla de producto: vive aquí y no en
 * el componente, y hay test.
 *
 * Lo que se hace, por tipo:
 *  - **tocar-a-tiempo**: el patrón se gira (la última sílaba pasa delante). Mismas figuras,
 *    otro orden: es el mismo ritmo empezando por otro sitio, que es lo que un maestro haría.
 *  - **rejilla** (dictado): las columnas de la solución se giran. Mismas notas, otra melodía.
 *  - **eleccion**: los estímulos se giran. Mismas preguntas, otro orden.
 *  - **ordenar** y **emparejar**: las fichas se reparten en otro orden de salida.
 *  - **compases**: la línea de figuras empieza por otro compás.
 *  - **karaoke**: la pieza va un poco más deprisa, hasta un tope. Es la variación de un
 *    karaoke de verdad y no cambia ni una nota.
 *  - Lo demás no varía: un musicograma es la pieza que es.
 *
 * La vuelta 0 devuelve el ejercicio tal cual: la primera vez es siempre lo escrito.
 */

export function girar<T>(lista: T[], veces: number): T[] {
  if (lista.length < 2) return lista;
  const k = ((veces % lista.length) + lista.length) % lista.length;
  return [...lista.slice(lista.length - k), ...lista.slice(0, lista.length - k)];
}

type Contenido = Record<string, unknown>;

export function variar(tipo: string, ejercicio: Contenido, vuelta: number): Contenido {
  if (vuelta <= 0) return ejercicio;
  const e = ejercicio;
  switch (tipo) {
    case 'tocar-a-tiempo': {
      const silabas = e.silabas as string[] | undefined;
      return silabas ? { ...e, silabas: girar(silabas, vuelta) } : e;
    }
    case 'rejilla': {
      const solucion = e.solucion as string[] | undefined;
      const columnas = e.columnas as number | undefined;
      if (!solucion || !columnas || e.modo === 'libre') return e;
      // Cada celda es «fila,columna»: se desplaza la columna, la fila se queda.
      const desplazada = solucion.map((celda) => {
        const [f, c] = celda.split(',').map(Number);
        return `${f},${((c ?? 0) + vuelta) % columnas}`;
      });
      return { ...e, solucion: desplazada };
    }
    case 'eleccion': {
      const estimulos = e.estimulos as unknown[] | undefined;
      return estimulos ? { ...e, estimulos: girar(estimulos, vuelta) } : e;
    }
    case 'ordenar': {
      const elementos = e.elementos as unknown[] | undefined;
      return elementos ? { ...e, elementos: girar(elementos, vuelta) } : e;
    }
    case 'emparejar': {
      const izquierda = e.izquierda as unknown[] | undefined;
      const derecha = e.derecha as unknown[] | undefined;
      return izquierda && derecha
        ? { ...e, izquierda: girar(izquierda, vuelta), derecha: girar(derecha, vuelta * 2 + 1) }
        : e;
    }
    case 'compases': {
      const duraciones = e.duraciones as number[] | undefined;
      const porCompas = e.pulsosPorCompas as number | undefined;
      if (!duraciones || !porCompas) return e;
      // Se gira por compases enteros, para que las barras sigan cayendo donde toca.
      const compases: number[][] = [];
      let acumulado: number[] = [];
      let suma = 0;
      for (const d of duraciones) {
        acumulado.push(d);
        suma += d;
        if (suma >= porCompas) {
          compases.push(acumulado);
          acumulado = [];
          suma = 0;
        }
      }
      if (acumulado.length) compases.push(acumulado);
      return { ...e, duraciones: girar(compases, vuelta).flat() };
    }
    case 'karaoke': {
      const tempo = (e.tempo as number | undefined) ?? 100;
      // Un seis por ciento por vuelta, y nunca más de un veinte: una pieza al doble de
      // velocidad ya no es la misma pieza.
      const factor = Math.min(1.2, 1 + 0.06 * vuelta);
      return { ...e, tempo: Math.round(tempo * factor) };
    }
    default:
      return e;
  }
}
