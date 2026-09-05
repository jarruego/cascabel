import { APP } from '@/config';
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

export function cargarActividad(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Id de actividad inválido: ${id}`);
  return pedir<Actividad>(`${APP.rutaContenido}/actividades/${id}.json`);
}
