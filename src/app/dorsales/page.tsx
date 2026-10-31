'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FilaCSV {
  cedula: string;
  dorsal: string;
  nombre: string;
  equipo: string;
  categoria: string;
}

interface Resultado {
  asignados: number;
  noEncontrados: string[];
  filasInvalidas: number;
  total: number;
}

export default function DorsalesPage() {
  const [filas, setFilas] = useState<FilaCSV[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // Ingreso manual de un dorsal
  const [manCedula, setManCedula] = useState('');
  const [manDorsal, setManDorsal] = useState('');
  const [manCategorias, setManCategorias] = useState<string[]>([]); // categorías que tiene esa cédula
  const [manCategoriaSel, setManCategoriaSel] = useState('');
  const [manInfo, setManInfo] = useState<string | null>(null);
  const [manGuardando, setManGuardando] = useState(false);

  // Descargar plantilla CSV (separador ; porque Excel en CR usa punto y coma)
  const descargarPlantilla = () => {
    const filasCsv = [
      'cedula;dorsal;nombre;equipo;categoria',
      '210130539;101;Nombre Apellido;Equipo de ejemplo;Infantil Masculino',
      '148400585008;102;Otro Nombre;Otro Equipo;Élite Femenino',
    ];
    const csv = filasCsv.join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_dorsales.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Lee el archivo respetando su codificación. Excel en Windows suele guardar
  // en Windows-1252 (Latin-1); si lo leemos como UTF-8 los acentos/ñ salen como "�".
  // Estrategia: leer bytes, intentar UTF-8 estricto; si falla, decodificar Windows-1252.
  const leerArchivoTexto = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // 1) Intentar UTF-8 estricto (lanza error si hay bytes inválidos)
    try {
      const txt = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt;
    } catch {
      // 2) No era UTF-8 válido -> tratarlo como Windows-1252 (Excel de Windows)
      const txt = new TextDecoder('windows-1252').decode(bytes);
      return txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt;
    }
  };

  // Parsea una línea CSV respetando comillas. Acepta separador ; o ,
  const parsearLinea = (linea: string, sep: string): string[] => {
    const campos: string[] = [];
    let actual = '';
    let entreComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (entreComillas && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else {
          entreComillas = !entreComillas;
        }
      } else if (c === sep && !entreComillas) {
        campos.push(actual);
        actual = '';
      } else {
        actual += c;
      }
    }
    campos.push(actual);
    return campos.map((s) => s.trim());
  };

  // Procesar archivo CSV (solo lee y muestra preview; no guarda todavía)
  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a subir el mismo archivo
    if (!file) return;

    setArchivo(file.name);
    setCargando(true);
    setResultado(null);

    try {
      // Leer con la codificación correcta (UTF-8 o Windows-1252 de Excel)
      const texto = await leerArchivoTexto(file);

      const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lineas.length === 0) {
        alert('El archivo está vacío.');
        setFilas([]);
        return;
      }

      // Detectar separador: el que más aparezca en la primera línea (; o ,)
      const primera = lineas[0];
      const sep = (primera.split(';').length - 1) >= (primera.split(',').length - 1) ? ';' : ',';

      // Detectar encabezado
      const primeraMin = primera.toLowerCase();
      const hayEncabezado =
        primeraMin.includes('cedula') ||
        primeraMin.includes('cédula') ||
        primeraMin.includes('dorsal') ||
        primeraMin.includes('identificacion');
      const filasDatos = hayEncabezado ? lineas.slice(1) : lineas;

      const datos: FilaCSV[] = [];
      for (const linea of filasDatos) {
        const cols = parsearLinea(linea, sep);
        const cedula = (cols[0] || '').replace(/\s+/g, '');
        const dorsal = (cols[1] || '').trim();
        if (!cedula || !dorsal) continue;
        datos.push({
          cedula,
          dorsal,
          nombre: cols[2] || '',
          equipo: cols[3] || '',
          categoria: cols[4] || '',
        });
      }

      setFilas(datos);
      if (datos.length === 0) {
        alert('No se encontraron filas válidas. Se esperan columnas: cédula ; dorsal ; nombre ; equipo ; categoría');
      }
    } catch (err) {
      alert('Error al leer el archivo: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setCargando(false);
    }
  };

  // Guardar: match por cédula contra la tabla `inscripciones` (la que lee el Control)
  const guardarEnSupabase = async () => {
    if (filas.length === 0) {
      alert('No hay dorsales para guardar');
      return;
    }

    setGuardando(true);
    setResultado(null);
    try {
      const { supabaseClient } = await import('@/lib/supabase-client');

      // Traer cédula + categoría de todas las inscripciones.
      // Una persona puede tener VARIAS filas (ej. Máster + Cyclocross con la misma cédula);
      // por eso, cuando hay varias, el dorsal se asigna a la que coincida con la CATEGORÍA del CSV.
      const { data: existentes, error: errExist } = await supabaseClient
        .from('inscripciones')
        .select('numero_identificacion, categoria');
      if (errExist) {
        alert('Error consultando inscripciones: ' + errExist.message);
        return;
      }
      // cédula -> lista de categorías que tiene esa cédula
      const porCedula = new Map<string, string[]>();
      (existentes || []).forEach((r: { numero_identificacion: string; categoria: string }) => {
        const c = (r.numero_identificacion || '').replace(/\s+/g, '');
        if (!porCedula.has(c)) porCedula.set(c, []);
        porCedula.get(c)!.push(r.categoria || '');
      });

      const norm = (s: string) => s.trim().toLowerCase();

      let asignados = 0;
      const noEncontrados: string[] = [];

      for (const { cedula, dorsal, categoria } of filas) {
        const cats = porCedula.get(cedula);
        if (!cats) {
          noEncontrados.push(cedula);
          continue;
        }

        const tieneVarias = cats.length > 1;
        let query = supabaseClient.from('inscripciones').update({ dorsal }).eq('numero_identificacion', cedula);

        if (tieneVarias) {
          // Hay varias inscripciones con esta cédula -> hace falta la categoría del CSV para no pisar
          const catCsv = (categoria || '').trim();
          const coincide = cats.some((c) => norm(c) === norm(catCsv));
          if (!catCsv || !coincide) {
            noEncontrados.push(`${cedula} (tiene varias categorías; la del CSV "${catCsv || '—'}" no coincide)`);
            continue;
          }
          query = query.eq('categoria', catCsv);
        }

        const { error: errUpd } = await query;
        if (errUpd) {
          noEncontrados.push(cedula + ' (error al guardar)');
        } else {
          asignados++;
        }
      }

      setResultado({
        asignados,
        noEncontrados,
        filasInvalidas: 0,
        total: filas.length,
      });
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  // Buscar las inscripciones de una cédula (para el ingreso manual)
  const buscarCedulaManual = async () => {
    const ced = manCedula.replace(/\s+/g, '');
    setManInfo(null);
    setManCategorias([]);
    setManCategoriaSel('');
    if (!ced) return;
    try {
      const { supabaseClient } = await import('@/lib/supabase-client');
      const { data, error } = await supabaseClient
        .from('inscripciones')
        .select('nombre, primer_apellido, categoria')
        .eq('numero_identificacion', ced);
      if (error) throw error;
      if (!data || data.length === 0) {
        setManInfo(`⚠️ No se encontró ninguna inscripción con la cédula ${ced}.`);
        return;
      }
      const cats = data.map((r: { categoria: string }) => r.categoria);
      setManCategorias(cats);
      const nom = `${data[0].nombre} ${data[0].primer_apellido}`.trim();
      if (cats.length === 1) {
        setManCategoriaSel(cats[0]);
        setManInfo(`✓ ${nom} · ${cats[0]}`);
      } else {
        setManInfo(`${nom} tiene ${cats.length} inscripciones. Elegí la categoría.`);
      }
    } catch (err) {
      setManInfo('Error buscando la cédula: ' + (err instanceof Error ? err.message : 'desconocido'));
    }
  };

  // Guardar manualmente un dorsal para una cédula (y categoría si tiene varias)
  const guardarDorsalManual = async () => {
    const ced = manCedula.replace(/\s+/g, '');
    const dor = manDorsal.trim();
    if (!ced || !dor) {
      alert('Ingresá cédula y dorsal');
      return;
    }
    if (manCategorias.length === 0) {
      alert('Primero buscá la cédula (botón Buscar)');
      return;
    }
    if (manCategorias.length > 1 && !manCategoriaSel) {
      alert('Esta persona tiene varias inscripciones: elegí la categoría');
      return;
    }
    setManGuardando(true);
    try {
      const { supabaseClient } = await import('@/lib/supabase-client');
      let query = supabaseClient.from('inscripciones').update({ dorsal: dor }).eq('numero_identificacion', ced);
      if (manCategorias.length > 1) {
        query = query.eq('categoria', manCategoriaSel);
      }
      const { error } = await query;
      if (error) throw error;
      setManInfo(`✅ Dorsal ${dor} asignado a ${ced}${manCategorias.length > 1 ? ' · ' + manCategoriaSel : ''}.`);
      setManCedula('');
      setManDorsal('');
      setManCategorias([]);
      setManCategoriaSel('');
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'desconocido'));
    } finally {
      setManGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0d2240]">Gestión de Dorsales</h1>
            <p className="text-gray-600">Asignación de dorsales por cédula (tabla de inscripciones)</p>
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

            {/* Área de carga */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={manejarArchivo}
                disabled={cargando || guardando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4f8b] disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-2">
                Columnas: <strong>cédula ; dorsal ; nombre ; equipo ; categoría</strong>.
                El match se hace por cédula. Acepta separador <strong>;</strong> o <strong>,</strong>.
              </p>
              {archivo && (
                <p className="text-xs text-gray-600 mt-1">Archivo: {archivo}</p>
              )}
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
                disabled={guardando || cargando || filas.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {guardando ? 'Guardando...' : `✓ Guardar ${filas.length} dorsales`}
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0d2240] mb-4">Resumen</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Dorsales en el archivo</p>
                <p className="text-2xl font-bold text-green-600">{filas.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-600 mt-4">
                <p className="font-semibold mb-2">📋 Instrucciones:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Descarga la plantilla</li>
                  <li>Completa cédula, dorsal, nombre, equipo, categoría</li>
                  <li>Selecciona el archivo y revisa el preview</li>
                  <li>Haz clic en &quot;Guardar&quot;</li>
                </ol>
                <p className="mt-2">El dorsal se asigna a la inscripción con esa cédula.</p>
              </div>

              {/* Ingreso manual de un dorsal */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="font-semibold text-[#0d2240] text-sm mb-2">➕ Agregar dorsal manual</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manCedula}
                      onChange={(e) => setManCedula(e.target.value)}
                      placeholder="Cédula"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={buscarCedulaManual}
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm whitespace-nowrap"
                    >
                      Buscar
                    </button>
                  </div>
                  {manInfo && (
                    <p className={`text-xs rounded-lg p-2 ${manInfo.startsWith('⚠️') || manInfo.startsWith('Error') ? 'bg-amber-50 text-amber-800' : manInfo.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                      {manInfo}
                    </p>
                  )}
                  {manCategorias.length > 1 && (
                    <select
                      value={manCategoriaSel}
                      onChange={(e) => setManCategoriaSel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Elegí la categoría...</option>
                      {manCategorias.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={manDorsal}
                    onChange={(e) => setManDorsal(e.target.value)}
                    placeholder="Dorsal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={guardarDorsalManual}
                    disabled={manGuardando || manCategorias.length === 0}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {manGuardando ? 'Guardando...' : '✓ Asignar dorsal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resultado de guardado */}
        {resultado && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-amber-500 text-white px-6 py-4">
              <h2 className="font-bold text-lg">Resultado de la carga</h2>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{resultado.asignados}</p>
                  <p className="text-gray-600 text-xs">Dorsales asignados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-700">{resultado.noEncontrados.length}</p>
                  <p className="text-gray-600 text-xs">Cédulas sin match</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-700">{resultado.total}</p>
                  <p className="text-gray-600 text-xs">Filas procesadas</p>
                </div>
              </div>
              {resultado.noEncontrados.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700 mb-1">
                    Cédulas que NO se encontraron en inscripciones:
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="list-disc list-inside text-red-800 space-y-0.5">
                      {resultado.noEncontrados.map((c, i) => (
                        <li key={i} className="font-mono text-xs">{c}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Revisá que la cédula esté escrita igual que en la inscripción. Esos dorsales no se asignaron.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabla de preview */}
        {filas.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#0d2240]">Preview - Dorsales a cargar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Cédula</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Dorsal</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Equipo</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 20).map((u, idx) => (
                    <tr key={`${u.cedula}-${idx}`} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{u.cedula}</td>
                      <td className="px-4 py-2 font-bold text-lg text-[#0d2240]">{u.dorsal}</td>
                      <td className="px-4 py-2">{u.nombre}</td>
                      <td className="px-4 py-2">{u.equipo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{u.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filas.length > 20 && (
                <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                  ... y {filas.length - 20} más
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
