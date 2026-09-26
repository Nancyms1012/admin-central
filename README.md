# Admin Central - La Copa

Panel de control central para acceder y gestionar todos los módulos de La Copa.

## Funcionalidades

- **Login seguro** (autenticación contra Supabase - tabla usuarios_evento)
- **Acceso centralizado** a todos los módulos:
  - 📝 Formulario de Inscripciones
  - 📱 Check-in QR
  - 📊 Boxes / Parrilla
  - 🎯 Control de Carreras
- **Dashboard** con estado de cada módulo
- **Información del sistema** centralizada

## Módulos disponibles

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Formulario | inscripciones.raceclubhub.com | Gestión de inscripciones y admin |
| Check-in | checkin.raceclubhub.com | Escaneo QR y plantilla de dorsales |
| Boxes | boxes.raceclubhub.com | Parrilla de salida, SPEAKER, DNS |
| Control | control.raceclubhub.com | Control de carreras XCC/XCO en vivo |

## Deployment

- URL: `admin.raceclubhub.com`
- Plataforma: Cloudflare Pages
- Base de datos: Supabase (compartida)

## Setup

```bash
npm install
npm run dev
```

## Autenticación

Usa la tabla `usuarios_evento` en Supabase:
- Email + Contraseña
- Roles: `admin`, `operador`, `coordinador`

## Próximas mejoras

- [ ] Integración completa con Supabase Auth
- [ ] Gestión de usuarios desde el panel
- [ ] Logs de auditoría centralizado
- [ ] Sincronización de estado entre módulos
