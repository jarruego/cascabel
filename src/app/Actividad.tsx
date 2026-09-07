import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { cargarActividad } from '@/datos/cargar';
import { componenteDe } from '@/motor/registro';
import { Lienzo } from '@/ui/Lienzo';
import { anotar } from '@/datos/progreso';
import { ModalExito, ModalExplicacion } from '@/ui/ModalesActividad';
import { t } from '@/i18n';
import type { Actividad as TipoActividad, ResultadoActividad } from '@/motor/tipos';

/**
 * Ruta /actividad/:id. Carga el JSON y se lo entrega al componente del tipo que declare.
 *
 * Aquí se ve por qué el proyecto está montado así: este fichero no sabe nada de música ni
 * de pedagogía. Busca el tipo en el registro y delega. Añadir una actividad no lo toca.
 */
export default function Actividad() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  /**
   * Volver al catálogo **tal como estaba**: mismos filtros y misma posición.
   *
   * Ir a `/` a secas construía una pantalla nueva, sin filtros y desde arriba del todo. Con
   * setenta y siete actividades eso significaba volver a filtrar y a bajar cada vez que se
   * abría una, que es la forma más segura de que nadie explore nada.
   *
   * Retroceder en el historial lo arregla entero y gratis: la URL anterior ya lleva los
   * filtros —viven ahí desde hoy— y el navegador repone el scroll él solo.
   *
   * **Salvo que no haya historial.** Si se ha llegado por un enlace directo o abriendo la
   * aplicación instalada en esta actividad, `key` vale `'default'` y retroceder sacaría al
   * usuario fuera de Cascabel. Ahí sí toca ir al catálogo.
   */
  const hayHistorial = ubicacion.key !== 'default';
  const volver = () => {
    if (hayHistorial) navegar(-1);
    else navegar('/');
  };
  const [actividad, setActividad] = useState<TipoActividad | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoActividad | null>(null);
  // La explicación se muestra antes de montar la actividad: si no, empieza a sonar
  // detrás del modal y el niño oye algo que no ve.
  const [empezada, setEmpezada] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setActividad(null);
    setFallo(null);
    setResultado(null);
    setEmpezada(false);
    cargarActividad(id)
      .then((a) => vivo && setActividad(a))
      .catch((e: Error) => vivo && setFallo(e.message));
    return () => {
      vivo = false;
    };
  }, [id]);

  // Un solo botón «atrás», siempre en el mismo sitio. Regla 8 de docs/04-DISENO-UI.md:
  // las navegaciones múltiples confunden a los niños mucho más que a los adultos.
  const atras = (
    <div className="actividad__barra">
      {/* Sigue siendo un enlace y no un botón: así se puede abrir en otra pestaña, se
          copia con el botón derecho y un lector de pantalla lo anuncia como enlace. Lo que
          cambia es lo que hace al pulsarlo. */}
      <Link
        to="/"
        className="atras"
        onClick={(ev) => {
          if (!hayHistorial || ev.metaKey || ev.ctrlKey || ev.button !== 0) return;
          ev.preventDefault();
          navegar(-1);
        }}
      >
        {t('comun.atras')}
      </Link>
      {/* La ficha es para el maestro: el aula sin dispositivos es el escenario más
          probable de todos, según el dosier. */}
      <Link to={`/ficha/${id}`} className="actividad__ficha no-imprimir">
        {t('actividad.verFicha')}
      </Link>
    </div>
  );

  if (fallo) {
    return (
      <main className="actividad-marco">
        {atras}
        <p role="alert">{t('actividad.noEncontrada')}</p>
      </main>
    );
  }
  if (!actividad) {
    return (
      <main className="actividad-marco">
        {atras}
        <p>{t('catalogo.cargando')}</p>
      </main>
    );
  }

  const Componente = componenteDe(actividad.tipo);

  return (
    <main className="actividad-marco">
      {atras}
      {!empezada && <ModalExplicacion actividad={actividad} alEmpezar={() => setEmpezada(true)} />}

      <ModalExito
        abierto={Boolean(resultado)}
        resultado={resultado}
        alRepetir={() => {
          // Cambiar la clave remonta el componente desde cero: es más fiable que pedirle
          // a cada motor que sepa reiniciarse, y son seis motores distintos.
          setResultado(null);
          setIntento((n) => n + 1);
        }}
        alVolver={volver}
      />

      {/* La actividad va dentro del lienzo: es lo que le da el botón de ampliar y lo que
          permite que, al ampliarla, desaparezca todo lo que no es la actividad. */}
      {!empezada ? null : Componente ? (
        <Lienzo>
          <Componente
            key={intento}
            actividad={actividad}
            alTerminar={(r) => {
              setResultado(r);
              // Si el almacenamiento está bloqueado esto no hace nada y no pasa nada:
              // la actividad ya se ha jugado, que es lo que importa.
              void anotar(r);
            }}
          />
        </Lienzo>
      ) : (
        // No es un error del niño ni del maestro: es que ese tipo de motor aún no existe.
        // Ver docs/07-ROADMAP.md; el registro dice cuáles hay.
        <p role="status">{t('actividad.tipoPendiente')}</p>
      )}
    </main>
  );
}
