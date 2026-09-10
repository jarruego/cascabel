import type { ResultadoActividad } from '@/motor/tipos';

/**
 * Progreso local, en IndexedDB.
 *
 * **IndexedDB y no localStorage**, por dos motivos: localStorage es síncrono —bloquea el
 * hilo mientras el niño toca— y se llena rápido, con un límite de unos 5 MB por origen que
 * además cuenta como texto UTF-16.
 *
 * **CERO DATOS PERSONALES.** Aquí no hay nombre, ni edad, ni curso nominal, ni
 * identificador de dispositivo. Solo qué actividades se han completado y cuántos intentos
 * costó. Nada de esto identifica a nadie, y por eso este fichero no necesita consentimiento
 * ni informar a nadie. Si alguna vez alguien quiere añadir un campo, la pregunta que hay
 * que hacerse es: ¿esto seguiría siendo verdad? Ver docs/08-LEGAL.md.
 *
 * **Funciona si el almacenamiento está bloqueado.** En modo privado, con las cookies
 * desactivadas o en un iOS que decida borrar el origen, `abrir()` devuelve null y toda la
 * capa degrada a memoria. La actividad se juega igual; lo único que se pierde es recordar
 * que se jugó. Nunca una pantalla de error por esto.
 */

const BASE = 'cascabel';
const VERSION = 1;
const ALMACEN = 'progreso';

export interface RegistroProgreso {
  actividadId: string;
  /** Marca de tiempo redondeada al día: saber QUÉ día se hizo algo no aporta nada
   *  pedagógico y sí acerca el dato a ser identificativo. */
  dia: string;
  veces: number;
  mejorIntentos?: number;
  completada: boolean;
}

let promesaBase: Promise<IDBDatabase | null> | null = null;
/** Respaldo en memoria cuando no hay almacenamiento. Se pierde al recargar, y está bien. */
const enMemoria = new Map<string, RegistroProgreso>();

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
        db.createObjectStore(ALMACEN, { keyPath: 'actividadId' });
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => resolver(null);
    // Modo privado de Firefox: la petición se queda colgada sin error ni éxito.
    window.setTimeout(() => resolver(null), 3000);
  });

  return promesaBase;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

async function conAlmacen<T>(
  modo: IDBTransactionMode,
  fn: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await abrir();
  if (!db) return null;
  return new Promise((resolver) => {
    try {
      const tx = db.transaction(ALMACEN, modo);
      const peticion = fn(tx.objectStore(ALMACEN));
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => resolver(null);
      tx.onabort = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
}

export async function anotar(resultado: ResultadoActividad): Promise<void> {
  const previo = await leer(resultado.actividadId);
  const registro: RegistroProgreso = {
    actividadId: resultado.actividadId,
    dia: hoy(),
    veces: (previo?.veces ?? 0) + 1,
    completada: previo?.completada || resultado.completada,
    mejorIntentos:
      resultado.intentos === undefined
        ? previo?.mejorIntentos
        : Math.min(previo?.mejorIntentos ?? Infinity, resultado.intentos),
  };
  enMemoria.set(registro.actividadId, registro);
  await conAlmacen('readwrite', (a) => a.put(registro) as IDBRequest<IDBValidKey>);
}

/**
 * Quita la marca de hecha a una actividad. Lo pidió el autor el 2026-09-10: el tic verde
 * de la tarjeta se puede pulsar y, tras confirmar, la actividad vuelve a salir como no
 * hecha. Lo demás —cuántas veces se abrió, el mejor intento— se queda: es orientación
 * para el maestro, y desmarcar no es borrar.
 */
export async function desmarcar(actividadId: string): Promise<void> {
  const previo = await leer(actividadId);
  if (!previo) return;
  const registro: RegistroProgreso = { ...previo, completada: false };
  enMemoria.set(registro.actividadId, registro);
  await conAlmacen('readwrite', (a) => a.put(registro) as IDBRequest<IDBValidKey>);
}

export async function leer(actividadId: string): Promise<RegistroProgreso | null> {
  const guardado = await conAlmacen<RegistroProgreso>('readonly', (a) => a.get(actividadId));
  return guardado ?? enMemoria.get(actividadId) ?? null;
}

export async function leerTodo(): Promise<RegistroProgreso[]> {
  const guardado = await conAlmacen<RegistroProgreso[]>('readonly', (a) => a.getAll());
  return guardado ?? [...enMemoria.values()];
}

/**
 * Borrado total. Va en la pantalla de ajustes y tiene que ser fácil de encontrar: es lo
 * que permite decirle a una familia «puedes borrarlo todo tú, ahora, sin pedírnoslo».
 */
export async function borrarTodo(): Promise<void> {
  enMemoria.clear();
  await conAlmacen('readwrite', (a) => a.clear());
}

/** Solo para tests: olvida la conexión cacheada. */
export function reiniciarParaTests(): void {
  promesaBase = null;
  enMemoria.clear();
}
