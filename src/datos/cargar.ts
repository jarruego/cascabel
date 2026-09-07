import { APP, type Etapa } from '@/config';
import type { Actividad } from '@/motor/tipos';

/**
 * Único punto de la app que hace peticiones de red, y solo a nuestro propio origen.
 * Si alguna vez hay que salir fuera, se discute aquí y en la CSP, no en un componente.
 */
async function pedir<T>(ruta: string): Promise<T> {
  if (!ruta.startsWith('/')) {
    throw new Error(`Ruta no relativa: ${ruta}. Nada de orígenes externos.`);
  }
  const respuesta = await fetch(ruta, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  return (await respuesta.json()) as T;
}

export function cargarIndice() {
  return pedir<{ actividades: Array<Pick<Actividad, 'id' | 'titulo' | 'etapa' | 'eje' | 'tipo'>> }>(
    `${APP.rutaContenido}/indice.json`,
  );
}

/**
 * El camino sugerido: cuatro recorridos, uno por etapa.
 *
 * Va en su propio fichero y no en el índice porque **no es información de las actividades,
 * es una opinión sobre en qué orden hacerlas**. El índice dice lo que hay; esto dice por
 * dónde empezaría un maestro. Si mañana hay dos caminos distintos para la misma etapa, el
 * índice no tiene que enterarse.
 */
export function cargarCamino() {
  return pedir<{
    caminos: Array<{
      etapa: Etapa;
      titulo: string;
      resumen: string;
      pasos: Array<{ titulo: string; idea: string; actividades: string[] }>;
    }>;
  }>(`${APP.rutaContenido}/camino.json`);
}

export function cargarActividad(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Id de actividad inválido: ${id}`);
  return pedir<Actividad>(`${APP.rutaContenido}/actividades/${id}.json`);
}

/**
 * Respuesta cruda, para meterla en la Cache API sin parsear.
 *
 * Existe porque la descarga para uso sin conexión necesita el `Response` entero, no un
 * JSON ya interpretado. Pasa por aquí igualmente para que la comprobación de origen siga
 * estando en un solo sitio: la regla no es «no uses fetch», es «que nadie pueda pedir algo
 * a un tercero sin que se vea en este fichero».
 */
export async function pedirRespuesta(ruta: string, recargar = false): Promise<Response> {
  if (!ruta.startsWith('/')) {
    throw new Error(`Ruta no relativa: ${ruta}. Nada de orígenes externos.`);
  }
  return fetch(ruta, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: recargar ? 'reload' : 'default',
  });
}

/** Descarga binaria (muestras de audio, fuentes). Mismo origen, mismas reglas. */
export async function cargarBinario(ruta: string): Promise<ArrayBuffer> {
  if (!ruta.startsWith('/')) throw new Error(`Ruta no relativa: ${ruta}`);
  const respuesta = await fetch(ruta, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  return respuesta.arrayBuffer();
}
