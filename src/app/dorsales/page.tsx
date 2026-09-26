'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Usuario {
  dorsal: string;
  nombre: string;
  equipo: string;
  categoria: string;
}

export default function DorsalesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [evento, setEvento] = useState('XCO');
  const [archivo, setArchivo] = useState<File | null>(null);

  // Descargar plantilla CSV vacía
  const descargarPlantilla = () => {
    const headers = ['dorsal', 'nombre', 'equipo', 'categoria'];
    const filas = [
      headers.join(','),
      '101,Juan Pérez,Team A,Élite Masculino',
      '102,María García,Team B,Élite Femenino',
      '103,Carlos López,Team C,Máster A',
    ];
    
    const csv = filas.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla_dorsales_${evento}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Procesar archivo CSV
  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setCargando(true);

    try {
      const texto = await file.text();
      const lineas = texto.split('\n').filter((l) => l.trim());
      const datos: Usuario[] = [];

      // Saltar encabezado
      for (let i = 1; i < lineas.length; i++) {
        const partes = lineas[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (partes.length >= 4 && partes[0]) {
          datos.push({
            dorsal: partes[0],
            nombre: partes[1] || 'Por definir',
            equipo: partes[2] || 'Por definir',
            categoria: partes[3] || 'Por definir',
          });
        }
      }

      setUsuarios(datos);
      alert(`Se cargaron ${datos.length} dorsales`);
    } catch (err) {
      alert('Error al leer el archivo: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setCargando(false);
    }
  };

  // Guardar en Supabase
  const guardarEnSupabase = async () => {
    if (usuarios.length === 0) {
      alert('No hay dorsales para guardar');
      return;
    }

    if (!evento) {
      alert('Selecciona un evento');
      return;
    }

    setGuardando(true);
    try {
      const { supabaseClient } = await import('@/lib/supabase-client');

      // Convertir a formato de usuarios_evento
      const filas = usuarios.map((u) => ({
        evento: evento,
        dorsal: u.dorsal,
        nombre: u.nombre,
        equipo: u.equipo,
        categoria: u.categoria,
      }));

      // Eliminar dorsales antiguos del evento antes de cargar nuevos
      await supabaseClient
        .from('usuarios_evento')
        .delete()
        .eq('evento', evento);

      // Insertar nuevos
      const { error } = await supabaseClient
        .from('usuarios_evento')
        .insert(filas);

      if (error) {
        alert('Error al guardar: ' + error.message);
        return;
      }

      alert(`✓ Se guardaron ${usuarios.length} dorsales para ${evento}`);
      setUsuarios([]);
      setArchivo(null);
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0d2240]">Gestión de Dorsales</h1>
            <p className="text-gray-600">Carga y asignación de dorsales por evento</p>
          </div>
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            ← Volver
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de carga */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0d2240] mb-4">Cargar dorsales</h2>

            {/* Selector de evento */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Evento</label>
              <select
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4f8b]"
              >
                <option value="XCO">XCO (Cross-Country)</option>
                <option value="XCC">XCC (Short Track)</option>
              </select>
            </div>

            {/* Área de carga */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={manejarArchivo}
                disabled={cargando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4f8b] disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-2">
                Formato: dorsal, nombre, equipo, categoría (sin encabezado en filas de datos)
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={descargarPlantilla}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
              >
                📥 Descargar plantilla
              </button>
              <button
                onClick={guardarEnSupabase}
                disabled={guardando || usuarios.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {guardando ? 'Guardando...' : `✓ Guardar ${usuarios.length} dorsales`}
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0d2240] mb-4">Resumen</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Evento</p>
                <p className="text-2xl font-bold text-[#0d2240]">{evento}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Dorsales cargados</p>
                <p className="text-2xl font-bold text-green-600">{usuarios.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-600 mt-4">
                <p className="font-semibold mb-2">📋 Instrucciones:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Descarga la plantilla</li>
                  <li>Completa dorsal, nombre, equipo, categoría</li>
                  <li>Selecciona el archivo y haz clic en "Guardar"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de preview */}
        {usuarios.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#0d2240]">Preview - Dorsales a cargar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Dorsal</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Equipo</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.slice(0, 20).map((u) => (
                    <tr key={u.dorsal} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 font-bold text-lg text-[#0d2240]">{u.dorsal}</td>
                      <td className="px-4 py-2">{u.nombre}</td>
                      <td className="px-4 py-2">{u.equipo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{u.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usuarios.length > 20 && (
                <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                  ... y {usuarios.length - 20} más
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
