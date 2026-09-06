import { APP } from '@/config';
import { pedirRespuesta } from '@/datos/cargar';

/**
 * Descarga explícita para usar sin conexión, y comprobación de actualizaciones.
 *
 * **Explícita a propósito.** El service worker precachea el armazón de la app, pero el
 * contenido —actividades, audio— se descarga cuando el maestro lo pide y sabiendo cuántos
 * megas son. Descargar decenas de megas sin avisar, en la tarifa de datos de alguien que
 * abrió la app en el patio, sería un abuso.
 *
 * La comprobación de actualización se hace al recuperar el foco, no cada cinco minutos: un
 * aula usa la app en ráfagas de quince minutos y no tiene sentido molestar mientras tanto.
 */

export interface EstadoDescarga {
  fase: 'inactiva' | 'descargando' | 'lista' | 'fallo';
  hechos: number;
  total: number;
  bytes: number;
}

const CACHE = 'cascabel-contenido-v1';

/** Rutas de todo el contenido: el índice, cada actividad y su audio. */
async function rutasDeContenido(): Promise<string[]> {
  const indice = (await (await pedirRespuesta(`${APP.rutaContenido}/indice.json`)).json()) as {
    actividades: Array<{ id: string }>;
  };

  const rutas = new Set<string>([`${APP.rutaContenido}/indice.json`]);
  for (const a of indice.actividades) {
    const ruta = `${APP.rutaContenido}/actividades/${a.id}.json`;
    rutas.add(ruta);
    try {
      const json = (await (await pedirRespuesta(ruta)).json()) as Record<string, unknown>;
      for (const audio of audiosDe(json)) rutas.add(`${APP.rutaAudio}/${audio}`);
    } catch {
      // Una actividad que no se puede leer no debe tumbar la descarga entera.
    }
  }
  return [...rutas];
}

/** Recorre el JSON buscando cualquier campo que apunte a un .opus. */
function audiosDe(valor: unknown): string[] {
  if (typeof valor === 'string') return valor.endsWith('.opus') ? [valor] : [];
  if (Array.isArray(valor)) return valor.flatMap(audiosDe);
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(audiosDe);
  return [];
}

/**
 * Descarga todo el contenido a la caché. Informa del avance para que la barra de progreso
 * sea real y no una animación decorativa.
 */
export async function descargarTodo(
  alAvanzar: (estado: EstadoDescarga) => void,
): Promise<EstadoDescarga> {
  let estado: EstadoDescarga = { fase: 'descargando', hechos: 0, total: 0, bytes: 0 };
  alAvanzar(estado);

  try {
    if (!('caches' in window)) {
      estado = { ...estado, fase: 'fallo' };
      alAvanzar(estado);
      return estado;
    }

    const rutas = await rutasDeContenido();
    estado = { ...estado, total: rutas.length };
    alAvanzar(estado);

    const cache = await caches.open(CACHE);
    for (const ruta of rutas) {
      try {
        const respuesta = await pedirRespuesta(ruta, true);
        if (respuesta.ok) {
          const copia = respuesta.clone();
          await cache.put(ruta, respuesta);
          estado = { ...estado, bytes: estado.bytes + (await copia.blob()).size };
        }
      } catch {
        // Un fichero que falla no cancela la descarga: mejor 19 de 20 que ninguno.
      }
      estado = { ...estado, hechos: estado.hechos + 1 };
      alAvanzar(estado);
    }

    estado = { ...estado, fase: 'lista' };
  } catch {
    estado = { ...estado, fase: 'fallo' };
  }
  alAvanzar(estado);
  return estado;
}

/** Megas ya descargados, para poder decirle al maestro cuánto ocupa. */
export async function tamanoDescargado(): Promise<number> {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(CACHE);
    const claves = await cache.keys();
    let bytes = 0;
    for (const k of claves) {
      const r = await cache.match(k);
      if (r) bytes += (await r.blob()).size;
    }
    return bytes;
  } catch {
    return 0;
  }
}

export async function borrarDescarga(): Promise<void> {
  try {
    await caches.delete(CACHE);
  } catch {
    // Si no se puede borrar, no hay nada que decirle al usuario que pueda hacer.
  }
}

/**
 * Comprueba si hay una versión nueva al recuperar el foco. Devuelve la función para
 * dejar de escuchar.
 */
export function vigilarActualizaciones(alHaberNueva: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  let ultima = 0;
  const comprobar = () => {
    // Como mucho una vez cada dos minutos: recuperar el foco pasa muchas veces seguidas.
    const ahora = Date.now();
    if (document.visibilityState !== 'visible' || ahora - ultima < 120_000) return;
    ultima = ahora;
    void navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      void r.update();
      if (r.waiting) alHaberNueva();
    });
  };

  document.addEventListener('visibilitychange', comprobar);
  window.addEventListener('focus', comprobar);
  return () => {
    document.removeEventListener('visibilitychange', comprobar);
    window.removeEventListener('focus', comprobar);
  };
}

/** Aplica la actualización que estaba esperando y recarga. */
export async function aplicarActualizacion(): Promise<void> {
  const r = await navigator.serviceWorker.getRegistration();
  if (!r?.waiting) return;
  r.waiting.postMessage({ type: 'SKIP_WAITING' });
  // El controllerchange llega cuando el nuevo service worker toma el mando.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
}
