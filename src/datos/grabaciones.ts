/**
 * Guardar las grabaciones de audio del niño, **solo en su dispositivo**.
 *
 * Esto es lo único del proyecto que guarda audio de un menor, así que conviene ser explícito
 * sobre las cuatro condiciones que pone `docs/08-LEGAL.md` y que este fichero cumple:
 *
 *  1. **Nunca se graba solo.** El `MediaRecorder` solo arranca cuando alguien pulsa el botón
 *     de grabar. No hay ningún camino que lo active por su cuenta.
 *  2. **A IndexedDB local, y a ningún sitio más.** No hay `fetch`, no hay subida, no hay
 *     servidor. La CSP de `infra/nginx.conf` lo hace cumplir aunque el código se equivocara.
 *  3. **Borrado a un clic**, y sin confirmación disuasoria: quien quiere borrar, borra.
 *  4. **`track.stop()` al terminar**, para que el indicador del navegador se apague. Un
 *     micrófono que se queda encendido después de grabar es exactamente lo que hace que
 *     nadie vuelva a fiarse.
 *
 * Se guarda una base **aparte de la del progreso** a propósito. El progreso no es dato
 * personal; una grabación de voz sí puede serlo. Tenerlas separadas hace que «borrar las
 * grabaciones» sea una operación de una línea que no puede llevarse por delante otra cosa,
 * y que se pueda ofrecer sin pensarlo dos veces.
 */

const BASE = 'cascabel-grabaciones';
const VERSION = 1;
const ALMACEN = 'grabaciones';

export interface GrabacionGuardada {
  id: string;
  actividadId: string;
  /** Momento en que se grabó, como marca de tiempo. No lleva ningún dato de quién. */
  cuando: number;
  duracionMs: number;
  /** El audio. Nunca sale de aquí. */
  audio: Blob;
}

let promesaBase: Promise<IDBDatabase | null> | null = null;

function abrir(): Promise<IDBDatabase | null> {
  if (promesaBase) return promesaBase;
  promesaBase = new Promise((resolver) => {
    let indexed: IDBFactory | undefined;
    try {
      indexed = window.indexedDB;
    } catch {
      // Algunos navegadores lanzan al SOLO LEER indexedDB si el almacenamiento está
      // bloqueado por política. Por eso el acceso va dentro del try.
      indexed = undefined;
    }
    if (!indexed) return resolver(null);

    let peticion: IDBOpenDBRequest;
    try {
      peticion = indexed.open(BASE, VERSION);
    } catch {
      return resolver(null);
    }
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id' });
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => resolver(null);
    // Modo privado de Firefox: la petición se queda colgada sin error ni éxito.
    window.setTimeout(() => resolver(null), 3000);
  });
  return promesaBase;
}

/**
 * Guarda una grabación.
 *
 * Si no hay almacenamiento **no se guarda y no pasa nada**: la grabación se puede escuchar
 * en esa misma sesión y se pierde al salir. Es preferible a bloquear la actividad, y además
 * es la opción más privada de las dos.
 */
export async function guardar(g: GrabacionGuardada): Promise<boolean> {
  const db = await abrir();
  if (!db) return false;
  return new Promise((resolver) => {
    try {
      const tx = db.transaction(ALMACEN, 'readwrite');
      tx.objectStore(ALMACEN).put(g);
      tx.oncomplete = () => resolver(true);
      tx.onerror = () => resolver(false);
    } catch {
      resolver(false);
    }
  });
}

export async function listar(actividadId?: string): Promise<GrabacionGuardada[]> {
  const db = await abrir();
  if (!db) return [];
  return new Promise((resolver) => {
    try {
      const peticion = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).getAll();
      peticion.onsuccess = () => {
        const todas = (peticion.result ?? []) as GrabacionGuardada[];
        resolver(
          (actividadId ? todas.filter((g) => g.actividadId === actividadId) : todas).sort(
            (a, b) => b.cuando - a.cuando,
          ),
        );
      };
      peticion.onerror = () => resolver([]);
    } catch {
      resolver([]);
    }
  });
}

/** Borra una grabación. A un clic y sin preguntar: quien quiere borrar, borra. */
export async function borrar(id: string): Promise<void> {
  const db = await abrir();
  if (!db) return;
  try {
    db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN).delete(id);
  } catch {
    // Si no se puede borrar, tampoco se pudo guardar. No hay nada que avisar.
  }
}

/** Borra todas. Es lo que tiene que poder hacer un adulto sin buscar nada. */
export async function borrarTodas(): Promise<void> {
  const db = await abrir();
  if (!db) return;
  try {
    db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN).clear();
  } catch {
    // Igual que arriba.
  }
}

export function reiniciarParaTests(): void {
  promesaBase = null;
}
