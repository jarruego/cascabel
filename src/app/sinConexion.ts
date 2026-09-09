import { APP } from '@/config';
import { pedirRespuesta } from '@/datos/cargar';
import { PERSONAJES, POSES } from '@/ui/personajes';

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

/**
 * Las poses de personaje que **no** van en el precache.
 *
 * Tres de las diez viajan en la primera descarga porque salen en cualquier actividad; las
 * otras siete se bajan al abrir la actividad que las usa. Aquí se listan para que la
 * descarga explícita de Ajustes las incluya: quien pide «usar sin conexión» quiere el juego
 * entero, no siete octavas partes.
 */
function rutasDePersonajes(): string[] {
  const rutas: string[] = [];
  for (const p of PERSONAJES) {
    for (const pose of POSES) rutas.push(`/personajes/${p}-${pose}.svg`);
  }
  return rutas;
}

/** Rutas de todo el contenido: el índice, cada actividad y su audio. */
async function rutasDeContenido(): Promise<string[]> {
  const indice = (await (await pedirRespuesta(`${APP.rutaContenido}/indice.json`)).json()) as {
    actividades: Array<{ id: string }>;
  };

  const rutas = new Set<string>([
    `${APP.rutaContenido}/indice.json`,
    `${APP.rutaContenido}/camino.json`,
    ...rutasDePersonajes(),
  ]);
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
 * Vigila si hay una versión nueva y avisa cuando la hay.
 *
 * Lo que había fallaba de dos maneras, y las dos las notó el autor en la app instalada:
 *
 *  - **No comprobaba al arrancar.** Solo escuchaba los eventos de foco y visibilidad, y
 *    una PWA que se abre ya con el foco no recibe ninguno. Podía pasar la sesión entera sin
 *    enterarse. Ahora la primera comprobación es inmediata.
 *  - **Miraba antes de tiempo.** Pedía la actualización y en la misma línea preguntaba si
 *    ya había una esperando, sin esperar a que la descarga acabara. El worker nuevo llegaba
 *    unos segundos después y no se detectaba hasta la siguiente comprobación, dos minutos y
 *    un cambio de foco más tarde. Ahora se espera a `update()`, y además se escucha
 *    `updatefound` en el propio registro, que es la señal fiable.
 *
 * Y una tercera cosa: **cada media hora** mientras la app está abierta, para el aula que la
 * deja puesta toda la mañana. Qué se hace con la versión encontrada —aplicarla en el acto o
 * avisar— lo decide `motor/actualizacion.ts`, con test.
 */
export function vigilarActualizaciones(alHaberNueva: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  let ultima = 0;
  let avisado = false;
  const avisar = () => {
    if (avisado) return;
    avisado = true;
    alHaberNueva();
  };

  const comprobar = async (forzar = false) => {
    // Como mucho una vez cada dos minutos: recuperar el foco pasa muchas veces seguidas.
    const ahora = Date.now();
    if (!forzar && (document.visibilityState !== 'visible' || ahora - ultima < 120_000)) return;
    ultima = ahora;
    const r = await navigator.serviceWorker.getRegistration();
    if (!r) return;
    try {
      await r.update();
    } catch {
      // Sin red no hay nada que actualizar, y no pasa nada.
    }
    if (r.waiting) avisar();
  };

  // El registro avisa por sí mismo cuando encuentra un worker nuevo. Se engancha en cuanto
  // haya uno activo: `ready` no resuelve antes.
  let registro: ServiceWorkerRegistration | null = null;
  const alEncontrar = () => {
    const nuevo = registro?.installing;
    if (!nuevo) return;
    nuevo.addEventListener('statechange', () => {
      // «installed» con un controlador ya en marcha es una versión nueva esperando; sin
      // controlador es la primera instalación, y ahí no hay nada que avisar.
      if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar();
    });
  };
  void navigator.serviceWorker.ready.then((r) => {
    registro = r;
    r.addEventListener('updatefound', alEncontrar);
    if (r.waiting) avisar();
  });

  void comprobar(true);
  const alFoco = () => void comprobar();
  const cadaRato = window.setInterval(() => void comprobar(true), 30 * 60_000);
  document.addEventListener('visibilitychange', alFoco);
  window.addEventListener('focus', alFoco);
  return () => {
    window.clearInterval(cadaRato);
    document.removeEventListener('visibilitychange', alFoco);
    window.removeEventListener('focus', alFoco);
    registro?.removeEventListener('updatefound', alEncontrar);
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

/**
 * Baja las poses que faltan cuando la aplicación no está haciendo nada, y solo si sale
 * gratis.
 *
 * **Por qué no se bajan todas al instalar.** Sería lo cómodo, y es lo que la regla de este
 * proyecto no permite: alguien puede abrir Cascabel en el patio con datos móviles, y el
 * juego completo de personajes es más de un megabyte. Descargar eso sin avisar en la tarifa
 * de otro no se hace.
 *
 * **Por qué tampoco se pregunta.** Preguntar por cada cosa que la aplicación quiere bajar
 * acaba en un diálogo que nadie lee. El punto medio, que es lo que hace cualquier aplicación
 * seria: bajarlo solo cuando **se sabe** que no cuesta nada —conexión rápida y sin ahorro de
 * datos— y no bajarlo en ningún otro caso. Quien esté en 2G o con el ahorro puesto no verá
 * ninguna descarga; los personajes le llegarán cuando abra la actividad que los use.
 *
 * `navigator.connection` no existe en Safari, y ahí no se prefetcha: ante la duda, no gastar
 * los datos de nadie.
 */
export function prefetchPersonajes(): void {
  const red = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (!red || red.saveData) return;
  // Se descartan las lentas en vez de permitir las rápidas: la especificación solo define
  // hasta `4g`, y una lista de permitidas dejaría fuera cualquier valor que añadan después.
  if (['slow-2g', '2g', '3g'].includes(red.effectiveType ?? '')) return;

  const pendientes = rutasDePersonajes();
  const bajar = () => {
    const ruta = pendientes.shift();
    if (!ruta) return;
    // Por `pedirRespuesta` como todo lo demás: la regla de lint que lo obliga es la que
    // sostiene la promesa de que no se pide nada a un tercero, y una excepción «solo aquí»
    // es exactamente como se pierde esa promesa. El service worker lo intercepta con su
    // regla `CacheFirst`, así que queda cacheado igual que si lo pidiera una pantalla.
    void pedirRespuesta(ruta).catch(() => {});
    programar();
  };
  const programar = () => {
    const idle = (window as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback;
    if (idle) idle(bajar);
    else window.setTimeout(bajar, 300);
  };
  programar();
}
