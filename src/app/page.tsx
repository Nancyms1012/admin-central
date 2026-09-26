'use client';

import { useState } from 'react';

export default function AdminCentral() {
  const [autenticado, setAutenticado] = useState(false);
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      // TODO: Implementar autenticación contra tabla usuarios_evento en Supabase
      // Por ahora: demo simple (usuario: admin@copa.com, contraseña: admin)
      if (email === 'admin@copa.com' && contrasena === 'admin') {
        setAutenticado(true);
        localStorage.setItem('admin_token', 'demo_token');
      } else {
        setError('Email o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = () => {
    setAutenticado(false);
    setEmail('');
    setContrasena('');
    localStorage.removeItem('admin_token');
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d2240] to-[#1a4f8b] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-[#0d2240] mb-2 text-center">Admin Central</h1>
          <p className="text-gray-600 text-center mb-6">La Copa - Panel de Control</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4f8b] focus:border-transparent"
                placeholder="admin@copa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4f8b] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#0d2240] text-white font-bold py-2 rounded-lg hover:bg-[#1a4f8b] transition-colors disabled:opacity-50"
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-6 text-center">
            Demo: admin@copa.com / admin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0d2240] text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Central</h1>
              <p className="text-gray-300">La Copa - Panel de Control</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Formulario de Inscripciones */}
          <ModuleCard
            title="Formulario"
            description="Gestión de inscripciones, admin panel, export"
            icon="📝"
            color="from-blue-500 to-blue-600"
            url="https://inscripciones.raceclubhub.com"
            status="active"
          />

          {/* Check-in App */}
          <ModuleCard
            title="Check-in"
            description="Escaneo QR, plantilla, subir dorsales"
            icon="📱"
            color="from-green-500 to-green-600"
            url="https://checkin.raceclubhub.com"
            status="active"
          />

          {/* Boxes App */}
          <ModuleCard
            title="Boxes"
            description="Parrilla de salida, SPEAKER, DNS"
            icon="📊"
            color="from-amber-500 to-amber-600"
            url="https://boxes.raceclubhub.com"
            status="active"
          />

          {/* Control de Evento */}
          <ModuleCard
            title="Control"
            description="Control de carreras XCC/XCO en vivo"
            icon="🎯"
            color="from-purple-500 to-purple-600"
            url="https://control.raceclubhub.com"
            status="active"
          />
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-[#0d2240] mb-6">Información del Sistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-[#0d2240] mb-4">📦 Módulos activos</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✅ Formulario de Inscripciones</li>
                <li>✅ Check-in QR</li>
                <li>✅ Boxes / Parrilla</li>
                <li>✅ Control de Evento (XCC/XCO)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0d2240] mb-4">🔧 Configuración</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>📊 Base de datos: Supabase (compartida)</li>
                <li>🌐 Hosting: Cloudflare Pages</li>
                <li>📧 Emails: Resend</li>
                <li>💳 Pagos: Tilopay</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>Nota:</strong> Este es el panel de control central. Desde aquí puedes acceder a todos los módulos de La Copa.
              Cada módulo tiene su propia autenticación y gestión de datos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente reutilizable para las tarjetas de módulos
function ModuleCard({
  title,
  description,
  icon,
  color,
  url,
  status,
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  url: string;
  status: 'active' | 'pending' | 'inactive';
}) {
  const statusColor = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
  }[status];

  const statusText = {
    active: 'Activo',
    pending: 'Próximamente',
    inactive: 'Inactivo',
  }[status];

  return (
    <a
      href={status === 'active' ? url : '#'}
      target={status === 'active' ? '_blank' : undefined}
      rel={status === 'active' ? 'noopener noreferrer' : undefined}
      className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
        status === 'active' ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <div className={`h-24 bg-gradient-to-r ${color} flex items-center justify-center`}>
        <span className="text-5xl">{icon}</span>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-[#0d2240]">{title}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </a>
  );
}
