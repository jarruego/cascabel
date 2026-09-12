/**
 * Iconos de actividad.
 *
 * Son **Noto Color Emoji** de Google (Apache-2.0): el autor eligió ese estilo el 2026-09-12
 * frente a Fluent, Twemoji y OpenMoji, por ese orden. **Es la norma para cualquier icono
 * nuevo**: se busca en las cuatro por ese orden y, si ninguna lo tiene, se dibuja aquí
 * (como las claves y el triángulo) o se coge de Commons con licencia CC0 (la pandereta y
 * el bombo). Nunca un icono prestado de otra cosa: un triángulo no es una campana. Se sirven desde `/iconos`, nunca desde un CDN: la regla 1 del
 * proyecto prohíbe cualquier petición fuera de nuestro origen.
 *
 * **Por qué a color y no monocromos.** La regla 3 de `docs/04-DISENO-UI.md` pide iconos
 * *concretos*: un tambor dibujado vale más que un pictograma abstracto, y ese más que la
 * palabra «ritmo». Un niño de cuatro años reconoce un elefante de colores; no reconoce una
 * silueta gris que podría ser cualquier cosa.
 *
 * **El color nunca informa solo** (regla 4). El icono siempre va acompañado de su etiqueta
 * y, cuando distingue dos opciones, las dos tienen dibujos DISTINTOS y no el mismo en dos
 * colores. Un 8 % de los niños no distinguiría la diferencia.
 *
 * Van como `<img>` y no en línea: pesan 68 KB entre los veintisiete, se cachean solos, no
 * engordan el bundle y el service worker los precachea para el modo sin conexión.
 */

interface Props {
  nombre: string;
  tamano?: number;
  /** Texto alternativo. Vacío por defecto porque el icono suele ir junto a su etiqueta:
   *  repetirlo haría que un lector de pantalla lo leyera dos veces. */
  alt?: string;
}

/** Iconos disponibles en `public/iconos`. Si se añade uno, va aquí. */
const DISPONIBLES = new Set([
  'abeja', 'altavoz', 'andando', 'arbol', 'arcoiris', 'bombilla',
  'campana', 'cantante', 'caracol', 'chispas', 'conejo',
  'delfin', 'diana', 'dino', 'elefante', 'estrella',
  'fiesta', 'fin', 'gato', 'guitarra', 'hola',
  'kalimba', 'leon', 'luna', 'lupa', 'mano',
  'mono', 'nino', 'nota-musical', 'oso', 'pajaro',
  'partitura', 'pausa', 'perro', 'pulgar', 'rana',
  'raton', 'reproducir', 'silencio', 'sol', 'tambor',
  'bombo', 'pandereta', 'claves',
  'tambor-grande', 'teclado', 'tortuga', 'trompeta', 'unicornio',
  'violin', 'voz',
  // Añadidos el 2026-09-10 para las actividades de lenguaje, historia y estilos.
  'flecha-arriba', 'flecha-abajo', 'igual', 'fuerte', 'flojo',
  'castillo', 'pluma', 'corona', 'corazon', 'radio',
  'bailarina', 'bailarin', 'palmas',
  'uno', 'dos', 'tres', 'cuatro',
  // La mariposa: el autor pidió para «flojito» un animal que no haga ruido. El gato de
  // OpenMoji de entonces tenía rayas y parecía un tigre, que es justo lo contrario.
  'mariposa',
  // Y veinticuatro más el 2026-09-10 con el banco de sonidos reales: animales de granja y
  // de bosque, vehículos, casa, tiempo, y tres instrumentos.
  'vaca', 'gallo', 'oveja', 'cerdo', 'buho',
  'puerta', 'telefono', 'reloj', 'martillo',
  'moto', 'tren', 'avion', 'helicoptero', 'ambulancia', 'barco', 'coche', 'autobus',
  'saxofon', 'acordeon', 'microfono',
  'lluvia', 'viento', 'trueno', 'olas',
  // La bicicleta y las tres zonas de la percusión corporal, el 2026-09-10.
  'bicicleta', 'chasquido', 'muslo', 'pie',
  // Instrumentos que sí son emoji y faltaban, y el triángulo dibujado aquí (2026-09-12).
  'flauta', 'maracas', 'arpa', 'trombon', 'triangulo',
  // Al repasar el contenido con la norma: el cisne, el banjo y el timbre tenían icono
  // propio y salían como pájaro, guitarra y campana.
  'cisne', 'banjo', 'timbre',
]);

/** Nombres antiguos que ya se usaban en los JSON de contenido. */
const ALIAS: Record<string, string> = {
  musica: 'nota-musical',
};

export function Icono({ nombre, tamano = 48, alt = '' }: Props) {
  const real = ALIAS[nombre] ?? nombre;

  if (!DISPONIBLES.has(real)) {
    // Nunca un hueco: un círculo se ve y se detecta en revisión. Un icono que falta en
    // silencio deja al niño sin la información que le tocaba.
    return (
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        aria-hidden={alt === '' ? true : undefined}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <circle cx="24" cy="24" r="14" />
      </svg>
    );
  }

  return (
    <img
      src={`/iconos/${real}.svg`}
      width={tamano}
      height={tamano}
      alt={alt}
      draggable={false}
      className="icono"
      /* Los iconos no aportan nada hasta que se ven, y son 27: que el navegador decida. */
      loading="lazy"
      decoding="async"
    />
  );
}

