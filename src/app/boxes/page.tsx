'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Box {
  id?: string;
  dorsal: string;
  nombre_archivo: string;
  categoria: string;
  box: string;
  hora_salida: string;
  orden: number;
  en_box: boolean;
  en_box_por?: string;
  en_box_fecha?: string;
  salida_final: boolean;
  salida_final_por?: string;
  salida_final_fecha?: string;
}

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filtroHora, setFiltroHora] = useState('');
  const [filtroBox, setFiltroBox] = useState('');

  // Descargar plantilla CSV
  const descargarPlantilla = () => {
    const headers = ['dorsal', 'nombre', 'categoria', 'box', 'hora_salida', 'orden'];
    const filas = [
      headers.join(','),
      '101,Juan Pérez,Élite Masculino,BOX 1,08:00,1',
      '102,María García,Élite Femenino,BOX 1,08:00,2',
      '103,Carlos López,Máster A,BOX 2,08:35,1',
    ];

    const csv = filas.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-boxes-${new Date().toISOString().split('T')[0]}.csv`;
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
      const datos: Box[] = [];

      // Saltar encabezado
      for (let i = 1; i < lineas.length; i++) {
        const partes = lineas[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (partes.length >= 6 && partes[0]) {
          datos.push({
            dorsal: partes[0],
            nombre_archivo: partes[1] || 'Por definir',
            categoria: partes[2] || 'Por definir',
            box: partes[3] || 'BOX 1',
            hora_salida: partes[4] || '08:00',
            orden: parseInt(partes[5]) || datos.length + 1,
            en_box: false,
            salida_final: false,
          });
        }
      }

      setBoxes(datos);
      alert(`Se cargaron ${datos.length} boxes`);
    } catch (err) {
      alert('Error al leer el archivo: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setCargando(false);
    }
  };

  // Guardar en Supabase
  const guardarEnSupabase = async () => {
    if (boxes.length === 0) {
      alert('No hay boxes para guardar');
      return;
    }

    setGuardando(true);
    try {
      const { supabaseClient } = await import('@/lib/supabase-client');

      // Eliminar boxes antiguos antes de cargar nuevos
      await supabaseClient.from('boxes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insertar nuevos
      const { error } = await supabaseClient.from('boxes').insert(boxes);

      if (error) {
        alert('Error al guardar: ' + error.message);
        return;
      }

      alert(`✓ Se guardaron ${boxes.length} boxes`);
      setBoxes([]);
      setArchivo(null);
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar boxes
  const boxesFiltrados = boxes.filter((b) => {
    if (filtroHora && b.hora_salida !== filtroHora) return false;
    if (filtroBox && b.box !== filtroBox) return false;
    return true;
  });

  const horasUnicas = [...new Set(boxes.map((b) => b.hora_salida))].sort();
  const boxesUnicos = [...new Set(boxes.map((b) => b.box))].sort();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0d2240]">Gestión de Boxes</h1>
            <p className="text-gray-600">Carga y control de parrilla de salida</p>
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
            <h2 className="text-lg font-bold text-[#0d2240] mb-4">Cargar parrilla de salida</h2>

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
                Formato: dorsal, nombre, categoría, box, hora_salida, orden
              </p>
            </div>

            {/* Filtros */}
            {boxes.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Filtrar por hora
                  </label>
                  <select
                    value={filtroHora}
                    onChange={(e) => setFiltroHora(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1a4f8b]"
                  >
                    <option value="">Todas</option>
                    {horasUnicas.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Filtrar por box
                  </label>
                  <select
                    value={filtroBox}
                    onChange={(e) => setFiltroBox(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1a4f8b]"
                  >
                    <option value="">Todos</option>
                    {boxesUnicos.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                disabled={guardando || boxes.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {guardando ? 'Guardando...' : `✓ Guardar ${boxes.length} boxes`}
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0d2240] mb-4">Resumen</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Boxes cargados</p>
                <p className="text-2xl font-bold text-green-600">{boxes.length}</p>
              </div>
              {boxes.length > 0 && (
                <>
                  <div>
                    <p className="text-gray-600 text-sm">Horas de salida</p>
                    <p className="text-lg font-bold text-[#0d2240]">{horasUnicas.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Boxes</p>
                    <p className="text-lg font-bold text-[#0d2240]">{boxesUnicos.length}</p>
                  </div>
                </>
              )}
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-600 mt-4">
                <p className="font-semibold mb-2">📋 Instrucciones:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Descarga la plantilla</li>
                  <li>Completa dorsal, nombre, categoría, box, hora, orden</li>
                  <li>Selecciona el archivo y guarda</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de preview */}
        {boxesFiltrados.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#0d2240]">
                Preview - Boxes a cargar ({boxesFiltrados.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Dorsal</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Box</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Hora</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Orden</th>
                  </tr>
                </thead>
                <tbody>
                  {boxesFiltrados.map((b) => (
                    <tr key={`${b.dorsal}-${b.orden}`} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 font-bold text-lg text-[#0d2240]">{b.dorsal}</td>
                      <td className="px-4 py-2">{b.nombre_archivo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{b.categoria}</td>
                      <td className="px-4 py-2 font-semibold">{b.box}</td>
                      <td className="px-4 py-2">{b.hora_salida}</td>
                      <td className="px-4 py-2 text-center">{b.orden}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
