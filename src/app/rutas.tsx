import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Catalogo from './Catalogo';
import { AvisoActualizacion } from './AvisoActualizacion';

/**
 * Router mínimo, deliberadamente.
 *
 * El índice es la raíz porque **la vista del maestro es el catálogo**, no una portada.
 * /diagnostico y las actividades van en carga diferida: la primera pantalla no debe
 * arrastrar el motor de actividades ni el banco de medida.
 */
const Diagnostico = lazy(() => import('./Diagnostico'));
const Actividad = lazy(() => import('./Actividad'));
const Ajustes = lazy(() => import('./Ajustes'));
const Calibracion = lazy(() => import('./Calibracion'));

export function Rutas() {
  return (
    <Suspense fallback={null}>
      <AvisoActualizacion />
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/actividad/:id" element={<Actividad />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/calibracion" element={<Calibracion />} />
        <Route path="/diagnostico" element={<Diagnostico />} />
      </Routes>
    </Suspense>
  );
}
