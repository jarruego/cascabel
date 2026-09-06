/**
 * Estado en la URL y códigos de verificación.
 *
 * Los dos patrones que el dosier señala como los más valiosos del campo, y los dos
 * resuelven el mismo problema: **evaluar y compartir sin cuentas, sin base de datos y sin
 * tratar un solo dato personal**.
 *
 *  - **Estado en la URL** (de Song Maker): lo que el niño ha creado se codifica en la
 *    dirección. Se comparte pegando un enlace. Coste de servidor: cero.
 *  - **Código de verificación** (de musictheory.net): al terminar sale un código corto que
 *    el niño le enseña al maestro, y el maestro lo comprueba. Evaluación con evidencia, sin
 *    cuentas de alumno.
 *
 * **Nada de esto identifica a nadie.** Un código dice «alguien completó esta actividad con
 * estos aciertos este día», no quién. El maestro sabe quién se lo ha enseñado porque lo
 * tiene delante, que es exactamente como funciona un sello en una libreta.
 */

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Alfabeto sin `I`, `O`, `0` ni `1`: los códigos los copia a mano un niño de ocho años, y
 * confundir cero con o es el error más frecuente que existe.
 */
export function alfabetoCodigos(): string {
  return ALFABETO;
}

/** Suma de comprobación de un dígito. Detecta la mayoría de erratas al teclear. */
function digitoControl(datos: string): string {
  let suma = 0;
  for (let i = 0; i < datos.length; i++) {
    // Se pondera por posición para que un intercambio de dos letras también se detecte.
    suma += (ALFABETO.indexOf(datos[i]!) + 1) * (i + 1);
  }
  return ALFABETO[suma % ALFABETO.length]!;
}

export interface DatosCodigo {
  actividadId: string;
  aciertos: number;
  intentos: number;
  /** Días desde 2026-01-01. Un día basta y no identifica a nadie. */
  dia: number;
}

/** Días desde el 1 de enero de 2026, que es el origen del proyecto. */
export function diaDeHoy(fecha = new Date()): number {
  const origen = Date.UTC(2026, 0, 1);
  return Math.floor((Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()) - origen) / 86_400_000);
}

/**
 * Genera el código. Seis caracteres más el de control.
 *
 * El identificador de actividad se resume en un número: el código no puede llevar el id
 * entero, y al maestro le basta con comprobar que el código corresponde a LA actividad que
 * mandó. Si dos actividades colisionaran, el maestro lo vería enseguida porque conoce cuál
 * mandó; no es un sistema criptográfico y no pretende serlo.
 */
export function generarCodigo(d: DatosCodigo): string {
  const hash = resumen(d.actividadId);
  const valores = [
    hash % 32,
    Math.floor(hash / 32) % 32,
    Math.min(31, d.aciertos),
    Math.min(31, d.intentos),
    d.dia % 32,
    Math.floor(d.dia / 32) % 32,
  ];
  const cuerpo = valores.map((v) => ALFABETO[v]!).join('');
  return cuerpo + digitoControl(cuerpo);
}

export interface Comprobacion {
  valido: boolean;
  /** Solo si es válido. */
  datos?: Omit<DatosCodigo, 'actividadId'> & { hashActividad: number };
  motivo?: 'formato' | 'control';
}

export function comprobarCodigo(codigo: string): Comprobacion {
  const limpio = codigo.trim().toUpperCase().replace(/[\s-]/g, '');
  if (limpio.length !== 7 || [...limpio].some((c) => !ALFABETO.includes(c))) {
    return { valido: false, motivo: 'formato' };
  }
  const cuerpo = limpio.slice(0, 6);
  if (digitoControl(cuerpo) !== limpio[6]) return { valido: false, motivo: 'control' };

  const v = [...cuerpo].map((c) => ALFABETO.indexOf(c));
  return {
    valido: true,
    datos: {
      hashActividad: v[0]! + v[1]! * 32,
      aciertos: v[2]!,
      intentos: v[3]!,
      dia: v[4]! + v[5]! * 32,
    },
  };
}

/** Resumen estable de un id de actividad, en [0, 1024). */
export function resumen(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) % 1024;
  }
  return h;
}

/**
 * Codifica el estado de una creación para meterlo en la URL.
 *
 * Base64 **url-safe**: `+` y `/` se convierten en `-` y `_`, y se quita el relleno. Sin eso,
 * la mitad de las URLs se rompen al pegarlas en WhatsApp o en un correo.
 */
export function aParametro(estado: unknown): string {
  const json = JSON.stringify(estado);
  const bytes = new TextEncoder().encode(json);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function desdeParametro<T>(parametro: string): T | null {
  try {
    const base = parametro.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base + '='.repeat((4 - (base.length % 4)) % 4));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    // Una URL manipulada o truncada no debe romper la app: se abre la actividad vacía.
    return null;
  }
}
